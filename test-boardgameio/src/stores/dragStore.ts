// stores/dragStore.ts
import { create } from "zustand";
import type { Card } from "@/types";
import type { PlayerID } from "boardgame.io";
import { canTargetHighlight } from "@/utils/validateMove";

type DragStore = {
  activeCard: Card | null;
  currentPlayer: PlayerID | null;
  setActiveCard: (card: Card | null) => void;
  setCurrentPlayer: (player: PlayerID) => void;
  isValidTarget: (
    targetType: "card" | "player" | "lane",
    playerID: PlayerID,
  ) => boolean;
};

export const useDragStore = create<DragStore>((set, get) => ({
  activeCard: null,
  currentPlayer: null,

  setActiveCard: (card) => set({ activeCard: card }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  isValidTarget: (targetType, playerID) => {
    const { activeCard, currentPlayer } = get();
    return canTargetHighlight(activeCard, currentPlayer, targetType, playerID);
  },
}));
