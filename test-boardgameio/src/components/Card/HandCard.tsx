import { useState, useEffect } from "react";
import type { Card as CardType, Player } from "@/types";
import type { Ctx } from "boardgame.io";
import { twMerge } from "tailwind-merge";
import { useDraggable } from "@dnd-kit/core";
import type { CardProps } from "./types";
import Card from ".";

type Props = {
  size: number; // Array of cards in hand
  index: number; // Index of the card in the hand
  isTop?: boolean; // Whether the player is on top (for styling)
  card: CardType;
  ctx: Ctx;
  player: Player;
};

const HandCard = ({ size, index, isTop, card, ctx, player }: Props) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate the angle for fanning
  const maxFanAngle = 30; // degrees, total spread
  const angleStep = size > 1 ? maxFanAngle / (size - 1) : 0;
  const angle = -maxFanAngle / 2 + index * angleStep;

  // Calculate vertical offset for fanning
  const verticalOffset = 10; // Adjust this value for how much the cards should be pushed down
  const middle = Math.floor(size / 2);
  // Calculate translateY based on index and size
  // console.log(Math.abs(middle - index));
  const translateY = size > 1 ? Math.abs(middle - index) * verticalOffset : 0;

  return (
    <div
      key={`${isTop ? "p1" : "p0"}-hand-${card.id}`}
      className={twMerge(
        "relative transition-all duration-300 ease-in-out hover:z-50",
        player.mana >= (card?.mana ?? 0) && ctx.currentPlayer === player.id
          ? "canPlayCard"
          : "",
        isHovered && isTop ? "translate-y-[120%]" : "",
        isHovered && !isTop ? "translate-y-[-100%]" : "",
      )}
      style={{
        marginLeft: index > 0 ? `-${size * 9}px` : "0",
        zIndex: index + 1,
        // transform: isHovered
        //   ? "none"
        //   : `rotate(${angle}deg) translateY(${isTop ? -translateY : translateY}px)`,
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.zIndex = "100";
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.zIndex = (index + 1).toString();
      }}
    >
      <DragCard
        card={card}
        ctx={ctx}
        animate={isHovered ? "play-hover" : "normal"}
        onDragStart={() => setIsHovered(false)}
        isHovered={isHovered}
      />
    </div>
  );
};

interface DargCardProps extends CardProps {
  onDragStart?: () => void;
  isHovered?: boolean;
}

const DragCard = (props: DargCardProps) => {
  const disabled = props.card.isPlaced && props.card.hasAttacked; //

  const { isDragging, setNodeRef, listeners, transform } = useDraggable({
    id: `${props.card.id}`,
    data: {
      type: "card",
      card: props.card,
      wasHovered: props.isHovered, // Track if card was hovered when drag started
    },
    disabled: disabled, // Disable dragging if the card has attacked or was just placed
  });

  // Notify parent when drag starts to reset hover state
  useEffect(() => {
    if (isDragging && props.onDragStart) {
      props.onDragStart();
    }
  }, [isDragging, props.onDragStart]);

  return (
    <div
      ref={setNodeRef}
      className={`${!disabled && "cursor-grab"} ${isDragging ? " cursor-grabbing" : ""}`}
      style={{
        opacity: isDragging ? 0 : 1, // Hide original when dragging
        transition: "none", // Delay opacity to allow scale animation
      }}
      {...listeners}
    >
      <Card {...props} isDragging={isDragging} />
    </div>
  );
};

export default HandCard;
