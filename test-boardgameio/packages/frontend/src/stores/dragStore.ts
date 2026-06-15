// stores/dragStore.ts
import { create } from "zustand";
import type { PlayerID } from "boardgame.io";
import { canTargetHighlight, type Card, type GameState } from "@project/shared";

type DragStore = {
  activeCard: Card | null;
  currentPlayer: PlayerID | null;
  gameState: GameState | null;
  setActiveCard: (card: Card | null) => void;
  setCurrentPlayer: (player: PlayerID) => void;
  setGameState: (gameState: GameState) => void;
  isValidTarget: (
    targetType: "card" | "player" | "lane",
    playerID: PlayerID,
    targetCardId?: string,
  ) => boolean;

  // Attack arrow state
  attackingCardId: string | null;
  attackOrigin: { x: number; y: number } | null;
  cursorPosition: { x: number; y: number } | null;
  startAttack: (
    cardId: string,
    origin: { x: number; y: number },
    card: Card,
  ) => void;
  updateAttackCursor: (position: { x: number; y: number }) => void;
  endAttack: () => void;
};

export const useDragStore = create<DragStore>((set, get) => ({
  activeCard: null,
  currentPlayer: null,
  gameState: null,

  setActiveCard: (card) => set({ activeCard: card }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setGameState: (gameState) => set({ gameState }),

  isValidTarget: (targetType, playerID, targetCardId) => {
    const { activeCard, currentPlayer, gameState } = get();
    return canTargetHighlight(
      activeCard,
      currentPlayer,
      targetType,
      playerID,
      gameState,
      targetCardId,
    );
  },

  // Attack arrow state
  attackingCardId: null,
  attackOrigin: null,
  cursorPosition: null,

  startAttack: (cardId, origin, card) => {
    set({
      attackingCardId: cardId,
      attackOrigin: origin,
      cursorPosition: origin,
      activeCard: card, // Set activeCard for validation and highlighting
    });
  },

  updateAttackCursor: (position) => {
    set({ cursorPosition: position });
  },

  endAttack: () => {
    set({
      attackingCardId: null,
      attackOrigin: null,
      cursorPosition: null,
      activeCard: null, // Clear activeCard when attack ends
    });
  },
}));
