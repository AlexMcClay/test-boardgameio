import type { GameState } from "@project/shared";
import { useEffect } from "react";
import { useDragStore } from "@/stores/dragStore";
import type { GameMoves } from "@/types/gameProps";

interface Props {
  G: GameState;
  moves: GameMoves;
}

/**
 * Keyboard cancellation for the two prompts that can gate the game.
 *
 * Aiming itself is handled by components/Targeting/TargetingLayer.tsx. This
 * stays separate because ESC must work when there is no active aim at all —
 * the Choose One overlay is up, or a battlecry is pending and the player
 * hasn't grabbed the arrow yet — which is outside that layer's remit.
 */
export const useGameTargeting = ({ G, moves }: Props) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (G.activeBattlecryMinion) {
        console.log("Canceling battlecry with ESC");
        moves.cancelBattlecry();
        return;
      }
      if (G.pendingChoice?.kind === "chooseOne") {
        console.log("Canceling choose one with ESC");
        useDragStore.getState().endTargeting();
        moves.cancelChoice();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [G.activeBattlecryMinion, G.pendingChoice, moves]);
};
