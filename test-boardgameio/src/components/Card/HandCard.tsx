import { useState, useEffect, useRef } from "react";
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

// Configurable hover exit threshold (0-1, where 1 = 100% of card width/height from center)
const HOVER_EXIT_THRESHOLD = 0.85; // 25% from center - adjust this value to change hover stickiness

const HandCard = ({ size, index, isTop, card, ctx, player }: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hoverOrigin, setHoverOrigin] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Global mouse move handler - tracks cursor even when moving fast
  useEffect(() => {
    if (!isHovered || !hoverOrigin) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Use frozen hoverOrigin instead of live getBoundingClientRect
      const centerX = hoverOrigin.x;
      const centerY = hoverOrigin.y;

      // Calculate distance from frozen center
      const distanceX = Math.abs(e.clientX - centerX);
      const distanceY = Math.abs(e.clientY - centerY);

      const sizeWidthCheck = hoverOrigin.width * HOVER_EXIT_THRESHOLD - 20;
      const sizeHeightCheck = hoverOrigin.height * HOVER_EXIT_THRESHOLD - 20;

      if (distanceX > sizeWidthCheck || distanceY > sizeHeightCheck) {
        setIsHovered(false);
        setHoverOrigin(null);
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
        if (cardRef.current)
          cardRef.current.style.zIndex = (index + 1).toString();
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isHovered, hoverOrigin, index]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      key={`${isTop ? "p1" : "p0"}-hand-${card.id}`}
      className={twMerge(
        "relative transition-all duration-300 ease-in-out hover:z-50 flex",
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

        // Capture initial card center position
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          setHoverOrigin({
            x: centerX,
            y: centerY,
            width: rect.width * 1.5,
            height: rect.height * 1.5,
          });

          // After animation completes (300ms), update to new transformed position
          if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
          }

          animationTimeoutRef.current = setTimeout(() => {
            if (cardRef.current) {
              const newRect = cardRef.current.getBoundingClientRect();
              const newCenterX = newRect.left + newRect.width / 2;
              const newCenterY = newRect.top + newRect.height / 2;

              setHoverOrigin({
                x: newCenterX,
                y: newCenterY,
                width: newRect.width,
                height: newRect.height,
              });
            }
          }, 300); // Match your transition duration
        }
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
