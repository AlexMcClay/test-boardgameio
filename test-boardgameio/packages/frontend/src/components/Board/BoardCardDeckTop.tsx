import type { Card } from "@project/shared";
import CardComponent from "../Card";
import type { Ctx } from "boardgame.io";

type Props = {
  deck: Card[];
  ctx: Ctx;
};

const BoardCardDeckTop = ({ deck, ctx }: Props) => {
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
            title={` ${deck.length} cards`}
          >
            <CardComponent back card={card} ctx={ctx} />
          </div>
        ))}
    </div>
  );
};

export default BoardCardDeckTop;
