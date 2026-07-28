import { useState, useEffect, useRef } from "react";
import type { GameBoardProps } from "@/types/gameProps";
import { twMerge } from "tailwind-merge";
import HandCard from "./Card/HandCard";
import type { GameState, Player } from "@project/shared";
import { AnimatePresence } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
import CountPopover from "./Board/CountPopover";
import {
  COUNT_POPOVER_HEIGHT,
  positionCentered,
  useHoverPopover,
} from "./Board/useHoverPopover";

interface Props extends GameBoardProps {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  actualG: GameState;
}

// Configurable hover exit threshold
const HOVER_EXIT_THRESHOLD_X = 0.85;
const HOVER_EXIT_THRESHOLD_Y = 1.2;

const PlayerHand = ({ isTop, ctx, player, playerID, actualG }: Props) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoverOrigin, setHoverOrigin] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const handRef = useRef<HTMLDivElement>(null);
  const playSfx = useAudioStore((state) => state.playSfx);

  // Hand-count popover, top player only. The bottom player's count is reached
  // by hovering their deck (see BoardCardDeckBottom).
  const {
    popover: handCountPopover,
    onMouseEnter: onHandMouseEnter,
    onMouseLeave: onHandMouseLeave,
  } = useHoverPopover(() => {
    const rect = handRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return positionCentered(rect, COUNT_POPOVER_HEIGHT, "below");
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("mulligan-shuffle");
      return;
    }
  }, []);

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
      ref={handRef}
      data-player-hand={isTop ? "top" : "bottom"}
      data-hand-count={player.hand.length}
      onMouseEnter={isTop ? onHandMouseEnter : undefined}
      onMouseLeave={isTop ? onHandMouseLeave : undefined}
      className={twMerge(
        "flex absolute self-center justify-center w-full z-50 ",
        !isTop && "translate-y-[44%] translate-x-[-1%]",
        isTop && "translate-y-[-62%] translate-x-[-0%]",
      )}
    >
      <AnimatePresence mode="popLayout">
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
              back={playerID ? playerID !== player.id : false}
              isHovered={hoveredCardId === card.id}
              onHoverEnter={handleCardHoverEnter}
              onCardRef={setCardRef}
              discarded={
                !!actualG.discardedCards.find((c) => c.card.id === card.id)
              }
              isHandFirstRender={isFirstRender.current}
            />
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {handCountPopover && (
          <CountPopover
            title="Hand"
            count={player.hand.length}
            position={handCountPopover}
            maxCount={10}
            fullMessage="10 cards, your hand is full"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayerHand;
