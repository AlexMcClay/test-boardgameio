// Framework-free Monte-Carlo Tree Search (UCB1), replacing boardgame.io's
// MCTSBot. Pure and synchronous: give it an EngineState, get a move back —
// which is exactly why the gameMachine stays free of internal delays. Runs
// inside a Web Worker on the frontend so searches never block the UI thread.

import { applyMove, type EngineState, type MoveName } from "./engine.js";
import { enumerateAIMoves, evaluateGameState, type AIMove } from "./ai.js";
import type { GameCtx, PlayerID } from "./types";

// ai.ts types its ctx parameter as boardgame.io's Ctx (a structural superset
// of GameCtx); it only ever reads ctx.currentPlayer, so this cast is safe.
type AICtx = Parameters<typeof enumerateAIMoves>[1];
const asAICtx = (ctx: GameCtx) => ctx as unknown as AICtx;

export interface MCTSConfig {
  /** Search iterations per decision (parity with the old FastMCTSBot: 100). */
  iterations: number;
  /** Max moves simulated per random playout (old FastMCTSBot: 50). */
  playoutDepth: number;
}

export const DEFAULT_MCTS_CONFIG: MCTSConfig = {
  iterations: 100,
  playoutDepth: 50,
};

export interface MCTSChosenMove {
  move: MoveName;
  args: unknown[];
}

const UCB_EXPLORATION = Math.SQRT2;

interface Node {
  state: EngineState;
  parent: Node | null;
  moveFromParent: MCTSChosenMove | null;
  /** Player who acts FROM this node's state. */
  actingPlayer: PlayerID;
  untriedMoves: AIMove[];
  children: Node[];
  visits: number;
  /** Accumulated playout value in [0, 1], from the root player's perspective. */
  totalValue: number;
}

function cloneState(state: EngineState): EngineState {
  return { G: structuredClone(state.G), ctx: { ...state.ctx } };
}

function makeNode(
  state: EngineState,
  parent: Node | null,
  moveFromParent: MCTSChosenMove | null,
): Node {
  return {
    state,
    parent,
    moveFromParent,
    actingPlayer: state.ctx.currentPlayer,
    untriedMoves: state.ctx.gameover
      ? []
      : enumerateAIMoves(state.G, asAICtx(state.ctx)),
    children: [],
    visits: 0,
    totalValue: 0,
  };
}

/** Maps the unbounded heuristic score to (0, 1) for UCB backpropagation. */
function normalizeScore(score: number): number {
  return 1 / (1 + Math.exp(-score / 40));
}

/** Playout value of a state, in [0, 1] from rootPlayer's perspective. */
function evaluateForRoot(state: EngineState, rootPlayer: PlayerID): number {
  if (state.ctx.gameover) {
    if (state.ctx.gameover.winner === rootPlayer) return 1;
    if (state.ctx.gameover.winner === "draw") return 0.5;
    return 0;
  }
  return normalizeScore(
    evaluateGameState(
      state.G,
      asAICtx({ ...state.ctx, currentPlayer: rootPlayer }),
    ),
  );
}

function ucb1(node: Node, child: Node, rootPlayer: PlayerID): number {
  const mean = child.totalValue / child.visits;
  // Values are stored from the root player's perspective; when the opponent
  // is choosing, they prefer states that are bad for the root player.
  const exploit = node.actingPlayer === rootPlayer ? mean : 1 - mean;
  const explore =
    UCB_EXPLORATION * Math.sqrt(Math.log(node.visits) / child.visits);
  return exploit + explore;
}

/** Random playout from a state; returns a value for the root player. */
function playout(
  start: EngineState,
  rootPlayer: PlayerID,
  depth: number,
): number {
  const state = cloneState(start);
  for (let i = 0; i < depth; i++) {
    if (state.ctx.gameover) break;
    const moves = enumerateAIMoves(state.G, asAICtx(state.ctx));
    if (moves.length === 0) break;
    // Light playout policy: sample among the strongest few enumerated moves
    // (the list is score-sorted) instead of uniformly, so simulations stay
    // plausible without being deterministic.
    const pool = Math.min(3, moves.length);
    const choice = moves[Math.floor(Math.random() * pool)];
    applyMove(state, choice.move as MoveName, choice.args, state.ctx.currentPlayer);
  }
  return evaluateForRoot(state, rootPlayer);
}

/**
 * Chooses a move for state.ctx.currentPlayer. Returns null only when nothing
 * is enumerable (callers should treat that as "end the turn").
 */
export function findBestMove(
  state: EngineState,
  config: MCTSConfig = DEFAULT_MCTS_CONFIG,
): MCTSChosenMove | null {
  const rootPlayer = state.ctx.currentPlayer;
  const root = makeNode(cloneState(state), null, null);

  if (root.untriedMoves.length === 0) return null;

  for (let i = 0; i < config.iterations; i++) {
    // 1. Selection: descend fully-expanded nodes by UCB1
    let node = root;
    while (
      node.untriedMoves.length === 0 &&
      node.children.length > 0 &&
      !node.state.ctx.gameover
    ) {
      node = node.children.reduce((best, child) =>
        ucb1(node, child, rootPlayer) > ucb1(node, best, rootPlayer)
          ? child
          : best,
      );
    }

    // 2. Expansion: try one untested move from this node
    if (node.untriedMoves.length > 0 && !node.state.ctx.gameover) {
      const index = Math.floor(Math.random() * node.untriedMoves.length);
      const [aiMove] = node.untriedMoves.splice(index, 1);
      const nextState = cloneState(node.state);
      applyMove(
        nextState,
        aiMove.move as MoveName,
        aiMove.args,
        nextState.ctx.currentPlayer,
      );
      const child = makeNode(nextState, node, {
        move: aiMove.move as MoveName,
        args: aiMove.args,
      });
      node.children.push(child);
      node = child;
    }

    // 3. Simulation
    const value = playout(node.state, rootPlayer, config.playoutDepth);

    // 4. Backpropagation
    for (let n: Node | null = node; n; n = n.parent) {
      n.visits += 1;
      n.totalValue += value;
    }
  }

  if (root.children.length === 0) return null;

  // Most-visited child is the most robust choice
  const best = root.children.reduce((a, b) =>
    b.visits > a.visits ? b : a,
  );
  return best.moveFromParent;
}
