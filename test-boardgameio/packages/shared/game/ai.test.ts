import { describe, expect, it } from "vitest";
import { enumerateAIMoves } from "./ai";
import { findBestMove } from "./mcts";
import { applyMove } from "./engine";
import { validateMove } from "./utils/validateMove";
import { createCardFromID } from "./utils";
import { mageHero, warriorHero } from "./data/heros";
import type { CardTemplateKey } from "./data/cards";
import type { Card, Ctx, GameState, Player } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function card(key: CardTemplateKey, overrides: Partial<Card> = {}): Card {
  const instance = createCardFromID(key);
  if (!instance) throw new Error(`no card template: ${key}`);
  return Object.assign(instance, overrides);
}

/** A minion already on the board and able to act. */
function placed(key: CardTemplateKey, overrides: Partial<Card> = {}): Card {
  return card(key, {
    isPlaced: true,
    summoningSickness: false,
    attacksLeft: 1,
    ...overrides,
  });
}

function player(id: "0" | "1", overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: `P${id}`,
    heroPortrait: "",
    maxHealth: 30,
    health: 30,
    armor: 0,
    maxMana: 10,
    manaCap: 10,
    availableMana: 10,
    tempMana: 0,
    overloadPending: 0,
    overloadLocked: 0,
    baseAttack: 0,
    modifiers: [],
    attacksLeft: 1,
    hand: [],
    deck: [],
    burntCards: [],
    heroPowerUsedThisTurn: false,
    hero: id === "0" ? warriorHero : mageHero,
    weapon: null,
    ...overrides,
  };
}

function makeState(opts: {
  hand?: Card[];
  board?: Card[];
  enemyBoard?: Card[];
  self?: Partial<Player>;
  enemy?: Partial<Player>;
}): { G: GameState; ctx: Ctx } {
  const G: GameState = {
    players: {
      "0": player("0", { hand: opts.hand ?? [], ...opts.self }),
      "1": player("1", opts.enemy),
    },
    board: { "0": opts.board ?? [], "1": opts.enemyBoard ?? [] },
    gameEvents: [],
    eventHistory: [],
    activeBattlecryMinion: null,
    pendingTriggers: [],
    graveyard: [],
    discardedCards: [],
  };
  return { G, ctx: { currentPlayer: "0", turn: 1 } as Ctx };
}

/** The placeCard moves enumerated for one specific card. */
function playsOf(G: GameState, ctx: Ctx, cardId: string) {
  return enumerateAIMoves(G, ctx).filter(
    (m) => m.move === "placeCard" && m.args[0] === cardId,
  );
}

