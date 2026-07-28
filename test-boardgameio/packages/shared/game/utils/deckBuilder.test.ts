import { describe, expect, it } from "vitest";
import {
  DECK_SIZE,
  cardPoolForClass,
  completeDeck,
  countCards,
  generateDeck,
  manaBucket,
  maxCopies,
} from "./deckBuilder";
import { cardTemplates, type CardTemplateKey } from "../data/cards";
import { heros } from "../data/heros";
import { starterDecks } from "../data/decks";
import type { DeckString } from "../types";

/** Deterministic RNG so a failure is reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const CLASSES = heros.map((h) => h.class);

function assertLegal(deck: DeckString, heroClass: string) {
  for (const [key, count] of Object.entries(deck) as [CardTemplateKey, number][]) {
    const template = cardTemplates[key];
    expect(template, `unknown card key: ${key}`).toBeDefined();
    expect(template.isUncollectible, `${key} is uncollectible`).not.toBe(true);
    expect([heroClass, "Neutral"], `${key} is ${template.class}`).toContain(
      template.class,
    );
    expect(count, `${key} x${count}`).toBeLessThanOrEqual(maxCopies(template));
    expect(count).toBeGreaterThan(0);
  }
}

describe("manaBucket", () => {
  it("buckets 7 and above together", () => {
    expect(manaBucket(0)).toBe(0);
    expect(manaBucket(6)).toBe(6);
    expect(manaBucket(7)).toBe(7);
    expect(manaBucket(10)).toBe(7);
    expect(manaBucket(20)).toBe(7);
  });

  it("treats a missing cost as 0", () => {
    expect(manaBucket(undefined)).toBe(0);
  });
});

describe("cardPoolForClass", () => {
  it.each(CLASSES)("%s pool is non-empty and legal", (heroClass) => {
    const pool = cardPoolForClass(heroClass);
    expect(pool.length).toBeGreaterThan(DECK_SIZE);
    for (const [, card] of pool) {
      expect(card.isUncollectible).not.toBe(true);
      expect([heroClass, "Neutral"]).toContain(card.class);
    }
  });
});

describe("generateDeck", () => {
  it.each(CLASSES)("builds a legal 30-card %s deck", (heroClass) => {
    const deck = generateDeck(heroClass, { random: seededRandom(42) });
    expect(countCards(deck)).toBe(DECK_SIZE);
    assertLegal(deck, heroClass);
  });

  it.each(CLASSES)("gives %s a playable curve and board presence", (heroClass) => {
    const deck = generateDeck(heroClass, { random: seededRandom(7) });

    let minions = 0;
    let classCards = 0;
    let sevenPlus = 0;
    let cheap = 0;
    for (const [key, count] of Object.entries(deck) as [CardTemplateKey, number][]) {
      const card = cardTemplates[key];
      if (card.isMinion) minions += count;
      if (card.class === heroClass) classCards += count;
      if (manaBucket(card.baseMana) === 7) sevenPlus += count;
      if ((card.baseMana ?? 0) <= 3) cheap += count;
    }

    // Enough bodies to contest the board.
    expect(minions).toBeGreaterThanOrEqual(14);
    // Recognisably a deck of this class, not 30 neutrals.
    expect(classCards).toBeGreaterThanOrEqual(10);
    // Front-loaded, and not clogged with expensive cards.
    expect(cheap).toBeGreaterThanOrEqual(10);
    expect(sevenPlus).toBeLessThanOrEqual(5);
  });

  it("varies between calls with different randomness", () => {
    const a = generateDeck("Mage", { random: seededRandom(1) });
    const b = generateDeck("Mage", { random: seededRandom(999) });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe("completeDeck", () => {
  it.each(CLASSES)("fills a half-built %s deck to 30", (heroClass) => {
    const seed = generateDeck(heroClass, { random: seededRandom(3) });
    // Keep roughly half the cards as the player's existing work.
    const partial: DeckString = {};
    let kept = 0;
    for (const [key, count] of Object.entries(seed) as [CardTemplateKey, number][]) {
      if (kept >= 15) break;
      const take = Math.min(count, 15 - kept);
      partial[key] = take;
      kept += take;
    }

    const completed = completeDeck(partial, heroClass, {
      random: seededRandom(11),
    });
    expect(countCards(completed)).toBe(DECK_SIZE);
    assertLegal(completed, heroClass);

    // Never removes or reduces what the player already picked.
    for (const [key, count] of Object.entries(partial) as [CardTemplateKey, number][]) {
      expect(completed[key] ?? 0).toBeGreaterThanOrEqual(count);
    }
  });

  it("is a no-op on a deck that is already full", () => {
    const full = starterDecks[0];
    const completed = completeDeck(full.deckString, full.hero.class, {
      random: seededRandom(5),
    });
    expect(completed).toEqual(full.deckString);
  });

  it("does not mutate the deck it is given", () => {
    const input: DeckString = { wisp: 2 };
    const snapshot = JSON.stringify(input);
    completeDeck(input, "Mage", { random: seededRandom(5) });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("tops up a deck that is one card short", () => {
    const full = starterDecks[0];
    const short = { ...full.deckString };
    const firstKey = Object.keys(short)[0] as CardTemplateKey;
    short[firstKey] = short[firstKey]! - 1;
    if (!short[firstKey]) delete short[firstKey];

    const completed = completeDeck(short, full.hero.class, {
      random: seededRandom(5),
    });
    expect(countCards(completed)).toBe(DECK_SIZE);
  });

  it("respects an already-maxed legendary rather than adding a third copy", () => {
    const deck: DeckString = { "archmage-antonidas": 1 };
    const completed = completeDeck(deck, "Mage", { random: seededRandom(2) });
    expect(completed["archmage-antonidas"]).toBe(1);
    expect(countCards(completed)).toBe(DECK_SIZE);
  });

  it("honours a custom size", () => {
    const deck = completeDeck({}, "Druid", {
      size: 12,
      random: seededRandom(4),
    });
    expect(countCards(deck)).toBe(12);
  });

  it("stops instead of looping when the pool cannot reach the size", () => {
    // Far larger than any class pool can supply at 2 copies per card.
    const deck = completeDeck({}, "Hunter", {
      size: 100000,
      random: seededRandom(6),
    });
    const poolCeiling = cardPoolForClass("Hunter").reduce(
      (sum, [, card]) => sum + maxCopies(card),
      0,
    );
    expect(countCards(deck)).toBe(poolCeiling);
  });
});
