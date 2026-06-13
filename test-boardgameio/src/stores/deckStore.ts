import { create } from "zustand";
import type { CardTemplateKey } from "@/utils/cards";
import type { Card } from "@/types";
import { createCardFromID, shuffleDeck } from "@/utils";
import { premadeDecks } from "@/utils/decks";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

interface DeckState {
  // Player's deck selection (Player 0)
  playerDeck: DeckString;

  // Opponent's deck (Player 1) - generated when ready
  opponentDeck: Card[] | null;

  // Whether decks are ready to start game
  isDeckReady: boolean;

  // Actions
  setPlayerDeck: (deck: DeckString) => void;
  generateOpponentDeck: () => void;
  clearDecks: () => void;
  setReady: (ready: boolean) => void;
}

// Helper function to create a deck from a deck string
function createDeckFromDeckString(deckString: DeckString): Card[] {
  const deck: Card[] = [];
  for (const cardId in deckString) {
    const count = deckString[cardId as CardTemplateKey];
    if (count) {
      for (let i = 0; i < count; i++) {
        const card = createCardFromID(cardId as CardTemplateKey);
        if (card) {
          deck.push(card);
        } else {
          console.warn(`Card with ID ${cardId} not found.`);
        }
      }
    }
  }
  return deck;
}

// Helper function to pick a random premade deck
function getRandomPremadeDeck(): DeckString {
  const randomDeck =
    premadeDecks[Math.floor(Math.random() * premadeDecks.length)];
  return randomDeck.deckString;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  playerDeck: {},
  opponentDeck: null,
  isDeckReady: false,

  setPlayerDeck: (deck: DeckString) => {
    set({ playerDeck: deck });
  },

  generateOpponentDeck: () => {
    // Generate a random premade deck for the opponent
    const opponentDeckString = getRandomPremadeDeck();
    const opponentDeckCards = createDeckFromDeckString(opponentDeckString);
    const shuffledOpponentDeck = shuffleDeck(opponentDeckCards);

    set({
      opponentDeck: shuffledOpponentDeck,
      isDeckReady: true,
    });
  },

  clearDecks: () => {
    set({
      playerDeck: {},
      opponentDeck: null,
      isDeckReady: false,
    });
  },

  setReady: (ready: boolean) => {
    set({ isDeckReady: ready });
  },
}));
