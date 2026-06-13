import type { Card, GameState } from "@/types";
import { cardTemplates, type CardTemplateKey } from "./cards";
import type { DeckString } from "./decks";

export function shuffleDeck(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// cardFactory.ts

export function createCardInstance(template: Omit<Card, "id">): Card {
  return {
    ...template,
    id: self.crypto.randomUUID(),
    maxAttack: template.attack,
    maxHealth: template.health,
    hasAttacked: false,
  };
}

export function createDeck(count: number): Card[] {
  const deck: Card[] = [];
  while (deck.length < count) {
    // Randomly select a card template
    const card = Object.values(cardTemplates)[
      Math.floor(Math.random() * Object.keys(cardTemplates).length)
    ] as Omit<Card, "id">;
    if (card.isUncollectible) {
      continue; // Skip adding this card if it is uncollectible
    }
    // check if there are already 2 copies of this card in the deck
    const existingCount = deck.filter((c) => c.title === card.title).length;
    if (existingCount >= 2) {
      continue; // Skip adding this card if there are already 2 copies
    }
    // Create a card instance from the template
    deck.push(createCardInstance(card));
  }
  return shuffleDeck(deck);
}

export function createCardFromID(id: CardTemplateKey): Card | null {
  const cardTemplate = cardTemplates[id];
  if (!cardTemplate) {
    console.warn(`Card template with ID ${id} not found.`);
    return null;
  }
  return createCardInstance(cardTemplate);
}

export function createRandomDeckString(count: number): DeckString {
  const deckString: DeckString = {};
  const cardKeys = Object.keys(cardTemplates) as CardTemplateKey[];

  let totalCards = 0;

  while (totalCards < count) {
    // Randomly select a card template key
    const randomKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
    const card = cardTemplates[randomKey] as Omit<Card, "id">;

    if (card.isUncollectible) {
      continue; // Skip uncollectible cards
    }

    // Check if there are already 2 copies of this card
    const currentCount = deckString[randomKey] || 0;
    if (currentCount >= 2) {
      continue; // Skip if already 2 copies
    }

    // Add the card to the deck string
    deckString[randomKey] = currentCount + 1;
    totalCards++;
  }

  return deckString;
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
