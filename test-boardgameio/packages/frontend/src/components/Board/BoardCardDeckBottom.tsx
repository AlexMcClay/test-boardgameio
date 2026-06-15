import type { Card } from "@project/shared";
import CardComponent from "../Card";
import type { Ctx } from "boardgame.io";

type Props = {
  deck: Card[];
  ctx: Ctx;
};

const BoardCardDeckBottom = ({ deck, ctx }: Props) => {
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
              transform: `rotateY(-72deg) rotateX(-2deg) rotateZ(90deg) translateZ(${idx * 4}px)`,
              transformOrigin: "center center",

              // --- THE NEW FIXED COMPONENT CLIP ---
              // This crops from the local vertical edge, which matches your layout's horizontal line
              clipPath: "polygon(0% 0%, 100% 0%, 100% 65%, 0% 65%)",
            }}
            title={` ${deck.length} cards`}
          >
            <CardComponent back card={card} ctx={ctx} />
          </div>
        ))}
    </div>
  );
};

export default BoardCardDeckBottom;
