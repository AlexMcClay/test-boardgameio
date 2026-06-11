import { useState, useEffect, useRef } from "react";
import type { GameState, Player } from "@/types";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { twMerge } from "tailwind-merge";
import HandCard from "./Card/HandCard";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
}

// Configurable hover exit threshold
const HOVER_EXIT_THRESHOLD_X = 0.85;
const HOVER_EXIT_THRESHOLD_Y = 1.2;

const PlayerHand = ({ isTop, G, ctx, player, playerID }: Props) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoverOrigin, setHoverOrigin] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Global mouse move handler for hover detection
  useEffect(() => {
    if (!hoveredCardId || !hoverOrigin) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const centerX = hoverOrigin.x;
      const centerY = hoverOrigin.y;

      const distanceX = Math.abs(e.clientX - centerX);
      const distanceY = Math.abs(e.clientY - centerY);

      const sizeWidthCheck = hoverOrigin.width * HOVER_EXIT_THRESHOLD_X - 20;
      const sizeHeightCheck = hoverOrigin.height * HOVER_EXIT_THRESHOLD_Y - 20;

      if (distanceX > sizeWidthCheck || distanceY > sizeHeightCheck) {
        setHoveredCardId(null);
        setHoverOrigin(null);
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [hoveredCardId, hoverOrigin]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleCardHoverEnter = (cardId: string, rect: DOMRect) => {
    setHoveredCardId(cardId);

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setHoverOrigin({
      x: centerX,
      y: centerY,
      width: rect.width * 1.5,
      height: rect.height * 1.5,
    });

    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Update origin after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      const cardRef = cardRefs.current.get(cardId);
      if (cardRef) {
        const newRect = cardRef.getBoundingClientRect();
        const newCenterX = newRect.left + newRect.width / 2;
        const newCenterY = newRect.top + newRect.height / 2;

        setHoverOrigin({
          x: newCenterX,
          y: newCenterY,
          width: newRect.width,
          height: newRect.height,
        });
      }
    }, 300);
  };

  const setCardRef = (cardId: string, ref: HTMLDivElement | null) => {
    if (ref) {
      cardRefs.current.set(cardId, ref);
    } else {
      cardRefs.current.delete(cardId);
    }
  };

  return (
    <div
      className={twMerge(
        "flex absolute self-center justify-center w-full z-50 ",
        !isTop && "translate-y-[44%] translate-x-[-1%]",
        isTop && "translate-y-[-62%] translate-x-[-0%]",
      )}
    >
      {player.hand.map((card, idx) => {
        return (
          <HandCard
            key={card.id}
            size={player.hand.length}
            index={idx}
            isTop={isTop}
            card={card}
            ctx={ctx}
            player={player}
            // back={playerID ? playerID !== player.id : false}
            isHovered={hoveredCardId === card.id}
            onHoverEnter={handleCardHoverEnter}
            onCardRef={setCardRef}
          />
        );
      })}
    </div>
  );
};

export default PlayerHand;
