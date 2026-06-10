import type { CardProps } from "./types";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "boardgame.io";
import { useDragStore } from "@/stores/dragStore";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";
import Card from "./index";
import { useRef, useEffect } from "react";
import { DEATH_ANIMATION } from "@/utils/animationDurations";

interface Props extends CardProps {
  playerID: PlayerID;
  ctx: Ctx;
}

// MinionCard component with attack arrow behavior
const MinionCard = ({ card, playerID, ctx }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const startAttack = useDragStore((s) => s.startAttack);
  const updateAttackCursor = useDragStore((s) => s.updateAttackCursor);
  const endAttack = useDragStore((s) => s.endAttack);
  const attackingCardId = useDragStore((s) => s.attackingCardId);

  const isAttacking = attackingCardId === card.id;
  const disabled = card.hasAttacked; // Can't attack if already attacked

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;

    // Get card center position
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    startAttack(card.id, origin, card);
  };

  useEffect(() => {
    if (!isAttacking) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateAttackCursor({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Use document.elementFromPoint to find target
      const element = document.elementFromPoint(e.clientX, e.clientY);

      if (element) {
        const targetCardId = element
          .closest("[data-card-id]")
          ?.getAttribute("data-card-id");
        const targetPlayerId = element
          .closest("[data-player-id]")
          ?.getAttribute("data-player-id");

        // Emit custom event with target info for GameBoard to handle
        if (targetCardId || targetPlayerId) {
          const event = new CustomEvent("attack-target", {
            detail: {
              attackerId: card.id,
              targetCardId,
              targetPlayerId,
            },
          });
          window.dispatchEvent(event);
        }
      }

      endAttack();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isAttacking, card.id, updateAttackCursor, endAttack]);

  return (
    <motion.div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      className={`${!disabled && "cursor-pointer"}`}
      animate={
        isAttacking
          ? {
              y: 0,
              scale: 1.15,
              transition: { duration: 0.15, ease: "easeOut" },
              // filter: "drop-shadow(0px 0px 10px rgba(239, 68, 68, 0.7))",
            }
          : { y: 0, scale: 1 }
      }
    >
      <Card card={{ ...card, mana: null }} playerID={playerID} ctx={ctx} />
    </motion.div>
  );
};

const DropDetectCard = (props: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: props.card.id,
    data: {
      type: "card",
      player: props.playerID, // Include playerID to match the Lane component
      id: props.card.id,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget("card", props.playerID, props.card.id);

  return (
    <motion.div
      key={props.card.id}
      ref={setNodeRef}
      layoutId={`drop-${props.card.id}`}
      className={twMerge(
        isOver && "ring-2 ring-yellow-300",
        isValid &&
          "ring-yellow-500 rounded-2xl ring-2 shadow-yellow-400  shadow-[0px_0px_20px_rgba(0,0,0,0.5)]",
      )}
      exit={{
        opacity: [1, 1, 0], // Stays fully visible during the shake, then vanishes quickly
        rotate: [0, -5, 5, -5, 5, 20], // Shakes back and forth rapidly before spinning away
        // The Rapid Shake: Rapidly oscillates left and right
        x: [0, -12, 12, -12, 12, -8, 8, -4, 4, 0],
        transition: {
          duration: DEATH_ANIMATION.duration / 1000, // Total duration of the animation
          ease: "easeInOut",
        },
      }}
    >
      <MinionCard {...props} />
    </motion.div>
  );
};

export default DropDetectCard;
