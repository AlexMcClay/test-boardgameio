// stores/dragStore.ts
import { create } from "zustand";
import type { Card, GameState } from "@/types";
import type { PlayerID } from "boardgame.io";
import { canTargetHighlight } from "@/utils/validateMove";

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
}));
