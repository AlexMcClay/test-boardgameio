// XState v5 game machine — the single orchestration layer for a match.
//
// The same machine runs in two hosts:
//   - on the backend, one actor per online PvP match (authoritative)
//   - in the browser, one actor for single-player vs the MCTS bot
//
// Moves resolve ATOMICALLY: one event in, one new { G, ctx } out. Animation
// staggering is a client-side concern — clients replay G.gameEvents (ordered,
// seq-numbered, snapshot-carrying) against a visual state buffer at their own
// pace. Do not add delays inside this machine; it must stay synchronously
// steppable so the MCTS bot can simulate with it (via engine.applyMove).

import { assign, setup } from "xstate";
import {
  applyMove,
  createInitialState,
  finalizeVictory,
  finishTurnAdvance,
  type MoveName,
} from "./engine.js";
import {
  hasPendingDeaths,
  resolveDeathWave,
  hasPendingAutoBattlecry,
  hasPendingTriggers,
  resolveNextTrigger,
  resolvePendingAutoBattlecry,
  type GameSetupData,
} from "./index.js";
import type { GameCtx, GameState, PlayerID, TargetValue } from "./types";

export interface GameMachineInput {
  setupData: GameSetupData;
}

export interface GameMachineContext {
  G: GameState;
  ctx: GameCtx;
}

export type GameMachineEvent =
  | {
      type: "PLACE_CARD";
      playerID: PlayerID;
      cardId: string;
      target?: TargetValue;
      boardIndex?: number;
    }
  | {
      type: "MINION_ATTACK";
      playerID: PlayerID;
      attackerId: string;
      target: TargetValue;
    }
  | { type: "HERO_ATTACK"; playerID: PlayerID; target: TargetValue }
  | { type: "HERO_POWER"; playerID: PlayerID; target?: TargetValue }
  | {
      type: "RESOLVE_BATTLECRY";
      playerID: PlayerID;
      cardId: string;
      target: TargetValue;
    }
  | { type: "CANCEL_BATTLECRY"; playerID: PlayerID }
  | { type: "DRAW_CARD"; playerID: PlayerID }
  | { type: "END_TURN"; playerID: PlayerID }
  | {
      type: "MULLIGAN_CONFIRM";
      playerID: PlayerID;
      replaceCardIds: string[];
    };

