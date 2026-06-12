import { useEffect, useRef, useState } from "react";
import type { Card as CardType, Player } from "@/types";
import type { Ctx } from "boardgame.io";
import { twMerge } from "tailwind-merge";
import { useDraggable } from "@dnd-kit/core";
import type { CardProps } from "./types";
import Card from ".";
import { useAudioStore } from "@/stores/audioStore";

type Props = {
  size: number; // Array of cards in hand
  index: number; // Index of the card in the hand
  isTop?: boolean; // Whether the player is on top (for styling)
  card: CardType;
  ctx: Ctx;
  player: Player;
  isHovered: boolean; // Controlled by parent
  onHoverEnter: (cardId: string, rect: DOMRect) => void;
  onCardRef: (cardId: string, ref: HTMLDivElement | null) => void;
  back?: boolean;
};

const HandCard = ({
  size,
  index,
  isTop,
  card,
  ctx,
  player,
  isHovered,
  onHoverEnter,
  onCardRef,
  back,
}: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Register card ref with parent
  useEffect(() => {
    if (cardRef.current) {
      onCardRef(card.id, cardRef.current);
    }
    return () => {
      onCardRef(card.id, null);
    };
  }, [card.id, onCardRef]);

  // Only fan if more than 3 cards
  const shouldFan = size > 3;

  // Calculate the angle for fanning
  const maxFanAngle = 30; // degrees, total spread
  const angleStep = size > 1 ? maxFanAngle / (size - 1) : 0;
  const baseAngle = -maxFanAngle / 2 + index * angleStep;
  // Reverse angle direction for top player
  const angle = shouldFan ? (isTop ? -baseAngle : baseAngle) : 0;

  // Calculate vertical offset for arch effect
  const verticalOffset = 15 - size; // Adjust this value for how much the cards should be pushed down
  const middle = (size - 1) / 2; // Use floating point for smooth arch
  const distanceFromCenter = Math.abs(middle - index);
  const translateY = shouldFan ? distanceFromCenter * verticalOffset : 0;

  // Calculate overlap - more cards = more overlap
  const baseOverlap = 40;
  const additionalOverlap = Math.max(0, (size - 4) * (25 - size * 1.4)); // Extra overlap for hands > 4 cards
  const totalOverlap = baseOverlap + additionalOverlap;

  return (
    <div
      ref={cardRef}
      key={`${isTop ? "p1" : "p0"}-hand-${card.id}`}
      className={twMerge(
        "relative transition-all duration-300 ease-in-out flex",
        player.mana >= (card?.mana ?? 0) &&
          ctx.currentPlayer === player.id &&
          !back
          ? "canPlayCard"
          : "",
        isHovered && isTop && !back ? "translate-y-[120%]" : "",
        isHovered && !isTop ? "translate-y-[-100%]" : "",
      )}
      style={{
        marginLeft: index > 0 ? `-${(totalOverlap / 100) * 5.2}vw` : "0",
        zIndex: isHovered ? 999 : index + 1,
        transform: isHovered
          ? "none"
          : `rotate(${angle}deg) translateY(${isTop ? -translateY : translateY}px)`,
      }}
      onMouseEnter={(e) => {
        if (cardRef.current) {
          if (back) return;
          const rect = cardRef.current.getBoundingClientRect();
          onHoverEnter(card.id, rect);
        }
      }}
    >
      <DragCard
        card={card}
        ctx={ctx}
        animate={isHovered && !back ? "play-hover" : "normal"}
        onDragStart={() => {}}
        isHovered={isHovered}
        back={back}
      />
    </div>
  );
};

interface DargCardProps extends CardProps {
  onDragStart?: () => void;
  isHovered?: boolean;
}

const DragCard = (props: DargCardProps) => {
  const disabled = props.card.isPlaced && props.card.hasAttacked;

  const { isDragging, setNodeRef, listeners } = useDraggable({
    id: `${props.card.id}`,
    data: {
      type: "card",
      card: props.card,
      wasHovered: props.isHovered,
    },
    disabled: disabled || props.back,
  });

  // FIX 1: Initialize this to false (since we aren't dragging on mount)
  const [delayedDrag, setDelayedDrag] = useState(false);
  const isFirstRender = useRef(true);
  const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("card-draw");
      return;
    }

    // FIX 2: Set the state to exactly match isDragging after the delay
    const timer = setTimeout(() => {
      setDelayedDrag(isDragging);
    }, 300);

    return () => clearTimeout(timer);
  }, [isDragging]);

  // Notify parent when drag starts
  useEffect(() => {
    if (isDragging && props.onDragStart) {
      props.onDragStart();
    }
  }, [isDragging, props.onDragStart]);

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => {
        if (!props.back) playSfx("card-over");
      }}
      className={`${!disabled ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
      {...listeners}
    >
      {/* FIX 3: Clean, readable condition. If delayedDrag is true, hide it. */}

      {!isDragging ? (
        <Card {...props} isDragging={isDragging} back={props.back} />
      ) : (
        <div className="w-[7.8vw] relative aspect-[5/7] bg-[#37373b00]  opacity-0 rounded-2xl flex-col flex gap-1 items-center shadow-xl overflow-hidden"></div>
      )}
    </div>
  );
};

export default HandCard;
