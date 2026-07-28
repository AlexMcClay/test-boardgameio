// Framework-independent game engine host API.
//
// The move implementations live in ./index.ts and mutate GameState directly;
// this module owns everything boardgame.io used to orchestrate around them:
// initial state creation, move dispatch, turn advancement and victory
// detection. Both the XState gameMachine and the MCTS bot drive the game
// exclusively through applyMove().

import {
  placeCard,
  minionAttack,
  heroAttack,
  useHeroPower,
  resolveBattlecry,
  cancelBattlecry,
  resolveChoice,
  cancelChoice,
  drawCard,
  endTurn,
  beginTurn,
  endTurnCleanup,
  mulliganDraw,
  confirmMulligan,
  setupGame,
  checkVictory,
  processDeaths,
  hasPendingDeaths,
  hasPendingAutoBattlecry,
  hasPendingTriggers,
  processTriggers,
  resolvePendingAutoBattlecry,
  refreshOngoing,
  type GameSetupData,
} from "./index.js";
import { recordEvent } from "./utils/index.js";
import type { GameCtx, GameState, PlayerID, TargetValue } from "./types";

export type MoveName =
  | "placeCard"
  | "minionAttack"
  | "heroAttack"
  | "useHeroPower"
  | "resolveBattlecry"
  | "cancelBattlecry"
  | "resolveChoice"
  | "cancelChoice"
  | "drawCard"
  | "endTurn"
  | "mulliganConfirm";

export interface EngineState {
  G: GameState;
  ctx: GameCtx;
}

export type ApplyMoveResult =
  | { ok: true }
  | { ok: false; error: string };

export interface ApplyMoveOptions {
  /**
   * When true (default), the board is fully settled synchronously after the
   * move — pending automatic battlecry, then all death waves — the atomic
   * behavior MCTS simulations and headless hosts need. The gameMachine
   * passes false and instead steps through its `resolvingBattlecry` and
   * `resolvingDeaths` states one macrostep at a time, so each resolution
   * step becomes its own snapshot.
   */
  settle?: boolean;
}

/**
 * Runs victory detection once: sets ctx.gameover and records the gameEnd
 * event. Called after moves (applyMove) and after each machine death wave —
 * a deathrattle can kill a hero mid-chain.
 */
export function finalizeVictory(state: EngineState) {
  const { G, ctx } = state;
  const result = checkVictory(G);
  if (result && !ctx.gameover) {
    ctx.gameover = result;
    recordEvent(G, {
      type: "gameEnd",
      winner: result.winner,
      timestamp: Date.now(),
    });
  }
}

/**
 * Creates a fresh game in the mulligan phase: coin toss decides who goes
 * first, then mulligan hands are dealt (3 for the first player, 4 + The Coin
 * for the second). The first turn does NOT begin here — it starts when both
 * seats confirm their mulligan (confirmMulligan).
 */
export function createInitialState(setupData: GameSetupData): EngineState {
  const G = setupGame(setupData);

  const firstPlayer: PlayerID = Math.random() < 0.5 ? "0" : "1";
  const ctx: GameCtx = { currentPlayer: firstPlayer, turn: 1 };

  G.mulligan = {
    active: true,
    firstPlayer,
    confirmed: { "0": false, "1": false },
  };
  recordEvent(G, {
    type: "coinToss",
    firstPlayer,
    timestamp: Date.now(),
  });

  mulliganDraw(G, ctx);
  return { G, ctx };
}

/**
 * Ends the current player's turn and starts the opponent's, in one step.
 * Kept for callers that want the whole transition atomically; the endTurn MOVE
 * instead splits it (endTurnCleanup now, finishTurnAdvance once end-of-turn
 * triggers and their deaths have resolved).
 */
export function advanceTurn(state: EngineState) {
  const { G, ctx } = state;
  endTurnCleanup(G, ctx);
  finishTurnAdvance(state);
}

/**
 * The second half of a turn transition: hand the turn over and run start-of-
 * turn effects. Split out so end-of-turn TRIGGERS (Baron Geddon's damage, and
 * any deaths it causes) fully resolve while it is still that player's turn —
 * resolving them after the flip would attribute them to the wrong player and
 * fire START_TURN triggers out of order.
 */
export function finishTurnAdvance(state: EngineState) {
  const { G, ctx } = state;
  G.pendingTurnAdvance = false;
  ctx.currentPlayer = ctx.currentPlayer === "0" ? "1" : "0";
  ctx.turn += 1;
  beginTurn(G, ctx);
}

/** True once endTurn has run but the turn hasn't handed over yet. */
export function isTurnAdvancePending(G: GameState): boolean {
  return !!G.pendingTurnAdvance;
}

/**
 * Applies a named move to the state (mutating it in place) and runs victory
 * detection. `playerID`, when given, is checked against the current player —
 * hosts pass the acting player's seat for authoritative validation.
 *
 * Invalid moves (bad targets, not enough mana, ...) are no-ops, matching the
 * previous boardgame.io behavior where moves warn and return early.
 */