/** Maps a machine event to the engine's move dispatch format. */
export function moveEventToCommand(event: GameMachineEvent): {
  move: MoveName;
  args: unknown[];
} {
  switch (event.type) {
    case "PLACE_CARD":
      return {
        move: "placeCard",
        args: [event.cardId, event.target, event.boardIndex],
      };
    case "MINION_ATTACK":
      return { move: "minionAttack", args: [event.attackerId, event.target] };
    case "HERO_ATTACK":
      return { move: "heroAttack", args: [event.target] };
    case "HERO_POWER":
      return { move: "useHeroPower", args: [event.target] };
    case "RESOLVE_BATTLECRY":
      return {
        move: "resolveBattlecry",
        args: [event.cardId, event.target],
      };
    case "CANCEL_BATTLECRY":
      return { move: "cancelBattlecry", args: [] };
    case "DRAW_CARD":
      return { move: "drawCard", args: [] };
    case "END_TURN":
      return { move: "endTurn", args: [] };
    case "MULLIGAN_CONFIRM":
      return { move: "mulliganConfirm", args: [event.replaceCardIds] };
  }
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
    input: {} as GameMachineInput,
  },
  actions: {
    applyMoveEvent: assign(({ context, event }) => {
      // Clone so every applied move yields a fresh context reference —
      // subscribers (React, the server sync loop) diff by identity.
      const next = {
        G: structuredClone(context.G),
        ctx: { ...context.ctx },
      };
      const { move, args } = moveEventToCommand(event);
      // settle: false — moves leave pending battlecries/corpses in place;
      // the resolvingBattlecry / resolvingDeaths states below step through
      // them so each resolution step is its own snapshot.
      const result = applyMove(next, move, args, event.playerID, {
        settle: false,
      });
      if (!result.ok) {
        console.warn(`Move rejected: ${event.type} — ${result.error}`);
        return {};
      }
      return next;
    }),
    // ONE death wave: deathrattles fire, corpses sweep, chain deaths stay
    // pending for the next wave. A wave can kill a hero → finalizeVictory.
    resolveDeathWaveAction: assign(({ context }) => {
      const next = {
        G: structuredClone(context.G),
        ctx: { ...context.ctx },
      };
      resolveDeathWave(next.G, next.ctx);
      finalizeVictory(next);
      return next;
    }),
    // The placed minion's automatic (non-targeted) battlecry, resolved with
    // the minion on board. Can kill a hero (Flame Imp) → finalizeVictory.
    resolveAutoBattlecryAction: assign(({ context }) => {
      const next = {
        G: structuredClone(context.G),
        ctx: { ...context.ctx },
      };
      resolvePendingAutoBattlecry(next.G, next.ctx);
      finalizeVictory(next);
      return next;
    }),
    // ONE queued trigger reaction. Deliberately one per macrostep so every
    // "whenever…" firing becomes its own snapshot — the client sees each
    // minion react in turn instead of a single collapsed board update.
    resolveTriggerAction: assign(({ context }) => {
      const next = {
        G: structuredClone(context.G),
        ctx: { ...context.ctx },
      };
      resolveNextTrigger(next.G, next.ctx);
      finalizeVictory(next);
      return next;
    }),
    // Hands the turn over, once end-of-turn triggers and their deaths are done.
    finishTurnAdvanceAction: assign(({ context }) => {
      const next = {
        G: structuredClone(context.G),
        ctx: { ...context.ctx },
      };
      finishTurnAdvance(next);
      finalizeVictory(next);
      return next;
    }),
  },
  guards: {
    hasPendingBattlecry: ({ context }) => !!context.G.activeBattlecryMinion,
    noPendingBattlecry: ({ context }) => !context.G.activeBattlecryMinion,
    hasPendingDeaths: ({ context }) => hasPendingDeaths(context.G),
    noPendingDeaths: ({ context }) => !hasPendingDeaths(context.G),
    deathsClearNoBattlecry: ({ context }) =>
      !hasPendingDeaths(context.G) && !context.G.activeBattlecryMinion,
    deathsClearBattlecryPending: ({ context }) =>
      !hasPendingDeaths(context.G) && !!context.G.activeBattlecryMinion,
    hasPendingAutoBattlecry: ({ context }) =>
      hasPendingAutoBattlecry(context.G),
    autoBattlecryDoneDeathsPending: ({ context }) =>
      !hasPendingAutoBattlecry(context.G) && hasPendingDeaths(context.G),
    autoBattlecryDoneClear: ({ context }) =>
      !hasPendingAutoBattlecry(context.G) && !hasPendingDeaths(context.G),
    // Queued reactions wait while a targeted battlecry is on the player: the
    // battlecry resolves first (Hearthstone order), and the board shouldn't
    // churn under them while they're aiming.
    hasPendingTriggers: ({ context }) =>
      hasPendingTriggers(context.G) && !context.G.activeBattlecryMinion,
    noPendingTriggersLeft: ({ context }) => !hasPendingTriggers(context.G),
    // INVARIANT: a resolution state may only leave via `always` once its OWN
    // work is finished. These two exits are entered from resolvingDeaths /
    // resolvingBattlecry, so they each re-assert that state's own condition —
    // a bare hasPendingTriggers there let the state abandon its queue, and
    // resolvingTriggers routed straight back on hasPendingDeaths, producing an
    // infinite always-loop that exhausted the heap.
    deathsClearTriggersPending: ({ context }) =>
      !hasPendingDeaths(context.G) &&
      hasPendingTriggers(context.G) &&
      !context.G.activeBattlecryMinion,
    autoBattlecryDoneTriggersPending: ({ context }) =>
      !hasPendingAutoBattlecry(context.G) &&
      !hasPendingDeaths(context.G) &&
      hasPendingTriggers(context.G) &&
      !context.G.activeBattlecryMinion,
    // The turn only hands over once everything this turn queued has resolved.
    readyToAdvanceTurn: ({ context }) =>
      !!context.G.pendingTurnAdvance &&
      !hasPendingDeaths(context.G) &&
      !hasPendingTriggers(context.G) &&
      !hasPendingAutoBattlecry(context.G) &&
      !context.G.activeBattlecryMinion,
    isGameOver: ({ context }) => !!context.ctx.gameover,
    mulliganComplete: ({ context }) => !context.G.mulligan?.active,
  },
}).createMachine({
  id: "hearthstone",
  context: ({ input }) => createInitialState(input.setupData),
  initial: "mulligan",
  states: {
    // Pre-game phase: coin toss already happened at setup; both seats pick
    // their starting hands simultaneously. No game moves are handled until
    // both confirm — the phase gate is structural, not validated per-move.
    mulligan: {
      on: {
        MULLIGAN_CONFIRM: { actions: "applyMoveEvent" },
      },
      // confirmMulligan flips mulligan.active off after the second confirm
      // (and runs beginTurn); playing.idle's always-routes then handle any
      // pending deaths from turn start.
      always: { target: "playing", guard: "mulliganComplete" },
    },
    playing: {
      always: { target: "finished", guard: "isGameOver" },
      initial: "idle",
      states: {
        // Resolution priority, shared by every state that can leave work
        // behind: battlecry → deaths → battlecry targeting → queued triggers →
        // turn hand-off → idle. Deaths outrank triggers so the board is clean
        // between reactions; targeting outranks triggers so the player isn't
        // watching the board move while they aim.
        idle: {
          always: [
            // A just-placed minion's automatic battlecry resolves first
            // (correct play order: battlecry, then any death sweeps).
            { target: "resolvingBattlecry", guard: "hasPendingAutoBattlecry" },
            // Deaths outrank battlecry targeting: a move (or turn switch)
            // that left corpses must resolve them before anything else.
            { target: "resolvingDeaths", guard: "hasPendingDeaths" },
            {
              target: "awaitingBattlecryTarget",
              guard: "hasPendingBattlecry",
            },
            { target: "resolvingTriggers", guard: "hasPendingTriggers" },
            { target: "advancingTurn", guard: "readyToAdvanceTurn" },
          ],
          on: {
            PLACE_CARD: { actions: "applyMoveEvent" },
            MINION_ATTACK: { actions: "applyMoveEvent" },
            HERO_ATTACK: { actions: "applyMoveEvent" },
            HERO_POWER: { actions: "applyMoveEvent" },
            DRAW_CARD: { actions: "applyMoveEvent" },
            END_TURN: { actions: "applyMoveEvent" },
          },
        },
        awaitingBattlecryTarget: {
          always: [
            { target: "resolvingBattlecry", guard: "hasPendingAutoBattlecry" },
            // Battlecry effects (RESOLVE_BATTLECRY) can kill minions too
            { target: "resolvingDeaths", guard: "hasPendingDeaths" },
            { target: "resolvingTriggers", guard: "hasPendingTriggers" },
            { target: "idle", guard: "noPendingBattlecry" },
          ],
          on: {
            RESOLVE_BATTLECRY: { actions: "applyMoveEvent" },
            CANCEL_BATTLECRY: { actions: "applyMoveEvent" },
            // Ending the turn with an unresolved battlecry was allowed under
            // boardgame.io (endTurn clears activeBattlecryMinion); keep parity.
            END_TURN: { actions: "applyMoveEvent" },
          },
        },
        // Resolves a just-placed minion's automatic (non-targeted) battlecry
        // as its own macrostep: snapshot 1 shows the minion placed with the
        // battlecry still pending; the 0ms delayed transition then executes
        // the effects as snapshot 2. No move events handled while resolving.
        resolvingBattlecry: {
          always: [
            {
              target: "resolvingDeaths",
              guard: "autoBattlecryDoneDeathsPending",
            },
            // Same rule: only once the battlecry itself has resolved, or the
            // minion's own Battlecry gets skipped in favour of reactions to it.
            {
              target: "resolvingTriggers",
              guard: "autoBattlecryDoneTriggersPending",
            },
            { target: "idle", guard: "autoBattlecryDoneClear" },
          ],
          after: {
            0: {
              guard: "hasPendingAutoBattlecry",
              actions: "resolveAutoBattlecryAction",
              // reenter re-arms the timer; the always-routes above exit in
              // the same macrostep once the battlecry has resolved.
              target: "resolvingBattlecry",
              reenter: true,
            },
          },
        },
        // Steps a deathrattle chain one wave at a time. No move events are
        // handled here — the machine itself enforces "no acting while the
        // board resolves". Each wave fires via a 0ms delayed transition, so
        // it's a separate MACROSTEP → its own snapshot / game_sync (always-
        // transitions alone would collapse the whole chain into one update).
        resolvingDeaths: {
          always: [
            {
              target: "awaitingBattlecryTarget",
              guard: "deathsClearBattlecryPending",
            },
            // Deathrattles queue reactions (Cult Master draws off a death);
            // they resolve once the wave chain is FULLY swept — the guard has
            // to re-assert that, or this state hands control to
            // resolvingTriggers mid-sweep and gets thrown straight back.
            { target: "resolvingTriggers", guard: "deathsClearTriggersPending" },
            { target: "advancingTurn", guard: "readyToAdvanceTurn" },
            { target: "idle", guard: "deathsClearNoBattlecry" },
          ],
          after: {
            0: {
              guard: "hasPendingDeaths",
              actions: "resolveDeathWaveAction",
              // reenter re-arms the delay timer → the next wave (if the
              // rattles killed more minions) runs as the next macrostep.
              target: "resolvingDeaths",
              reenter: true,
            },
          },
        },
        // Drains queued "whenever…" reactions ONE AT A TIME. Each 0ms delayed
        // transition is its own macrostep, so every trigger firing produces a
        // separate snapshot / game_sync — the player watches each minion react
        // in sequence rather than seeing one collapsed board update.
        //
        // Deaths take priority on the way out: a trigger that kills something
        // gets swept before the next reaction fires.
        resolvingTriggers: {
          always: [
            { target: "resolvingDeaths", guard: "hasPendingDeaths" },
            { target: "advancingTurn", guard: "readyToAdvanceTurn" },
            {
              target: "awaitingBattlecryTarget",
              guard: "hasPendingBattlecry",
            },
            { target: "idle", guard: "noPendingTriggersLeft" },
          ],
          after: {
            0: {
              guard: "hasPendingTriggers",
              actions: "resolveTriggerAction",
              target: "resolvingTriggers",
              reenter: true,
            },
          },
        },
        // The second half of a turn transition, once end-of-turn triggers and
        // their deaths have finished. Its own macrostep so the client sees the
        // end-of-turn board state before the next turn's draw lands.
        advancingTurn: {
          after: {
            0: {
              actions: "finishTurnAdvanceAction",
              target: "idle",
            },
          },
        },
      },
    },
    // Deliberately NOT a final state: a final root state stops the actor and
    // every later event logs "sent to stopped actor". The engine already
    // rejects moves once ctx.gameover is set; keeping the actor alive lets
    // the UI keep reading snapshots (winner overlay, event history).
    finished: {},
  },
});

