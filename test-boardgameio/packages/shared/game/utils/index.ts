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
    id: self.crypto.randomUUID(),
    maxAttack: template.attack,
    maxHealth: template.health,
    hasAttacked: false,
    originalID: originalID,
  };
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