/** The ids a set of moves aim at (arg index 1 for plays, 1 for attacks). */
function targetIds(moves: { args: any[] }[]): string[] {
  return moves.map((m) => m.args[1]?.id).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Target conditions — the "Execute on an undamaged minion" class of bug
// ---------------------------------------------------------------------------

describe("targetQuery conditions are respected", () => {
  it("Execute only targets damaged enemy minions", () => {
    const damaged = placed("chillwind-yeti", { damageTaken: 2 });
    const healthy = placed("chillwind-yeti");
    const execute = card("execute");
    const { G, ctx } = makeState({
      hand: [execute],
      enemyBoard: [damaged, healthy],
    });

    const ids = targetIds(playsOf(G, ctx, execute.id));
    expect(ids).toContain(damaged.id);
    expect(ids).not.toContain(healthy.id);
  });

  it("Execute is not enumerated at all when no enemy minion is damaged", () => {
    const execute = card("execute");
    const { G, ctx } = makeState({
      hand: [execute],
      enemyBoard: [placed("chillwind-yeti")],
    });

    expect(playsOf(G, ctx, execute.id)).toHaveLength(0);
  });

  it("Backstab only targets undamaged minions (the inverse condition)", () => {
    const damaged = placed("chillwind-yeti", { damageTaken: 1 });
    const healthy = placed("chillwind-yeti");
    const backstab = card("backstab");
    const { G, ctx } = makeState({
      hand: [backstab],
      enemyBoard: [damaged, healthy],
    });

    const ids = targetIds(playsOf(G, ctx, backstab.id));
    expect(ids).toContain(healthy.id);
    expect(ids).not.toContain(damaged.id);
  });

  it("Shadow Word: Death respects its numeric attack >= 5 condition", () => {
    const big = placed("core-hound"); // 9/5
    const small = placed("chillwind-yeti"); // 4/5
    const swd = card("shadow-word-death");
    const { G, ctx } = makeState({
      hand: [swd],
      enemyBoard: [big, small],
    });

    const ids = targetIds(playsOf(G, ctx, swd.id));
    expect(ids).toContain(big.id);
    expect(ids).not.toContain(small.id);
  });

  it("Shadow Word: Pain respects its numeric attack <= 3 condition", () => {
    const big = placed("core-hound");
    const small = placed("bloodfen-raptor"); // 3/2
    const swp = card("shadow-word-pain");
    const { G, ctx } = makeState({
      hand: [swp],
      enemyBoard: [big, small],
    });

    const ids = targetIds(playsOf(G, ctx, swp.id));
    expect(ids).toContain(small.id);
    expect(ids).not.toContain(big.id);
  });
});

// ---------------------------------------------------------------------------
// Keyword-based targeting restrictions
// ---------------------------------------------------------------------------

describe("targeting restrictions", () => {
  it("spells cannot target an Elusive minion", () => {
    const elusive = placed("faerie-dragon");
    const normal = placed("chillwind-yeti");
    const bolt = card("fireball");
    const { G, ctx } = makeState({
      hand: [bolt],
      enemyBoard: [elusive, normal],
    });

    const ids = targetIds(playsOf(G, ctx, bolt.id));
    expect(ids).not.toContain(elusive.id);
    expect(ids).toContain(normal.id);
  });

  it("the hero power cannot target an Elusive minion", () => {
    const elusive = placed("faerie-dragon");
    const normal = placed("chillwind-yeti");
    const { G, ctx } = makeState({
      enemyBoard: [elusive, normal],
      self: { hero: mageHero }, // Fireblast: targeted
    });

    const heroPowerTargets = targetIds(
      enumerateAIMoves(G, ctx)
        .filter((m) => m.move === "useHeroPower")
        .map((m) => ({ args: [null, m.args[0]] })),
    );
    expect(heroPowerTargets).not.toContain(elusive.id);
    expect(heroPowerTargets).toContain(normal.id);
  });

  it("minions cannot attack a Stealthed minion, and must go through Taunt", () => {
    const attacker = placed("chillwind-yeti");
    const stealthed = placed("bloodfen-raptor", { stealth: true });
    const taunt = placed("goldshire-footman", { taunt: true });
    const { G, ctx } = makeState({
      board: [attacker],
      enemyBoard: [stealthed, taunt],
    });

    const attacks = enumerateAIMoves(G, ctx).filter(
      (m) => m.move === "minionAttack",
    );
    const ids = targetIds(attacks);
    expect(ids).not.toContain(stealthed.id);
    // Taunt is up, so the hero is not a legal target either.
    expect(ids).toEqual([taunt.id]);
  });

  it("a summoning-sick minion has no attacks enumerated", () => {
    const sick = placed("chillwind-yeti", { summoningSickness: true });
    const { G, ctx } = makeState({
      board: [sick],
      enemyBoard: [placed("bloodfen-raptor")],
    });

    expect(
      enumerateAIMoves(G, ctx).filter((m) => m.move === "minionAttack"),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Battlecry targeting
// ---------------------------------------------------------------------------

describe("battlecry targeting", () => {
  function battlecryState(minion: Card, opts: Parameters<typeof makeState>[0]) {
    const state = makeState(opts);
    state.G.activeBattlecryMinion = {
      cardId: minion.id,
      playerId: "0",
      sourceEventIndex: 0,
      manaPaid: { temp: 0, permanent: 0 },
      overloadPaid: 0,
    };
    return state;
  }

  it("Big Game Hunter only targets minions with 7+ attack", () => {
    const bgh = placed("big-game-hunter");
    const huge = placed("core-hound"); // 9 attack
    const small = placed("chillwind-yeti"); // 4 attack
    const { G, ctx } = battlecryState(bgh, {
      board: [bgh],
      enemyBoard: [huge, small],
    });

    const ids = targetIds(
      enumerateAIMoves(G, ctx).filter((m) => m.move === "resolveBattlecry"),
    );
    expect(ids).toContain(huge.id);
    expect(ids).not.toContain(small.id);
  });

  it("a battlecry with exclude-self never targets its own minion", () => {
    const archer = placed("elven-archer"); // side: enemy + exclude-self
    const enemy = placed("chillwind-yeti");
    const { G, ctx } = battlecryState(archer, {
      board: [archer],
      enemyBoard: [enemy],
    });

    const ids = targetIds(
      enumerateAIMoves(G, ctx).filter((m) => m.move === "resolveBattlecry"),
    );
    expect(ids).not.toContain(archer.id);
    expect(ids).toContain(enemy.id);
  });

  it("a battlecry WITHOUT exclude-self may target its own minion", () => {
    // Abusive Sergeant buffs "a minion" — itself included. The enumerator used
    // to hardcode self-exclusion for every battlecry and wrongly forbade this.
    const sergeant = placed("abusive-sargent");
    const { G, ctx } = battlecryState(sergeant, {
      board: [sergeant],
      enemyBoard: [],
    });

    const ids = targetIds(
      enumerateAIMoves(G, ctx).filter((m) => m.move === "resolveBattlecry"),
    );
    expect(ids).toContain(sergeant.id);
  });

  it("only cancelBattlecry remains when nothing is a legal target", () => {
    const bgh = placed("big-game-hunter");
    const { G, ctx } = battlecryState(bgh, {
      board: [bgh],
      enemyBoard: [placed("chillwind-yeti")], // 4 attack, below the 7 threshold
    });

    const moves = enumerateAIMoves(G, ctx);
    expect(moves.filter((m) => m.move === "resolveBattlecry")).toHaveLength(0);
    expect(moves.map((m) => m.move)).toContain("cancelBattlecry");
  });
});

// ---------------------------------------------------------------------------
// Cancelling a play must leave the card replayable
// ---------------------------------------------------------------------------

describe("cancelling a battlecry restores a playable card", () => {
  it("does not leave summoning sickness on the returned card", () => {
    const sergeant = card("abusive-sargent");
    const { G } = makeState({
      hand: [sergeant],
      board: [placed("chillwind-yeti")],
    });
    const state = { G, ctx: { currentPlayer: "0" as const, turn: 1 } };

    // Play it, which opens the targeting prompt, then back out.
    applyMove(state, "placeCard", [sergeant.id], "0");
    expect(state.G.activeBattlecryMinion).toBeTruthy();
    applyMove(state, "cancelBattlecry", [], "0");

    const returned = state.G.players["0"].hand.find(
      (c) => c.id === sergeant.id,
    );
    expect(returned).toBeTruthy();
    expect(returned!.summoningSickness).toBeFalsy();

    // ...and it is genuinely replayable, not silently rejected.
    expect(
      validateMove(state.G, state.ctx, sergeant.id, "hand", undefined).valid,
    ).toBe(true);
    const replays = enumerateAIMoves(state.G, state.ctx).filter(
      (m) => m.move === "placeCard" && m.args[0] === sergeant.id,
    );
    expect(replays.length).toBeGreaterThan(0);
  });

  it("playing from hand is never blocked by attack-declaration rules", () => {
    // A stale board flag on a hand card must not make it unplayable.
    const stale = card("chillwind-yeti", {
      summoningSickness: true,
      frozen: true,
      attacksLeft: 0,
    });
    const { G, ctx } = makeState({ hand: [stale] });

    expect(validateMove(G, ctx, stale.id, "hand", undefined).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// endTurn availability (card conservation)
// ---------------------------------------------------------------------------

describe("endTurn is always available", () => {
  it("is enumerated even when many other moves exist", () => {
    const { G, ctx } = makeState({
      hand: [card("chillwind-yeti"), card("bloodfen-raptor"), card("fireball")],
      board: [placed("chillwind-yeti"), placed("bloodfen-raptor")],
      enemyBoard: [placed("core-hound"), placed("goldshire-footman")],
    });

    const moves = enumerateAIMoves(G, ctx);
    expect(moves.length).toBeGreaterThan(5);
    expect(moves.map((m) => m.move)).toContain("endTurn");
  });

  it("survives the top-N truncation on a wide board", () => {
    const wide = Array.from({ length: 7 }, () => placed("chillwind-yeti"));
    const enemyWide = Array.from({ length: 7 }, () => placed("bloodfen-raptor"));
    const { G, ctx } = makeState({
      hand: [card("fireball"), card("frostbolt")],
      board: wide,
      enemyBoard: enemyWide,
    });

    const moves = enumerateAIMoves(G, ctx);
    expect(moves.length).toBeLessThanOrEqual(20);
    expect(moves.map((m) => m.move)).toContain("endTurn");
  });

  it("scores well below a lethal move so the playout policy can't pass on it", () => {
    const attacker = placed("core-hound"); // 9 attack
    const { G, ctx } = makeState({
      board: [attacker],
      enemy: { health: 5 },
    });

    const moves = enumerateAIMoves(G, ctx);
    const endTurn = moves.find((m) => m.move === "endTurn")!;
    const lethal = moves.find((m) => m.move === "minionAttack")!;

    expect(lethal.score).toBeGreaterThan(900);
    expect(endTurn.score).toBeLessThan(0);
    // Ranks last, and by a wide enough margin that MCTS's playout policy
    // narrows its sampling pool to the lethal move alone.
    expect(moves[moves.length - 1].move).toBe("endTurn");
    expect(lethal.score - endTurn.score).toBeGreaterThan(40);
  });

  it("does not treat armored heroes as lethal", () => {
    const attacker = placed("core-hound"); // 9 attack
    const { G, ctx } = makeState({
      board: [attacker],
      enemy: { health: 5, armor: 10 },
    });

    const attack = enumerateAIMoves(G, ctx).find(
      (m) => m.move === "minionAttack",
    )!;
    expect(attack.score).toBeLessThan(900);
  });
});

// ---------------------------------------------------------------------------
// MCTS end-to-end
// ---------------------------------------------------------------------------

describe("findBestMove", () => {
  it("takes lethal when it is on the board", () => {
    const attacker = placed("core-hound");
    const { G, ctx } = makeState({
      board: [attacker],
      enemy: { health: 4 },
    });

    const chosen = findBestMove(
      { G, ctx: { currentPlayer: "0", turn: 1 } },
      { iterations: 80, playoutDepth: 10 },
    );
    expect(chosen?.move).toBe("minionAttack");
    expect((chosen?.args[1] as any).type).toBe("player");
  });

  it("holds a board clear rather than casting it into an empty board", () => {
    const flamestrike = card("flamestrike");
    const { G, ctx } = makeState({
      hand: [flamestrike],
      enemyBoard: [], // nothing to kill
    });

    const chosen = findBestMove(
      { G, ctx: { currentPlayer: "0", turn: 1 } },
      { iterations: 150, playoutDepth: 12 },
    );
    // It may still armour up or pass — what it must not do is burn the clear.
    expect(chosen?.move).not.toBe("placeCard");
  });

  it("does cast that same board clear when there are minions to kill", () => {
    const flamestrike = card("flamestrike");
    const { G, ctx } = makeState({
      hand: [flamestrike],
      enemyBoard: [
        placed("bloodfen-raptor"),
        placed("bloodfen-raptor"),
        placed("goldshire-footman"),
      ],
    });

    const chosen = findBestMove(
      { G, ctx: { currentPlayer: "0", turn: 1 } },
      { iterations: 150, playoutDepth: 12 },
    );
    expect(chosen?.move).toBe("placeCard");
  });

  it("never returns an illegal Execute against an undamaged board", () => {
    const { G, ctx } = makeState({
      hand: [card("execute")],
      enemyBoard: [placed("chillwind-yeti")],
    });

    const chosen = findBestMove(
      { G, ctx: { currentPlayer: "0", turn: 1 } },
      { iterations: 60, playoutDepth: 8 },
    );
    expect(chosen?.move).not.toBe("placeCard");
  });
});
