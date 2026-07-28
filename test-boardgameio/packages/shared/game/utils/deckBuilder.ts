import {
  cardTemplates,
  type CardTemplate,
  type CardTemplateKey,
} from "../data/cards";
import type { DeckString } from "../types";

/**
 * Heuristics for filling a deck out to a full 30 cards.
 *
 * Used by the collection manager's "Complete Deck" and "Generate Deck" buttons.
 * Kept pure and free of React so it can be unit tested against the real card
 * pool — the pools are small and lopsided (Hunter has 19 class cards, Mage has
 * 4 class minions), so the fallback paths matter as much as the happy one.
 */

export const DECK_SIZE = 30;

/** Mana buckets, matching the collection manager's filter row. 7 means "7+". */
export type ManaBucket = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Roughly the curve a midrange Hearthstone deck wants: front-loaded, thinning
 * out at the top. Sums to DECK_SIZE.
 */
const TARGET_CURVE: Record<ManaBucket, number> = {
  0: 1,
  1: 4,
  2: 6,
  3: 6,
  4: 5,
  5: 4,
  6: 2,
  7: 2,
};

/** Decks play better with a solid board presence than with a pile of spells. */
const TARGET_MINION_RATIO = 0.6;
/** Class cards are what makes a deck feel like that class. */
const TARGET_CLASS_RATIO = 0.6;

export interface CompleteDeckOptions {
  /** Total cards to fill to. Defaults to DECK_SIZE. */
  size?: number;
  /** Injectable RNG so tests can be deterministic. Defaults to Math.random. */
  random?: () => number;
}

type Template = CardTemplate;

export function manaBucket(mana: number | undefined): ManaBucket {
  const cost = mana ?? 0;
  if (cost >= 7) return 7;
  return Math.max(0, cost) as ManaBucket;
}

export function maxCopies(template: Template): number {
  return template.rarity === "Legendary" ? 1 : 2;
}

function isMinion(template: Template): boolean {
  return template.isMinion === true;
}

export function countCards(deck: DeckString): number {
  return Object.values(deck).reduce((sum, count) => sum + (count ?? 0), 0);
}

/**
 * Every collectible card a hero of `heroClass` is allowed to run.
 * Sorted by key so the candidate order is stable before shuffling.
 */
export function cardPoolForClass(
  heroClass: string,
): [CardTemplateKey, Template][] {
  return (Object.entries(cardTemplates) as [CardTemplateKey, Template][])
    .filter(([, card]) => card.isUncollectible !== true)
    .filter(([, card]) => card.class === heroClass || card.class === "Neutral")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Fisher-Yates against an injectable RNG. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface DeckStats {
  total: number;
  minions: number;
  classCards: number;
  curve: Record<ManaBucket, number>;
}

function statsFor(deck: DeckString, heroClass: string): DeckStats {
  const curve: Record<ManaBucket, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let total = 0;
  let minions = 0;
  let classCards = 0;

  for (const [key, count] of Object.entries(deck) as [CardTemplateKey, number][]) {
    const template = cardTemplates[key];
    if (!template || !count) continue;
    total += count;
    curve[manaBucket(template.baseMana)] += count;
    if (isMinion(template)) minions += count;
    if (template.class === heroClass) classCards += count;
  }

  return { total, minions, classCards, curve };
}

/**
 * Score how badly the deck still wants this card. Higher is better.
 *
 * Each term is the shortfall against a target, so a card that fixes the most
 * under-served axis wins. Curve is weighted hardest — a deck with the right
 * minion ratio but no 2-drops is much worse than the reverse.
 */
function scoreCandidate(
  template: Template,
  stats: DeckStats,
  heroClass: string,
  remaining: number,
  size: number,
): number {
  const bucket = manaBucket(template.baseMana);

  // How many cards this bucket is still short of its target.
  const curveDeficit = TARGET_CURVE[bucket] - stats.curve[bucket];

  const minionTarget = size * TARGET_MINION_RATIO;
  const minionDeficit = minionTarget - stats.minions;
  // Only reward the type we're short on; adding a spell to a spell-heavy deck
  // shouldn't score the same as adding the minion it actually needs.
  const typeScore = isMinion(template)
    ? Math.max(0, minionDeficit)
    : Math.max(0, remaining - Math.max(0, minionDeficit));

  const classTarget = size * TARGET_CLASS_RATIO;
  const classDeficit = classTarget - stats.classCards;
  const classScore =
    template.class === heroClass
      ? Math.max(0, classDeficit)
      : Math.max(0, remaining - Math.max(0, classDeficit));

  // The 7+ bucket lumps a 7-drop in with 20-mana Molten Giant. Without this,
  // the giants look like ordinary top-end and get picked constantly. Their
  // costs only come down under conditions an auto-built deck can't rely on.
  const excessCost = Math.max(0, (template.baseMana ?? 0) - 8);

  return curveDeficit * 3 + typeScore * 1.5 + classScore - excessCost * 0.5;
}

/**
 * Fill `deck` up to `size` cards, choosing cards that move it toward a balanced
 * mana curve, a healthy minion/spell split, and a class-flavoured list.
 *
 * Cards already in the deck are never removed, and copy limits are respected,
 * so this is safe to call on a partially built deck. If the class pool is too
 * small to reach `size` (it never is today, with 152 neutrals) it returns the
 * fullest deck it could build rather than looping forever.
 */
export function completeDeck(
  deck: DeckString,
  heroClass: string,
  options: CompleteDeckOptions = {},
): DeckString {
  const { size = DECK_SIZE, random = Math.random } = options;

  const result: DeckString = { ...deck };
  // Shuffle first so equal-scoring candidates vary between presses.
  const pool = shuffle(cardPoolForClass(heroClass), random);

  let stats = statsFor(result, heroClass);

  while (stats.total < size) {
    const remaining = size - stats.total;

    let best: { key: CardTemplateKey; template: Template; score: number } | null =
      null;

    for (const [key, template] of pool) {
      const current = result[key] ?? 0;
      if (current >= maxCopies(template)) continue;

      const score = scoreCandidate(template, stats, heroClass, remaining, size);
      if (!best || score > best.score) best = { key, template, score };
    }

    // Pool exhausted — every legal card is already at max copies.
    if (!best) break;

    result[best.key] = (result[best.key] ?? 0) + 1;
    stats = statsFor(result, heroClass);
  }

  return result;
}

/** Build a whole deck from scratch using the same balancing rules. */
export function generateDeck(
  heroClass: string,
  options: CompleteDeckOptions = {},
): DeckString {
  return completeDeck({}, heroClass, options);
}
