// stores/dragStore.ts
import { create } from "zustand";
import type { PlayerID } from "@project/shared";
import {
  canTargetHighlight,
  validateTargetQuery,
  type Card,
  type GameState,
  type TargetValue,
  type EffectContextWithOptionalCard,
} from "@project/shared";
// One-way import: targetingModes owns the mode union and must never import
// from stores/, or the two files form a cycle.
import type { TargetingMode } from "@/game/targetingModes";

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

  // Live pointer tracking during a dnd-kit drag (used to compute board insertion index)
  dragPointerPosition: { x: number; y: number } | null;
  setDragPointerPosition: (position: { x: number; y: number } | null) => void;

  // Board insertion index preview, published by the Lane currently under the pointer
  hoverBoardIndex: number | null;
  hoverBoardLane: PlayerID | null;
  setHoverBoard: (index: number | null, lane: PlayerID | null) => void;
  clearHoverBoard: () => void;

  // Extensible targeting system. All pointer handling for these lives in
  // components/Targeting/TargetingLayer.tsx; the per-mode resolve logic lives
  // in game/targetingModes.ts.
  targetingMode: TargetingMode | null;
  targetingCardId: string | null;
  targetingOrigin: { x: number; y: number } | null;
  cursorPosition: { x: number; y: number } | null;
  /** "choice" mode only: which option of G.pendingChoice is being aimed. */
  choiceOptionIndex: number | null;

  startTargeting: (
    mode: TargetingMode,
    cardId: string,
    origin: { x: number; y: number },
    card: Card,
    choiceOptionIndex?: number,
  ) => void;
  endTargeting: () => void;
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
    const { activeCard, targetingMode } = get();
    // A Choose One half isn't in any zone the normal highlight rules know
    // about (it's neither in hand nor on the board), so validate it directly
    // against its own targetQuery instead of going through canTargetHighlight.
    if (targetingMode === "choice" && activeCard?.targetQuery) {
      return validateTargetQuery(
        activeCard.targetQuery,
        { ...context, card: activeCard, target },
        activeCard.id,
      );
    }
    return canTargetHighlight(activeCard, { ...context, target: target });
  },

  dragPointerPosition: null,
  setDragPointerPosition: (position) => set({ dragPointerPosition: position }),

  hoverBoardIndex: null,
  hoverBoardLane: null,
  setHoverBoard: (index, lane) =>
    set({ hoverBoardIndex: index, hoverBoardLane: lane }),
  clearHoverBoard: () => set({ hoverBoardIndex: null, hoverBoardLane: null }),

  // Extensible targeting system
  targetingMode: null,
  targetingCardId: null,
  targetingOrigin: null,
  cursorPosition: null,
  choiceOptionIndex: null,

  startTargeting: (mode, cardId, origin, card, choiceOptionIndex) => {
    set({
      targetingMode: mode,
      targetingCardId: cardId,
      targetingOrigin: origin,
      cursorPosition: origin,
      activeCard: card,
      choiceOptionIndex: choiceOptionIndex ?? null,
      // Otherwise a hover left over from the previous aim is still published
      // until the first mousemove of this one.
      hoveredTarget: null,
    });
  },

  endTargeting: () => {
    set({
      targetingMode: null,
      targetingCardId: null,
      targetingOrigin: null,
      cursorPosition: null,
      activeCard: null,
      choiceOptionIndex: null,
      hoveredTarget: null,
    });
  },
}));
