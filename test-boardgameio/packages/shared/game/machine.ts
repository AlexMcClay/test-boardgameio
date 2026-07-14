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
import { applyMove, createInitialState, type MoveName } from "./engine.js";
import type { GameSetupData } from "./index.js";
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
  | { type: "END_TURN"; playerID: PlayerID };

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
      const result = applyMove(next, move, args, event.playerID);
      if (!result.ok) {
        console.warn(`Move rejected: ${event.type} — ${result.error}`);
        return {};
      }
      return next;
    }),
  },
  guards: {
    hasPendingBattlecry: ({ context }) => !!context.G.activeBattlecryMinion,
    noPendingBattlecry: ({ context }) => !context.G.activeBattlecryMinion,
    isGameOver: ({ context }) => !!context.ctx.gameover,
  },
}).createMachine({
  id: "hearthstone",
  context: ({ input }) => createInitialState(input.setupData),
  initial: "playing",
  states: {
    playing: {
      always: { target: "finished", guard: "isGameOver" },
      initial: "idle",
      states: {
        idle: {
          always: {
            target: "awaitingBattlecryTarget",
            guard: "hasPendingBattlecry",
          },
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
          always: { target: "idle", guard: "noPendingBattlecry" },
          on: {
            RESOLVE_BATTLECRY: { actions: "applyMoveEvent" },
            CANCEL_BATTLECRY: { actions: "applyMoveEvent" },
            // Ending the turn with an unresolved battlecry was allowed under
            // boardgame.io (endTurn clears activeBattlecryMinion); keep parity.
            END_TURN: { actions: "applyMoveEvent" },
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
    default:
      return null;
  }
}
