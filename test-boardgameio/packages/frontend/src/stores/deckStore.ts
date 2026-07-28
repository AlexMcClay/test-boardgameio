import { create } from "zustand";
import {
  starterDecks,
  STARTER_DECK_SEED_VERSION,
  type DeckString,
  type SavedDeck,
} from "@project/shared";

// Configuration: Set to true to filter cards by hero class + neutral when building decks
export const FILTER_BY_CLASS_WHEN_BUILDING = true;

// LocalStorage key for user decks
const USER_DECKS_KEY = "hearthstone_user_decks";
// Which generation of starter decks this player has already been given. Kept
// separate from USER_DECKS_KEY so seeding can add to an existing collection
// rather than orphaning it behind a new key.
const STARTER_SEED_KEY = "hearthstone_starter_seed_version";

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

/** Copy a starter deck so callers can never mutate the shared constant. */
function cloneDeck(deck: SavedDeck): SavedDeck {
  return { ...deck, deckString: { ...deck.deckString } };
}

/**
 * Load the player's decks, giving them the starter decks the first time round.
 *
 * Seeding is keyed on the seed version, not on the decks key being empty:
 * players from before starter decks existed already have a populated
 * USER_DECKS_KEY, and they still need the starters — otherwise anyone who never
 * built a deck of their own would end up with an empty collection and no way to
 * start a game. Starters the player has since deleted stay deleted, because the
 * version has already been recorded.
 */
function loadOrSeedUserDecks(): SavedDeck[] {
  const existing = loadUserDecks();

  let seededVersion = 0;
  try {
    seededVersion = Number(localStorage.getItem(STARTER_SEED_KEY)) || 0;
  } catch (error) {
    console.error("Failed to read starter deck seed version:", error);
  }
  if (seededVersion >= STARTER_DECK_SEED_VERSION) return existing;

  const existingIds = new Set(existing.map((deck) => deck.id));
  const missing = starterDecks
    .filter((deck) => !existingIds.has(deck.id))
    .map(cloneDeck);
  const seeded = missing.length ? [...missing, ...existing] : existing;

  if (missing.length) saveUserDecksToStorage(seeded);
  try {
    localStorage.setItem(STARTER_SEED_KEY, String(STARTER_DECK_SEED_VERSION));
  } catch (error) {
    console.error("Failed to record starter deck seed version:", error);
  }

  return seeded;
}

interface DeckState {
  // Player's deck selection (Player 0)
  playerDeck: DeckString;

  // Opponent's deck (Player 1) - generated when ready
  opponentDeck: SavedDeck | null;

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

export const useDeckStore = create<DeckState>((set, get) => ({
  playerDeck: {},
  opponentDeck: null,
  isDeckReady: false,
  userDecks: loadOrSeedUserDecks(),
  selectedDeckForPlay: null,

  setPlayerDeck: (deck: DeckString) => {
    set({ playerDeck: deck });
  },

  generateOpponentDeck: () => {
    // Opponents always play a starter deck. Drawn from the static list rather
    // than the player's collection so it stays valid whatever they edit.
    const randomDeck =
      starterDecks[Math.floor(Math.random() * starterDecks.length)];

    set({
      opponentDeck: cloneDeck(randomDeck),
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

  getAllDecks: () => get().userDecks,

  selectDeckForPlay: (deck: SavedDeck) => {
    set({ selectedDeckForPlay: deck });
  },

  clearSelectedDeck: () => {
    set({ selectedDeckForPlay: null });
  },
}));
