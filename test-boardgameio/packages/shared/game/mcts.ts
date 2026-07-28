// Framework-free Monte-Carlo Tree Search (UCB1), replacing boardgame.io's
// MCTSBot. Pure and synchronous: give it an EngineState, get a move back —
// which is exactly why the gameMachine stays free of internal delays. Runs
// inside a Web Worker on the frontend so searches never block the UI thread.

import { applyMove, type EngineState, type MoveName } from "./engine.js";
import { enumerateAIMoves, evaluateGameState, type AIMove } from "./ai.js";
import { getAttack, getCurrentHealth, getSpendableMana } from "./utils";
import {
  compactHistoryForSearch,
  runSimulated,
} from "./utils/simulation";
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
  /**
   * Shuffle cards the acting player cannot see before searching. On by default;
   * turn off only to deliberately give the bot perfect information.
   */
  determinize?: boolean;
  /** Carry the chosen subtree into the next decision. On by default. */
  reuseTree?: boolean;
  /** Mute engine logging for the duration of the search. On by default. */
  silenceLogs?: boolean;
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

// ---------------------------------------------------------------------------
// ROOT PREPARATION — shrinking the position, and hiding what the bot may not see
// ---------------------------------------------------------------------------

/**
 * Builds the position the search will actually run on: a private clone, with
 * the event history reduced to what the rules read, and hidden cards shuffled.
 */
function prepareRootState(
  state: EngineState,
  rootPlayer: PlayerID,
  config: MCTSConfig,
): EngineState {
  const prepared = cloneState(state);
  prepared.G.eventHistory = compactHistoryForSearch(
    prepared.G.eventHistory,
  ) as typeof prepared.G.eventHistory;
  prepared.G.gameEvents = [];
  if (config.determinize !== false) determinize(prepared, rootPlayer);
  return prepared;
}

/**
 * Hides information the acting player has no right to.
 *
 * The game state carries both players' hands and decks, so a search over it
 * reads the opponent's hand and plays around cards it cannot possibly know
 * about. That is not just unfair, it reads as uncanny rather than clever. Here
 * the opponent's hand and deck are pooled and re-dealt at random, and the
 * player's own deck is shuffled — counts and card pools are preserved, but
 * *which* card sits where becomes a guess, as it should be.
 *
 * This is a single determinization per decision rather than one per iteration:
 * a deliberate simplification. It removes the cheating without the cost of a
 * full information-set search.
 */
