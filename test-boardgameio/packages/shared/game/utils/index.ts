import type {
  Card,
  CardModifier,
  EffectTypes,
  GameState,
  Player,
} from "../types";
import { cardTemplates, type CardTemplateKey } from "../data/cards";
import { isBaseEffectSelection } from "../..";

export function shuffleDeck(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// cardFactory.ts

export function createCardInstance(
  template: Omit<Card, "id" | "originalID" | "damageTaken" | "attacksLeft">,
  originalID: string,
): Card {
  return {
    ...template,
    id: randomIDGen(),
    attacksLeft: template.windfury ? 2 : 1,
    originalID: originalID,
    damageTaken: 0,
  };
}

export function randomIDGen(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // RFC4122 version 4 UUID
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function createCardFromID(id: CardTemplateKey): Card | null {
  const cardTemplate = cardTemplates[id];
  if (!cardTemplate) {
    console.warn(`Card template with ID ${id} not found.`);
    return null;
  }
  return createCardInstance(cardTemplate, id);
}

export const generateCardsFromDeckstring = (
  deckString: Record<string, number>,
): Card[] => {
  const deck: Card[] = [];
  for (const cardId in deckString) {
    const count = deckString[cardId as CardTemplateKey];
    if (count) {
      for (let i = 0; i < count; i++) {
        const card = createCardFromID(cardId as CardTemplateKey);
        if (card) deck.push(card);
      }
    }
  }
  return shuffleDeck(deck);
};

export function hasToEndTurn(playedID: string, gameState: GameState): boolean {
  // check if the player can play any cards, and check if any minnions can attack, some cards have 0 mana cost so we have to check for that as well
  const player = gameState.players[playedID];
  const canPlayCards = player.hand.some(
    (card) => getManaCost(card) <= player.mana,
  );
  const canAttack = gameState.board[playedID].some(
    (card) => !card.summoningSickness && !card.attacksLeft && !card.frozen,
  );
  const canHeroAttack =
    player.attacksLeft > 0 && !player.frozen && getPlayerAttack(player) > 0;
  return !canPlayCards && !canAttack && !canHeroAttack;
}

/**
 * Folds a stat's modifiers over its base value IN ORDER: an `override` entry
 * replaces the running value, additive entries add to it. Aura and enrage
 * modifiers are applied AFTER all other enchantments (Hearthstone rule), so
 * they stack on top of stat-sets regardless of when the aura appeared.
 */
function foldModifiers(
  base: number,
  modifiers: CardModifier[] | undefined,
  stat: CardModifier["stat"],
): number {
  if (!modifiers || modifiers.length === 0) return base;
  const relevant = modifiers.filter((m) => m.stat === stat);
  if (relevant.length === 0) return base;
  const isOngoing = (m: CardModifier) =>
    m.type === "aura" || m.type === "enrage";
  const ordered = [
    ...relevant.filter((m) => !isOngoing(m)),
    ...relevant.filter(isOngoing),
  ];
  return ordered.reduce(
    (acc, m) => (m.override ? m.value : acc + m.value),
    base,
  );
}

// Get the current attack, combining base values + permanent buffs + environmental auras
export function getAttack(card: Card): number {
  return Math.max(
    0,
    foldModifiers(card?.baseAttack ?? 0, card.modifiers, "attack"),
  );
}

export function getPlayerAttack(player: Player): number {
  const weaponAttack = player.weapon ? getAttack(player.weapon) : 0;
  return Math.max(
    0,
    foldModifiers(
      (player?.baseAttack ?? 0) + weaponAttack,
      player.modifiers,
      "attack",
    ),
  );
}

// Maximum health capacity is dynamically scaled by modifiers
export function getMaxHealth(card: Card): number {
  return Math.max(
    1,
    foldModifiers(card.baseHealth ?? 0, card.modifiers, "health"),
  );
}

export function getMaxDurability(card: Card): number {
  return Math.max(
    1,
    foldModifiers(card.baseDurability ?? 0, card.modifiers, "durability"),
  );
}

// Current actual health is Max Health minus recorded damage
export function getCurrentHealth(card: Card): number {
  const maxHealth = getMaxHealth(card);
  return Math.max(0, maxHealth - (card.damageTaken ?? 0));
}

export function getCurrentDurability(card: Card): number {
  const maxHealth = getMaxDurability(card);
  return Math.max(0, maxHealth - (card.durabilityLost ?? 0));
}

// Dynamic mana cost parsing (e.g., Sorcerer's Apprentice effects)
export function getManaCost(card: Card): number {
  return Math.max(0, foldModifiers(card.baseMana ?? 0, card.modifiers, "mana"));
}

/**
 * Determine if an effect or any of its nested effects require user selection as a target.
 * @param e Effect
 * @returns
 */
export function isUserSelectValue(e: EffectTypes): boolean {
  if (isBaseEffectSelection(e) && e.target === "user-select") {
    return true;
  } else if (e.type === "conditional") {
    return !!(
      e.then.some((ex) => isUserSelectValue(ex)) ||
      e.else?.some((ex) => isUserSelectValue(ex))
    );
  } else if (e.type === "sequence") {
    return !!e.steps.some((ex) => isUserSelectValue(ex));
  }
  return false;
}

export * from "./helpers";
