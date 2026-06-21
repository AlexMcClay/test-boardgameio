// stores/dragStore.ts
import { create } from "zustand";
import type { PlayerID } from "boardgame.io";
import {
  canTargetHighlight,
  type Card,
  type GameState,
  type TargetValue,
  type EffectContextWithOptionalCard,
} from "@project/shared";

type TargetingMode = "attack" | "battlecry" | "hero-power" | null;

type DragStore = {
  activeCard: Card | null;
  currentPlayer: PlayerID | null;
  gameState: GameState | null;
  hoveredTarget: {
    type: "card" | "player" | null;
    id: string | null;
  } | null;
  setActiveCard: (card: Card | null) => void;
  setCurrentPlayer: (player: PlayerID) => void;
  setGameState: (gameState: GameState) => void;
  isValidTarget: (
    target: TargetValue,
    context: EffectContextWithOptionalCard,
  ) => boolean;

  // Extensible targeting system
  targetingMode: TargetingMode;
  targetingCardId: string | null;
  targetingOrigin: { x: number; y: number } | null;
  cursorPosition: { x: number; y: number } | null;

  startTargeting: (
    mode: TargetingMode,
    cardId: string,
    origin: { x: number; y: number },
    card: Card,
  ) => void;
  updateTargetingCursor: (position: { x: number; y: number }) => void;
  endTargeting: () => void;

  // Backward compatibility - Attack arrow state
  get attackingCardId(): string | null;
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
  hoveredTarget: null,

  setActiveCard: (card) => set({ activeCard: card }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setGameState: (gameState) => set({ gameState }),

  isValidTarget: (target, context) => {
    const { activeCard } = get();
    return canTargetHighlight(activeCard, { ...context, target: target });
  },

  // Extensible targeting system
  targetingMode: null,
  targetingCardId: null,
  targetingOrigin: null,
  cursorPosition: null,

  startTargeting: (mode, cardId, origin, card) => {
    set({
      targetingMode: mode,
      targetingCardId: cardId,
      targetingOrigin: origin,
      cursorPosition: origin,
      activeCard: card,
    });
  },

  updateTargetingCursor: (position) => {
    set({ cursorPosition: position });
  },

  endTargeting: () => {
    set({
      targetingMode: null,
      targetingCardId: null,
      targetingOrigin: null,
      cursorPosition: null,
      activeCard: null,
    });
  },

  // Backward compatibility getters and methods
  get attackingCardId() {
    const state = get();
    return state.targetingMode === "attack" ? state.targetingCardId : null;
  },

  startAttack: (cardId, origin, card) => {
    get().startTargeting("attack", cardId, origin, card);
  },

  updateAttackCursor: (position) => {
    get().updateTargetingCursor(position);
  },

  endAttack: () => {
    get().endTargeting();
  },
}));
