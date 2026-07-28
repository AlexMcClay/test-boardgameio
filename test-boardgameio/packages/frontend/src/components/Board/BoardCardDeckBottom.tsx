import type { Card } from "@project/shared";
import CardComponent from "../Card";
import type { Ctx } from "@project/shared";
import { AnimatePresence } from "motion/react";
import CountPopover from "./CountPopover";
import {
  COUNT_POPOVER_HEIGHT,
  positionBeside,
  positionCentered,
  useHoverPopover,
} from "./useHoverPopover";
import { useRef } from "react";

type Props = {
  deck: Card[];
  ctx: Ctx;
};

const BoardCardDeckBottom = ({ deck, ctx }: Props) => {
  const hoverAreaRef = useRef<HTMLDivElement>(null);

  const { popover, onMouseEnter, onMouseLeave } = useHoverPopover(() => {
    const rect = hoverAreaRef.current?.getBoundingClientRect();
    if (!rect) return null;

    // Hand size is published by PlayerHand as a data attribute so the deck
    // doesn't need the player passed down.
    const handEl = document.querySelector('[data-player-hand="bottom"]');
    const handRect = handEl?.getBoundingClientRect();
    const handCount = Number(handEl?.getAttribute("data-hand-count") ?? 0);

    return {
      deck: positionBeside(rect, COUNT_POPOVER_HEIGHT),
      hand:
        handRect && handEl
          ? {
              position: positionCentered(
                handRect,
                COUNT_POPOVER_HEIGHT,
                "above",
              ),
              count: handCount,
            }
          : null,
    };
  });

  return (
    <div
      className="absolute z-50 top-[49.4%] left-[83.7vw] flex items-center pointer-events-none minion-shadow"
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
      }}
    >
      {deck
        .slice(Math.max(0, deck.length - 8), deck.length)
        .map((card, idx) => (
          <div
            key={card.id}
            className="absolute transition-transform z-50"
            style={{
              left: "0",
              top: "0",
              transform: `rotateY(-72deg) rotateX(-2deg) rotateZ(90deg) translateZ(${idx * 0.21}vw)`,
              transformOrigin: "center center",

              // --- THE NEW FIXED COMPONENT CLIP ---
              // This crops from the local vertical edge, which matches your layout's horizontal line
              clipPath: "polygon(0% 0%, 100% 0%, 100% 65%, 0% 65%)",
            }}
          >
            <CardComponent back card={card} ctx={ctx} />
          </div>
        ))}

      {/* Hover catcher: covers the on-screen footprint of the rotated stack
          without re-enabling pointer events on the cards themselves. */}
      <div
        ref={hoverAreaRef}
        className="absolute pointer-events-auto z-0"
        style={{
          left: "1.8vw",
          top: "1.4vw",
          width: "4.2vw",
          height: "8.2vw",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      <AnimatePresence>
        {popover && (
          <CountPopover
            key="deck"
            title="Deck"
            count={deck.length}
            position={popover.deck}
          />
        )}
        {popover?.hand && (
          <CountPopover
            key="hand"
            title="Hand"
            count={popover.hand.count}
            position={popover.hand.position}
            maxCount={10}
            fullMessage="10 cards, your hand is full"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoardCardDeckBottom;