function determinize(state: EngineState, rootPlayer: PlayerID): void {
  const opponentId = rootPlayer === "0" ? "1" : "0";
  const self = state.G.players[rootPlayer];
  const opponent = state.G.players[opponentId];

  // Own hand is known; own deck ORDER is not.
  self.deck = shuffled(self.deck);

  // The opponent's hand and deck are both unknown: pool and re-deal.
  const pool = shuffled([...opponent.hand, ...opponent.deck]);
  opponent.hand = pool.slice(0, opponent.hand.length);
  opponent.deck = pool.slice(opponent.hand.length);
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// TREE REUSE
//
// The bot makes several moves per turn, and each used to start from an empty
// tree. The work done under the branch it actually chose is still valid for the
// next decision, so that subtree is kept and re-rooted — the search compounds
// across a turn instead of restarting.
//
// Correctness rests entirely on the fingerprint: the cached subtree is used
// only if the position it expects is exactly the position that arrived. Any
// divergence (a card drawn, a random summon, the opponent having acted) misses
// and the tree is rebuilt. Reuse is confined to a single player-turn, so the
// opponent-hand guess made at the root cannot go stale underneath it.
// ---------------------------------------------------------------------------

let cachedTree: Node | null = null;
let cachedFingerprint: string | null = null;

/**
 * Reuse hit/miss counts. A miss is normal and safe (any drawn card changes the
 * position and invalidates the cache); a hit rate of zero means the feature is
 * silently doing nothing, which is worth being able to see.
 */
const searchStats = { treeReuseHits: 0, treeReuseMisses: 0 };

export function getSearchStats(): Readonly<typeof searchStats> {
  return { ...searchStats };
}

function rememberTree(node: Node | null, enabled: boolean): void {
  if (!node || !enabled) {
    cachedTree = null;
    cachedFingerprint = null;
    return;
  }
  cachedTree = node;
  // The position this subtree expects to see next time.
  cachedFingerprint = fingerprint(node.state);
}

/** Drops any cached search tree. Call when a new game starts. */
export function resetSearchTree(): void {
  cachedTree = null;
  cachedFingerprint = null;
  searchStats.treeReuseHits = 0;
  searchStats.treeReuseMisses = 0;
}

/**
 * Identity of a position, over everything the acting player can see. Hidden
 * cards are counted, never listed — they are randomised per search, so listing
 * them would miss every time.
 */
function fingerprint(state: EngineState): string {
  const { G, ctx } = state;
  const me = ctx.currentPlayer;
  const them = me === "0" ? "1" : "0";
  const cards = (list: typeof G.board[string]) =>
    list
      .map(
        (c) =>
          `${c.id}:${getAttack(c)}/${getCurrentHealth(c)}:${c.attacksLeft}:${
            c.summoningSickness ? "z" : ""
          }`,
      )
      .join(",");
  const player = G.players[me];
  const enemy = G.players[them];
  return [
    ctx.turn,
    ctx.currentPlayer,
    cards(G.board[me]),
    cards(G.board[them]),
    player.hand.map((c) => c.id).join(","),
    enemy.hand.length,
    `${player.health}+${player.armor}/${enemy.health}+${enemy.armor}`,
    `${getSpendableMana(player)}:${player.heroPowerUsedThisTurn ? 1 : 0}`,
    G.activeBattlecryMinion?.cardId ?? "",
    G.pendingChoice ? "choice" : "",
  ].join("|");
}

/**
 * The cached subtree if it matches the incoming position, otherwise a new root.
 * The authoritative state always replaces the cached one — the cache supplies
 * statistics and children, never the position itself.
 */
function reuseOrCreateRoot(
  rootState: EngineState,
  rootPlayer: PlayerID,
  config: MCTSConfig,
): Node {
  if (config.reuseTree !== false && cachedTree && cachedFingerprint) {
    const incoming = fingerprint(rootState);
    if (
      incoming === cachedFingerprint &&
      cachedTree.actingPlayer === rootPlayer
    ) {
      const reused = cachedTree;
      reused.parent = null;
      reused.moveFromParent = null;
      // The incoming position is authoritative; the cache contributes only its
      // statistics and children.
      reused.state = rootState;
      cachedTree = null;
      cachedFingerprint = null;
      searchStats.treeReuseHits++;
      return reused;
    }
    searchStats.treeReuseMisses++;
  }
  cachedTree = null;
  cachedFingerprint = null;
  return makeNode(rootState, null, null);
}

/**
 * Chooses a move for state.ctx.currentPlayer. Returns null only when nothing
 * is enumerable (callers should treat that as "end the turn").
 */
export function findBestMove(
  state: EngineState,
  config: MCTSConfig = DEFAULT_MCTS_CONFIG,
): MCTSChosenMove | null {
  return runSimulated(() => search(state, config), config.silenceLogs !== false);
}

function search(
  state: EngineState,
  config: MCTSConfig,
): MCTSChosenMove | null {
  const rootPlayer = state.ctx.currentPlayer;
  const rootState = prepareRootState(state, rootPlayer, config);
  const root = reuseOrCreateRoot(rootState, rootPlayer, config);

  // "Nothing to do here" means no move at all — untried OR already explored.
  // A REUSED root arrives fully expanded (its untried list was drained by the
  // previous search) but is rich in children, so testing untriedMoves alone
  // made every reused turn end immediately.
  if (root.untriedMoves.length === 0 && root.children.length === 0) {
    rememberTree(null, false);
    return null;
  }

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

  if (root.children.length === 0) {
    rememberTree(null, false);
    return null;
  }

  // Most-visited child is the most robust choice
  const best = root.children.reduce((a, b) =>
    b.visits > a.visits ? b : a,
  );
  // Keep the chosen branch: the bot plays several moves per turn, and the work
  // done below this node is still valid for the next decision. Only within the
  // same turn — once it passes, the opponent acts and the guess goes stale.
  const staysOurTurn =
    best.actingPlayer === rootPlayer && best.state.ctx.turn === rootState.ctx.turn;
  rememberTree(best, config.reuseTree !== false && staysOurTurn);
  return best.moveFromParent;
}
