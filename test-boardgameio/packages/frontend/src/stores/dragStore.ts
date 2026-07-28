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

type TargetingMode =
  | "attack"
  | "battlecry"
  | "hero-power"
  | "hero-attack"
  // Aiming a Choose One half that was picked in the ChoiceOverlay. The option
  // card is the activeCard; choiceOptionIndex is what the move needs.
  | "choice"
  | null;

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

  // Extensible targeting system
  targetingMode: TargetingMode;
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
      choiceOptionIndex: null,
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
