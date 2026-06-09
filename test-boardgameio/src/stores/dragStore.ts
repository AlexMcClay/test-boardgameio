// stores/dragStore.ts
import { create } from "zustand";
import type { Card } from "@/types";
import type { PlayerID } from "boardgame.io";

type DragStore = {
  activeCard: Card | null;
  currentPlayer: PlayerID | null;
  setActiveCard: (card: Card | null) => void;
  setCurrentPlayer: (player: PlayerID) => void;
  isValidTarget: (targetType: string, playerID: PlayerID) => boolean;
};

export const useDragStore = create<DragStore>((set, get) => ({
  activeCard: null,
  currentPlayer: null,

  setActiveCard: (card) => set({ activeCard: card }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  isValidTarget: (targetType, playerID) => {
    const { activeCard, currentPlayer } = get();
    if (!activeCard || !currentPlayer) return false;

    const isFriendly = playerID === currentPlayer;
    const isOpponent = playerID !== currentPlayer;

    if (!activeCard.isPlaced && activeCard.isMinnion) {
      return false;
    }

    return activeCard.targets.some((validTarget) => {
      switch (validTarget) {
        case "card":
          return targetType === "card";
        case "player":
          return targetType === "player";
        case "card-friendly":
          return targetType === "card" && isFriendly;
        case "card-opponent":
          return targetType === "card" && isOpponent;
        case "player-friendly":
          return targetType === "player" && isFriendly;
        case "player-opponent":
          return targetType === "player" && isOpponent;
        case "lane-friendly":
          return targetType === "lane" && isFriendly;
        case "lane-opponent":
          return targetType === "lane" && isOpponent;
        default:
          return false;
      }
    });
  },
}));
