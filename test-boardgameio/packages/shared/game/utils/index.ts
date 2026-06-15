import type { Card, GameState } from "../types";
import { cardTemplates, type CardTemplateKey } from "../data/cards";

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
  template: Omit<Card, "id" | "originalID">,
  originalID: string,
): Card {
  return {
    ...template,
    id: randomIDGen(),
    maxAttack: template.attack,
    maxHealth: template.health,
    hasAttacked: false,
    originalID: originalID,
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

export function hasToEndTurn(playedID: string, gameState: GameState): boolean {
  // check if the player can play any cards, and check if any minnions can attack, some cards have 0 mana cost so we have to check for that as well
  const player = gameState.players[playedID];
  const canPlayCards = player.hand.some(
    (card) => card.mana !== null && card.mana <= player.mana,
  );
  const canAttack = gameState.board[playedID].some(
    (card) => !card.summoningSickness && !card.hasAttacked && !card.frozen,
  );
  return !canPlayCards && !canAttack;
}
