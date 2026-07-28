// The ONE pointer handler for every targeting mode.
//
// Aiming is the same state machine whatever you're aiming — track the cursor,
// hit-test what's under it, publish hoveredTarget, resolve on mouse-up. Only
// the resolve step differs per mode, and that lives in game/targetingModes.ts.
// This used to be four near-identical copies (one per component that could
// start an aim), each dispatching a CustomEvent that useGameTargeting caught.
//
// Being board-level rather than per-source also fixes two things by
// construction:
//   - the source component unmounting mid-aim (a minion dying to an opponent
//     trigger) no longer strands the arrow with nothing listening for mouseup
//   - HeroSection/HeroPower render for BOTH seats, so their mode-gated
//     listeners used to fire twice per gesture and send the move twice
import { useEffect, useRef } from "react";
import type { GameCtx, GameState } from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import { useDragStore } from "@/stores/dragStore";
import { targetAtPoint } from "@/utils/targeting";
import { TARGETING_MODES, toTargetValue } from "@/game/targetingModes";

interface Props {
  G: GameState;
  ctx: GameCtx;
  moves: GameMoves;
}

const TargetingLayer = ({ G, ctx, moves }: Props) => {
  const latest = useRef({ G, ctx, moves });
  useEffect(() => {
    latest.current = { G, ctx, moves };
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!useDragStore.getState().targetingMode) return;

      // Heroes by geometry, cards by elementFromPoint — see utils/targeting.
      const { targetPlayerId, targetCardId } = targetAtPoint(
        e.clientX,
        e.clientY,
      );

      // One write: the cursor and the bullseye target always move together.
      useDragStore.setState({
        cursorPosition: { x: e.clientX, y: e.clientY },
        hoveredTarget: targetPlayerId
          ? { type: "player", id: targetPlayerId }
          : targetCardId
            ? { type: "card", id: targetCardId }
            : null,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Snapshot before resolving, so nothing reads half-cleared state.
      const {
        targetingMode,
        targetingCardId,
        choiceOptionIndex,
        endTargeting,
      } = useDragStore.getState();
      if (!targetingMode) return;

      try {
        const { G, ctx, moves } = latest.current;
        const target = toTargetValue(G, targetAtPoint(e.clientX, e.clientY));
        if (target) {
          TARGETING_MODES[targetingMode].resolve({
            G,
            ctx,
            moves,
            sourceId: targetingCardId,
            target,
            choiceOptionIndex,
          });
        }
      } finally {
        endTargeting();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return null;
};

export default TargetingLayer;
