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
  /** Search iterations per decision. */
  iterations: number;
  /** Max moves simulated per random playout. */
  playoutDepth: number;
}

/**
 * Difficulty presets. Depth can be shorter than it once was because playouts
 * now enumerate `endTurn` and so cross turn boundaries — a 30-move simulation
 * reaches several turns ahead instead of grinding out one endless turn.
 */
export const MCTS_PRESETS = {
  easy: { iterations: 50, playoutDepth: 20 },
  normal: { iterations: 250, playoutDepth: 30 },
  hard: { iterations: 800, playoutDepth: 40 },
} as const satisfies Record<string, MCTSConfig>;

export type MCTSDifficulty = keyof typeof MCTS_PRESETS;

export const DEFAULT_MCTS_CONFIG: MCTSConfig = MCTS_PRESETS.normal;

export interface MCTSChosenMove {
  move: MoveName;
  args: unknown[];
}

const UCB_EXPLORATION = Math.SQRT2;

/**
 * Weight of the heuristic prior in node selection. ai.ts already scores every
 * enumerated move using real domain knowledge (lethal, trades, mana curve);
 * without this term that knowledge only ordered playouts and never steered the
 * tree, so two branches that both eventually win looked identical and the
 * search could dawdle instead of taking lethal now. The term decays as 1/(1+n),
 * so it directs early exploration and then yields to measured results.
 */
const PRIOR_WEIGHT = 1.5;

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
  /** Heuristic appeal of the move that created this node, in (0, 1). */
  prior: number;
}

function cloneState(state: EngineState): EngineState {
  return { G: structuredClone(state.G), ctx: { ...state.ctx } };
}

function makeNode(
  state: EngineState,
  parent: Node | null,
  moveFromParent: MCTSChosenMove | null,
  prior = 0.5,
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
    prior,
  };
}

/**
 * Did applying a move actually change anything?
 *
 * Move implementations reject bad input by warning and returning early, while
 * applyMove still reports success (see engine.ts) — so a move the engine
 * refused is indistinguishable from one it ran, except that nothing happened.
 * Every real move records at least one event, so a stalled eventHistory with
 * an unchanged turn means the move was dropped. Enumeration validates targets
 * now, so this should essentially never fire; it exists so a future gap can't
 * grow an unbounded chain of identical no-op nodes in the tree again.
 */
interface StateStamp {
  events: number;
  turn: number;
  currentPlayer: PlayerID;
  gameover: boolean;
}

/** applyMove mutates in place, so progress is measured against a stamp. */
function stampState(state: EngineState): StateStamp {
  return {
    events: state.G.eventHistory.length,
    turn: state.ctx.turn,
    currentPlayer: state.ctx.currentPlayer,
    gameover: !!state.ctx.gameover,
  };
}

function stateAdvanced(before: StateStamp, after: EngineState): boolean {
  return (
    after.G.eventHistory.length !== before.events ||
    after.ctx.turn !== before.turn ||
    after.ctx.currentPlayer !== before.currentPlayer ||
    !!after.ctx.gameover !== before.gameover
  );
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
  // The prior always favours what the player TO MOVE at `node` wants; whose
  // value that is has already been handled by `exploit`.
  const bias = (PRIOR_WEIGHT * child.prior) / (1 + child.visits);
  return exploit + explore + bias;
}

/**
 * How much a win is discounted per simulated move it takes to arrive.
 * Winning now and winning in five turns are both "1" to a plain playout, which
 * leaves the search free to sit on lethal. Decaying toward the neutral 0.5
 * breaks that tie toward acting immediately — and, symmetrically, toward
 * postponing a loss.
 */
const STEP_DISCOUNT = 0.98;

/** Random playout from a state; returns a value for the root player. */
function playout(
  start: EngineState,
  rootPlayer: PlayerID,
  depth: number,
): number {
  const state = cloneState(start);
  let steps = 0;
  for (let i = 0; i < depth; i++) {
    if (state.ctx.gameover) break;
    const moves = enumerateAIMoves(state.G, asAICtx(state.ctx));
    if (moves.length === 0) break;
    // Light playout policy: sample among the enumerated moves that are actually
    // competitive with the best one. A flat "top 3" would put `endTurn` in the
    // pool whenever few moves exist — including the turn a lethal attack is
    // available — so the pool narrows as the best move pulls ahead.
    const pool = competitivePoolSize(moves);
    const choice = moves[Math.floor(Math.random() * pool)];
    steps++;
    const before = stampState(state);
    applyMove(state, choice.move as MoveName, choice.args, state.ctx.currentPlayer);
    // Stop rather than spend the remaining depth re-picking a move that the
    // engine is refusing to apply.
    if (!stateAdvanced(before, state)) break;
  }
  return discountForSteps(evaluateForRoot(state, rootPlayer), steps);
}

/**
 * How many of the score-sorted moves are close enough to the best to be worth
 * simulating. Always at least 1, never more than 3.
 */
function competitivePoolSize(moves: AIMove[]): number {
  const best = moves[0].score;
  let pool = 1;
  while (
    pool < moves.length &&
    pool < 3 &&
    moves[pool].score >= best - COMPETITIVE_MARGIN
  ) {
    pool++;
  }
  return pool;
}

const COMPETITIVE_MARGIN = 40;

/** Pulls a value toward the neutral 0.5 the longer it took to reach. */
function discountForSteps(value: number, steps: number): number {
  return 0.5 + (value - 0.5) * Math.pow(STEP_DISCOUNT, steps);
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
      const before = stampState(nextState);
      applyMove(
        nextState,
        aiMove.move as MoveName,
        aiMove.args,
        nextState.ctx.currentPlayer,
      );
      // A move the engine dropped would produce a child identical to its
      // parent, whose own children repeat the same move — an unbounded chain
      // of positions that all look exactly as good as doing nothing. Skip it
      // and simulate from here instead; the iteration still counts.
      if (stateAdvanced(before, nextState)) {
        const child = makeNode(
          nextState,
          node,
          { move: aiMove.move as MoveName, args: aiMove.args },
          normalizeScore(aiMove.score),
        );
        node.children.push(child);
        node = child;
      }
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
