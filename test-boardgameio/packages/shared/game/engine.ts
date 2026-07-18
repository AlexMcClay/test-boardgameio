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
  drawCard,
  endTurn,
  beginTurn,
  endTurnCleanup,
  mulliganDraw,
  confirmMulligan,
  setupGame,
  checkVictory,
  processDeaths,
  hasPendingAutoBattlecry,
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

/** Ends the current player's turn and starts the opponent's. */
export function advanceTurn(state: EngineState) {
  const { G, ctx } = state;
  endTurnCleanup(G, ctx);
  ctx.currentPlayer = ctx.currentPlayer === "0" ? "1" : "0";
  ctx.turn += 1;
  beginTurn(G, ctx);
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
    // (e.g. expiring modifiers) — fall through to the settle path below.
    refreshOngoing(G, ctx);
    if (settle) {
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
    case "drawCard":
      drawCard(G, ctx);
      break;
    case "endTurn":
      endTurn(G, ctx);
      advanceTurn(state);
      break;
    default:
      return { ok: false, error: `unknown-move:${String(move)}` };
  }

  // Sync ongoing effects (auras / in-hand / enrage) with whatever the move
  // changed — diff-based, so it's silent when nothing relevant moved. Deaths
  // this causes (e.g. a killed aura provider) stay pending for the host.
  refreshOngoing(G, ctx);

  if (settle) {
    // Same order the machine steps through: battlecry → death waves
    if (hasPendingAutoBattlecry(G)) {
      resolvePendingAutoBattlecry(G, ctx);
    }
    processDeaths(G, ctx);
  }

  finalizeVictory(state);

  return { ok: true };
}
