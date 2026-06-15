import { create } from "zustand";
import {
  createCardFromID,
  shuffleDeck,
  premadeDecks,
  type Card,
  type SavedDeck,
  type CardTemplateKey,
} from "@project/shared";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

// Configuration: Set to true to filter cards by hero class + neutral when building decks
export const FILTER_BY_CLASS_WHEN_BUILDING = false;

// LocalStorage key for user decks
const USER_DECKS_KEY = "hearthstone_user_decks";

// Helper functions for localStorage
function loadUserDecks(): SavedDeck[] {
  try {
    const stored = localStorage.getItem(USER_DECKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load user decks from localStorage:", error);
    return [];
  }
}

function saveUserDecksToStorage(decks: SavedDeck[]): void {
  try {
    localStorage.setItem(USER_DECKS_KEY, JSON.stringify(decks));
  } catch (error) {
    console.error("Failed to save user decks to localStorage:", error);
  }
}

interface DeckState {
  // Player's deck selection (Player 0)
  playerDeck: DeckString;

  // Opponent's deck (Player 1) - generated when ready
  opponentDeck: Card[] | null;

  // Whether decks are ready to start game
  isDeckReady: boolean;

  // User's custom decks (persisted to localStorage)
  userDecks: SavedDeck[];

  // Currently selected deck for playing
  selectedDeckForPlay: SavedDeck | null;

  // Actions
  setPlayerDeck: (deck: DeckString) => void;
  generateOpponentDeck: () => void;
  clearDecks: () => void;
  setReady: (ready: boolean) => void;

  // User deck management
  saveUserDeck: (deck: SavedDeck) => void;
  deleteUserDeck: (id: string) => void;
  updateUserDeck: (id: string, updates: Partial<SavedDeck>) => void;
  getAllDecks: () => SavedDeck[];
  selectDeckForPlay: (deck: SavedDeck) => void;
  clearSelectedDeck: () => void;
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
  userDecks: loadUserDecks(),
  selectedDeckForPlay: null,

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

  saveUserDeck: (deck: SavedDeck) => {
    const state = get();
    // Check if deck with this ID already exists (update) or is new (add)
    const existingIndex = state.userDecks.findIndex((d) => d.id === deck.id);

    let updatedDecks: SavedDeck[];
    if (existingIndex >= 0) {
      // Update existing deck
      updatedDecks = [...state.userDecks];
      updatedDecks[existingIndex] = deck;
    } else {
      // Add new deck
      updatedDecks = [...state.userDecks, deck];
    }

    saveUserDecksToStorage(updatedDecks);
    set({ userDecks: updatedDecks });
  },

  deleteUserDeck: (id: string) => {
    const state = get();
    const updatedDecks = state.userDecks.filter((deck) => deck.id !== id);
    saveUserDecksToStorage(updatedDecks);
    set({ userDecks: updatedDecks });
  },

  updateUserDeck: (id: string, updates: Partial<SavedDeck>) => {
    const state = get();
    const updatedDecks = state.userDecks.map((deck) =>
      deck.id === id ? { ...deck, ...updates } : deck,
    );
    saveUserDecksToStorage(updatedDecks);
    set({ userDecks: updatedDecks });
  },

  getAllDecks: () => {
    const state = get();
    // Convert premade decks to SavedDeck format and combine with user decks
    const premadeAsSaved: SavedDeck[] = premadeDecks.map((deck) => ({
      id: `premade-${deck.name.toLowerCase()}`,
      name: deck.name,
      hero: deck.hero,
      deckString: deck.deckString,
    }));
    return [...premadeAsSaved, ...state.userDecks];
  },

  selectDeckForPlay: (deck: SavedDeck) => {
    set({ selectedDeckForPlay: deck });
  },

  clearSelectedDeck: () => {
    set({ selectedDeckForPlay: null });
  },
}));
