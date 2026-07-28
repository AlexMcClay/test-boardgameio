// Board-level pointer handling for a Choose One half that needs aiming.
//
// Why this isn't in DropDetectCard like the other targeting modes: that
// component keys its listeners off `targetingCardId === card.id`, so it only
// works for something that IS a board minion. A Choose One SPELL (Wrath,
// Starfall) is held aside with no board presence at all, so nothing would
// ever listen. This layer is mounted once and handles the mode wherever the
// parent lives.
import { useEffect } from "react";
import { useDragStore } from "@/stores/dragStore";
import { targetAtPoint } from "@/utils/targeting";

const ChoiceTargetingLayer = () => {
  const targetingMode = useDragStore((s) => s.targetingMode);
  const choiceOptionIndex = useDragStore((s) => s.choiceOptionIndex);
  const updateTargetingCursor = useDragStore((s) => s.updateTargetingCursor);
  const endTargeting = useDragStore((s) => s.endTargeting);

  useEffect(() => {
    if (targetingMode !== "choice" || choiceOptionIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateTargetingCursor({ x: e.clientX, y: e.clientY });
      const { targetPlayerId, targetCardId } = targetAtPoint(
        e.clientX,
        e.clientY,
      );
      useDragStore.setState({
        hoveredTarget: targetPlayerId
          ? { type: "player", id: targetPlayerId }
          : targetCardId
            ? { type: "card", id: targetCardId }
            : null,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const { targetPlayerId, targetCardId } = targetAtPoint(
        e.clientX,
        e.clientY,
      );
      if (targetCardId || targetPlayerId) {
        window.dispatchEvent(
          new CustomEvent("choice-target", {
            detail: { optionIndex: choiceOptionIndex, targetCardId, targetPlayerId },
          }),
        );
      }
      // Releasing on empty space just drops the aim — the prompt is still
      // open in G, so the overlay comes straight back and the player can pick
      // again (or press ESC to cancel the whole play).
      useDragStore.setState({ hoveredTarget: null });
      endTargeting();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [targetingMode, choiceOptionIndex, updateTargetingCursor, endTargeting]);

  return null;
};

export default ChoiceTargetingLayer;
