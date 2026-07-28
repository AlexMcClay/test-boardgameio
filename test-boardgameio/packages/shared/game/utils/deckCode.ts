import {
  cardTemplates,
  type CardTemplate,
  type CardTemplateKey,
} from "../data/cards";
import { heros } from "../data/heros";
import type { DeckString, Hero } from "../types";
import { DECK_SIZE, countCards, maxCopies } from "./deckBuilder";

/**
 * Shareable deck codes.
 *
 * A code is `HSD1:` followed by base64 of a small JSON payload. The prefix is
 * what makes "is there a deck on the clipboard?" answerable without trying to
 * parse arbitrary text, and the version digit lets a future format reject old
 * codes cleanly instead of half-reading them.
 */

const PREFIX = "HSD1:";

/** Matches the deck name input's maxLength in Deck.tsx. */
const MAX_NAME_LENGTH = 30;

export interface DeckCodeDeck {
  name: string;
  hero: Hero;
  deckString: DeckString;
}

interface DeckCodePayload {
  v: 1;
  /** Hero class, e.g. "Mage". The hero object is looked up on decode. */
  c: string;
  n: string;
  d: DeckString;
}

// btoa/atob are Latin-1 only, so round-trip through UTF-8 bytes to keep deck
// names with non-ASCII characters intact.
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDeckCode(deck: DeckCodeDeck): string {
  const payload: DeckCodePayload = {
    v: 1,
    c: deck.hero.class,
    n: deck.name.slice(0, MAX_NAME_LENGTH),
    d: deck.deckString,
  };
  return PREFIX + toBase64(JSON.stringify(payload));
}

/**
 * Decode a deck code, or return null if `raw` isn't one.
 *
 * Every failure path returns null rather than throwing — callers are usually
 * asking "is this clipboard text a deck?", where invalid is the common case.
 * A decoded deck is guaranteed legal: real collectible cards, all playable by
 * that class, within copy limits, and no larger than a full deck.
 */
export function decodeDeckCode(raw: string): DeckCodeDeck | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed.startsWith(PREFIX)) return null;

  let payload: DeckCodePayload;
  try {
    payload = JSON.parse(fromBase64(trimmed.slice(PREFIX.length)));
  } catch {
    return null;
  }

  if (!payload || payload.v !== 1) return null;
  if (typeof payload.c !== "string") return null;
  if (!payload.d || typeof payload.d !== "object") return null;

  const hero = heros.find((candidate) => candidate.class === payload.c);
  if (!hero) return null;

  const deckString: DeckString = {};
  for (const [key, count] of Object.entries(payload.d)) {
    const template: CardTemplate | undefined =
      cardTemplates[key as CardTemplateKey];
    if (!template) return null;
    if (template.isUncollectible === true) return null;
    if (template.class !== hero.class && template.class !== "Neutral") {
      return null;
    }
    if (!Number.isInteger(count) || count < 1) return null;
    if (count > maxCopies(template)) return null;

    deckString[key as CardTemplateKey] = count;
  }

  const total = countCards(deckString);
  if (total < 1 || total > DECK_SIZE) return null;

  const name = typeof payload.n === "string" ? payload.n.trim() : "";

  return {
    name: name.slice(0, MAX_NAME_LENGTH) || `${hero.class} Deck`,
    hero,
    deckString,
  };
}

/** True if `raw` is a deck code this build can read. */
export function isDeckCode(raw: string): boolean {
  return decodeDeckCode(raw) !== null;
}
