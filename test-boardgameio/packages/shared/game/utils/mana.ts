import type { ManaPayment, Player } from "../types";

export type { ManaPayment };

/**
 * Mana crystal rules, per Hearthstone.
 *
 * A player's mana is five counters, not a list of crystal objects — every
 * crystal state is exactly recoverable from them:
 *
 *   filled       index < availableMana          (of the permanent run)
 *   empty        index >= availableMana
 *   locked       index >= maxMana - overloadLocked
 *   pending-lock index >= maxMana - overloadPending
 *   temporary    the tempMana crystals drawn after the permanent run
 *
 * The rules this module encodes:
 *  - Temporary crystals (The Coin, Innervate) last for the turn, are spent
 *    FIRST, and vanish when spent rather than becoming empty. They may push
 *    the total above the cap, so 11/10 is legal.
 *  - Permanent crystals can be granted empty (Wild Growth) or filled.
 *  - Destruction (Felguard) eats EMPTY crystals first, and only costs you
 *    available mana when it is forced to take a filled one.
 *  - Overload has no ceiling, so availableMana may legitimately go NEGATIVE:
 *    excess overload counters later mana generation. Displays clamp at 0,
 *    which is what getSpendableMana is for.
 */

export const DEFAULT_MANA_CAP = 10;
export const MANA_HARD_CAP = 99;

/** Mana the player can actually spend right now. Never negative. */
export function getSpendableMana(p: Player): number {
  return Math.max(0, p.availableMana + p.tempMana);
}

/**
 * The "/N" side of the readout: maximum mana, i.e. permanent crystals only.
 * Temporary crystals deliberately aren't counted, so a Coin at ten crystals
 * reads 11/10 — available mana above the maximum is the whole point.
 */
export function getDisplayMaxMana(p: Player): number {
  return p.maxMana;
}

export function canAfford(p: Player, cost: number): boolean {
  return getSpendableMana(p) >= cost;
}

export const NO_MANA_PAYMENT: ManaPayment = { temp: 0, permanent: 0 };

/** Spends `amount`, temporary crystals first (they vanish, not empty). */
export function spendMana(p: Player, amount: number): ManaPayment {
  const cost = Math.max(0, amount);
  const temp = Math.min(p.tempMana, cost);
  p.tempMana -= temp;
  const permanent = cost - temp;
  p.availableMana -= permanent;
  return { temp, permanent };
}

/** Exact inverse of spendMana — used when a battlecry is cancelled. */
export function refundMana(p: Player, payment: ManaPayment): void {
  p.tempMana += payment.temp;
  p.availableMana += payment.permanent;
}

/** The Coin / Innervate: usable this turn only, may exceed the cap. */
export function gainTempMana(p: Player, amount: number): void {
  p.tempMana = Math.max(0, p.tempMana + amount);
}

/**
 * Grants permanent crystals, empty by default (Wild Growth). Returns how many
 * were actually granted once the cap is applied.
 */
export function gainManaCrystals(
  p: Player,
  count: number,
  filled = false,
): number {
  const cap = Math.min(p.manaCap, MANA_HARD_CAP);
  const granted = Math.max(0, Math.min(count, cap - p.maxMana));
  p.maxMana += granted;
  if (filled) p.availableMana += granted;
  return granted;
}

/**
 * Felguard: destroys permanent crystals, empty ones first. Available mana only
 * drops when there weren't enough empty crystals to absorb the loss.
 */
export function destroyManaCrystals(
  p: Player,
  count: number,
): { destroyed: number; filledDestroyed: number } {
  const destroyed = Math.max(0, Math.min(count, p.maxMana));
  const filled = Math.max(0, Math.min(p.availableMana, p.maxMana));
  const empty = p.maxMana - filled;
  const filledDestroyed = Math.max(0, destroyed - empty);

  p.maxMana -= destroyed;
  p.availableMana = Math.max(0, p.availableMana - filledDestroyed);
  // Don't strand a padlock on a crystal that no longer exists.
  p.overloadLocked = Math.min(p.overloadLocked, p.maxMana);
  p.overloadPending = Math.min(p.overloadPending, p.maxMana);

  return { destroyed, filledDestroyed };
}

/**
 * Start of turn: gain a crystal, promote last turn's pending overload into
 * this turn's lock, refill everything that isn't locked, and drop any leftover
 * temporary crystals.
 */
export function refillManaAtTurnStart(p: Player): void {
  p.maxMana = Math.min(p.maxMana + 1, Math.min(p.manaCap, MANA_HARD_CAP));
  p.overloadLocked = p.overloadPending ?? 0;
  p.overloadPending = 0;
  // May go negative when overload exceeds the crystals available to pay it —
  // the excess correctly eats into mana generated later this turn.
  p.availableMana = p.maxMana - p.overloadLocked;
  p.tempMana = 0;
}

export function applyOverload(p: Player, amount: number): void {
  p.overloadPending += Math.max(0, amount);
}

/** Lava Shock: unlock (and refill) overloaded crystals. Returns how many. */
export function unlockOverload(
  p: Player,
  scope: "locked" | "pending" | "both" = "locked",
): number {
  let unlocked = 0;
  if (scope === "locked" || scope === "both") {
    unlocked += p.overloadLocked;
    p.availableMana = Math.min(p.maxMana, p.availableMana + p.overloadLocked);
    p.overloadLocked = 0;
  }
  if (scope === "pending" || scope === "both") {
    unlocked += p.overloadPending;
    p.overloadPending = 0;
  }
  return unlocked;
}

/** Raises (or lowers) the ceiling on permanent crystals — Wildheart Guff. */
export function raiseManaCap(p: Player, delta: number): void {
  p.manaCap = Math.max(0, Math.min(p.manaCap + delta, MANA_HARD_CAP));
}