export function applyMove(
  state: EngineState,
  move: MoveName,
  args: unknown[] = [],
  playerID?: PlayerID,
  options: ApplyMoveOptions = {},
): ApplyMoveResult {
  const { settle = true } = options;
  const { G, ctx } = state;

  if (ctx.gameover) {
    return { ok: false, error: "game-over" };
  }

  // The runaway-trigger budget is PER ACTION. Reset it here, at the single
  // entry point every move funnels through — left to accumulate across a turn,
  // a busy board (Knife Juggler, Questing Adventurer, Wild Pyromancer) would
  // quietly hit the cap and stop triggering anything for the rest of the turn.
  G.triggerFires = 0;

  // The mulligan is a simultaneous phase: either seat may confirm regardless
  // of ctx.currentPlayer, and nothing else is legal until it's over.
  if (move === "mulliganConfirm") {
    if (playerID === undefined) {
      return { ok: false, error: "mulligan-needs-player" };
    }
    const confirmed = confirmMulligan(
      G,
      ctx,
      playerID,
      (args[0] as string[]) ?? [],
    );
    if (!confirmed) {
      return { ok: false, error: "invalid-mulligan" };
    }
    // A completed mulligan runs beginTurn, which can leave pending deaths
    // (e.g. expiring modifiers) and queue START_TURN triggers.
    refreshOngoing(G, ctx);
    if (settle) {
      processDeaths(G, ctx);
      processTriggers(G, ctx);
      processDeaths(G, ctx);
    }
    finalizeVictory(state);
    return { ok: true };
  }
  if (G.mulligan?.active) {
    return { ok: false, error: "mulligan-active" };
  }

  if (playerID !== undefined && playerID !== ctx.currentPlayer) {
    return { ok: false, error: "not-your-turn" };
  }

  // A Choose One / Discover prompt halts everything else. The machine state
  // enforces this for hosted play; this gate covers MCTS and headless callers,
  // which drive the engine directly. endTurn stays legal — it auto-resolves
  // the prompt (cancel / random pick) so the bot's fallback can't deadlock.
  if (
    G.pendingChoice &&
    move !== "resolveChoice" &&
    move !== "cancelChoice" &&
    move !== "endTurn"
  ) {
    return { ok: false, error: "choice-pending" };
  }

  switch (move) {
    case "placeCard":
      placeCard(
        G,
        ctx,
        args[0] as string,
        args[1] as TargetValue | undefined,
        args[2] as number | undefined,
      );
      break;
    case "minionAttack":
      minionAttack(G, ctx, args[0] as string, args[1] as TargetValue);
      break;
    case "heroAttack":
      heroAttack(G, ctx, args[0] as TargetValue);
      break;
    case "useHeroPower":
      useHeroPower(G, ctx, args[0] as TargetValue | undefined);
      break;
    case "resolveBattlecry":
      resolveBattlecry(G, ctx, args[0] as string, args[1] as TargetValue);
      break;
    case "cancelBattlecry":
      cancelBattlecry(G, ctx);
      break;
    case "resolveChoice":
      resolveChoice(
        G,
        ctx,
        args[0] as number,
        args[1] as TargetValue | undefined,
      );
      break;
    case "cancelChoice":
      cancelChoice(G, ctx);
      break;
    case "drawCard":
      drawCard(G, ctx);
      break;
    case "endTurn":
      endTurn(G, ctx);
      // Ends the turn but does NOT hand it over: end-of-turn triggers queued
      // by endTurnCleanup must resolve first. finishTurnAdvance runs from the
      // settle loop below, or from the machine's advancingTurn state.
      endTurnCleanup(G, ctx);
      G.pendingTurnAdvance = true;
      break;
    default:
      return { ok: false, error: `unknown-move:${String(move)}` };
  }

  // Sync ongoing effects (auras / in-hand / enrage) with whatever the move
  // changed — diff-based, so it's silent when nothing relevant moved. Deaths
  // this causes (e.g. a killed aura provider) stay pending for the host.
  refreshOngoing(G, ctx);

  if (settle) {
    // Drive the whole resolution to quiescence, in the same priority order the
    // machine steps through: auto-battlecry → deaths → triggers → turn hand-off.
    // Looped because each stage can feed the others (a trigger kills a minion,
    // whose deathrattle queues another trigger).
    for (;;) {
      if (hasPendingAutoBattlecry(G)) {
        resolvePendingAutoBattlecry(G, ctx);
        continue;
      }
      if (hasPendingDeaths(G)) {
        processDeaths(G, ctx);
        continue;
      }
      // A pending targeted battlecry or an open Choose One / Discover prompt
      // is waiting on the PLAYER, so reactions hold until they've decided.
      if (
        hasPendingTriggers(G) &&
        !G.activeBattlecryMinion &&
        !G.pendingChoice
      ) {
        processTriggers(G, ctx);
        continue;
      }
      if (
        G.pendingTurnAdvance &&
        !G.activeBattlecryMinion &&
        !G.pendingChoice
      ) {
        finishTurnAdvance(state);
        continue;
      }
      break;
    }
  }

  finalizeVictory(state);

  return { ok: true };
}