/** Convenience: builds the machine event for a raw move command (server side). */
export function moveCommandToEvent(
  move: MoveName,
  args: unknown[],
  playerID: PlayerID,
): GameMachineEvent | null {
  switch (move) {
    case "placeCard":
      return {
        type: "PLACE_CARD",
        playerID,
        cardId: args[0] as string,
        target: args[1] as TargetValue | undefined,
        boardIndex: args[2] as number | undefined,
      };
    case "minionAttack":
      return {
        type: "MINION_ATTACK",
        playerID,
        attackerId: args[0] as string,
        target: args[1] as TargetValue,
      };
    case "heroAttack":
      return {
        type: "HERO_ATTACK",
        playerID,
        target: args[0] as TargetValue,
      };
    case "useHeroPower":
      return {
        type: "HERO_POWER",
        playerID,
        target: args[0] as TargetValue | undefined,
      };
    case "resolveBattlecry":
      return {
        type: "RESOLVE_BATTLECRY",
        playerID,
        cardId: args[0] as string,
        target: args[1] as TargetValue,
      };
    case "cancelBattlecry":
      return { type: "CANCEL_BATTLECRY", playerID };
    case "drawCard":
      return { type: "DRAW_CARD", playerID };
    case "endTurn":
      return { type: "END_TURN", playerID };
    case "mulliganConfirm":
      return {
        type: "MULLIGAN_CONFIRM",
        playerID,
        replaceCardIds: (args[0] as string[]) ?? [],
      };
    default:
      return null;
  }
}
