import { describe, expect, it } from "vitest";
import { starterDecks } from "./decks";
import { cardTemplates, type CardTemplateKey } from "./cards";
import { heros } from "./heros";
import { generateCardsFromDeckstring } from "../utils";

const DECK_SIZE = 30;

describe.each(starterDecks)("$name", (deck) => {
  const entries = Object.entries(deck.deckString) as [CardTemplateKey, number][];

  it(`contains exactly ${DECK_SIZE} cards`, () => {
    expect(entries.reduce((sum, [, count]) => sum + count, 0)).toBe(DECK_SIZE);
  });

  it(`materialises to exactly ${DECK_SIZE} card instances`, () => {
    // createCardFromID returns null for an unknown key and only warns, so a
    // typo'd deck string silently produces a short deck. This is the guard.
    expect(generateCardsFromDeckstring(deck.deckString)).toHaveLength(DECK_SIZE);
  });

  it("uses only collectible cards of its own class or Neutral", () => {
    for (const [key] of entries) {
      const template = cardTemplates[key];
      expect(template, `unknown card key: ${key}`).toBeDefined();
      expect(template.isUncollectible, `${key} is uncollectible`).not.toBe(true);
      expect([deck.hero.class, "Neutral"], `${key} is ${template.class}`).toContain(
        template.class,
      );
    }
  });

  it("respects copy limits", () => {
    for (const [key, count] of entries) {
      const max = cardTemplates[key].rarity === "Legendary" ? 1 : 2;
      expect(count, `${key} x${count}`).toBeGreaterThan(0);
      expect(count, `${key} x${count} exceeds max ${max}`).toBeLessThanOrEqual(max);
    }
  });
});

describe("starterDecks", () => {
  it("has one deck per playable hero", () => {
    expect(starterDecks).toHaveLength(heros.length);
    expect(new Set(starterDecks.map((d) => d.hero.class))).toEqual(
      new Set(heros.map((h) => h.class)),
    );
  });

  it("has unique ids", () => {
    expect(new Set(starterDecks.map((d) => d.id)).size).toBe(starterDecks.length);
  });
});
