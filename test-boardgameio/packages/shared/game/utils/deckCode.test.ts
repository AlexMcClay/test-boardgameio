import { describe, expect, it } from "vitest";
import { decodeDeckCode, encodeDeckCode, isDeckCode } from "./deckCode";
import { starterDecks } from "../data/decks";
import { mageHero, warriorHero } from "../data/heros";
import type { DeckString } from "../types";

describe("deck codes", () => {
  it.each(starterDecks)("round-trips $name unchanged", (deck) => {
    const decoded = decodeDeckCode(encodeDeckCode(deck));
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(deck.name);
    expect(decoded!.hero.class).toBe(deck.hero.class);
    expect(decoded!.deckString).toEqual(deck.deckString);
  });

  it("resolves the hero object, not just the class name", () => {
    const decoded = decodeDeckCode(encodeDeckCode(starterDecks[0]));
    expect(decoded!.hero.heroPower).toBeDefined();
    expect(decoded!.hero.portrait).toBe(starterDecks[0].hero.portrait);
  });

  it("round-trips a partially built deck", () => {
    const partial: DeckString = { fireball: 2, "mana-wyrm": 1 };
    const decoded = decodeDeckCode(
      encodeDeckCode({ name: "WIP", hero: mageHero, deckString: partial }),
    );
    expect(decoded!.deckString).toEqual(partial);
  });

  it("survives a non-ASCII deck name", () => {
    const name = "マナ Wyrm ⚡";
    const decoded = decodeDeckCode(
      encodeDeckCode({ name, hero: mageHero, deckString: { fireball: 1 } }),
    );
    expect(decoded!.name).toBe(name);
  });

  it("tolerates surrounding whitespace from a sloppy paste", () => {
    const code = encodeDeckCode(starterDecks[0]);
    expect(decodeDeckCode(`\n  ${code}  \n`)).not.toBeNull();
  });

  it("falls back to a class name when the code carries no name", () => {
    const decoded = decodeDeckCode(
      encodeDeckCode({ name: "   ", hero: mageHero, deckString: { fireball: 1 } }),
    );
    expect(decoded!.name).toBe("Mage Deck");
  });

  it("truncates an over-long name to the editor's limit", () => {
    const decoded = decodeDeckCode(
      encodeDeckCode({
        name: "x".repeat(80),
        hero: mageHero,
        deckString: { fireball: 1 },
      }),
    );
    expect(decoded!.name).toHaveLength(30);
  });
});

describe("decodeDeckCode rejects", () => {
  const encodePayload = (payload: unknown) =>
    "HSD1:" + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));

  it.each([
    ["empty string", ""],
    ["plain prose", "hello world"],
    ["a bare url", "https://example.com"],
    ["unprefixed base64", btoa("nonsense")],
    ["the prefix alone", "HSD1:"],
    ["prefix plus junk", "HSD1:not-base64!!"],
    ["a future version", "HSD2:" + btoa("{}")],
  ])("%s", (_label, raw) => {
    expect(decodeDeckCode(raw)).toBeNull();
  });

  it("valid base64 that isn't JSON", () => {
    expect(decodeDeckCode("HSD1:" + btoa("still not json"))).toBeNull();
  });

  it("an unknown hero class", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Necromancer", n: "x", d: { wisp: 1 } })),
    ).toBeNull();
  });

  it("an unknown card key", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { "not-a-card": 1 } })),
    ).toBeNull();
  });

  it("an uncollectible token", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { "the-coin": 1 } })),
    ).toBeNull();
  });

  it("a card belonging to another class", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { backstab: 1 } })),
    ).toBeNull();
  });

  it("a third copy of a normal card", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { fireball: 3 } })),
    ).toBeNull();
  });

  it("a second copy of a legendary", () => {
    expect(
      decodeDeckCode(
        encodePayload({ v: 1, c: "Mage", n: "x", d: { "archmage-antonidas": 2 } }),
      ),
    ).toBeNull();
  });

  it("a non-integer or zero count", () => {
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { fireball: 1.5 } })),
    ).toBeNull();
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: { fireball: 0 } })),
    ).toBeNull();
  });

  it("an empty deck", () => {
    expect(decodeDeckCode(encodePayload({ v: 1, c: "Mage", n: "x", d: {} }))).toBeNull();
  });

  it("a deck larger than 30 cards", () => {
    const oversized: DeckString = {};
    for (const [key, count] of Object.entries(starterDecks[0].deckString)) {
      oversized[key as keyof DeckString] = count;
    }
    oversized.wisp = 2; // 32 cards
    expect(
      decodeDeckCode(encodePayload({ v: 1, c: warriorHero.class, n: "x", d: oversized })),
    ).toBeNull();
  });
});

describe("isDeckCode", () => {
  it("agrees with decodeDeckCode", () => {
    expect(isDeckCode(encodeDeckCode(starterDecks[0]))).toBe(true);
    expect(isDeckCode("just some copied text")).toBe(false);
  });
});
