import type { Card } from "@project/shared";
import CardComponent from "../Card";
import type { Ctx } from "@project/shared";
import { AnimatePresence } from "motion/react";
import CountPopover from "./CountPopover";
import {
  COUNT_POPOVER_HEIGHT,
  positionBeside,
  useHoverPopover,
} from "./useHoverPopover";
import { useRef } from "react";

type Props = {
  deck: Card[];
  ctx: Ctx;
};

const BoardCardDeckTop = ({ deck, ctx }: Props) => {
  const hoverAreaRef = useRef<HTMLDivElement>(null);

  const { popover, onMouseEnter, onMouseLeave } = useHoverPopover(() => {
    const rect = hoverAreaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { deck: positionBeside(rect, COUNT_POPOVER_HEIGHT) };
  });

  return (
    <div
      className="absolute z-50 top-[23.4%] left-[83.4vw] flex items-center pointer-events-none minion-shadow"
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
              transform: `rotateY(-72deg) rotateX(2deg) rotateZ(76deg) translateZ(${idx * 0.21}vw)`,
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
      </AnimatePresence>
    </div>
  );
};

export default BoardCardDeckTop;
