import React from "react";
import Card from "./Card";
import type { Card as CardType } from "@/types";

interface Props {
  hand: CardType[];
  isTop?: boolean; // true for player 1, false or undefined for player 0
  deck: CardType[];
}

const Hand = ({ hand, isTop = false, deck }: Props) => {
  return (
    <div
      className={`flex justify-between items-${
        isTop ? "end" : "start"
      } h-[15%]`}
    >
      <div></div>

      <div className="flex max-w-[80%] relative">
        {hand.map((card, idx) => (
          <div
            key={`${isTop ? "p1" : "p0"}-hand-${idx}`}
            className="relative transition-all duration-300 ease-in-out hover:scale-110 hover:z-50"
            style={{
              marginLeft: idx > 0 ? "-60px" : "0",
              zIndex: idx + 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.zIndex = "100";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.zIndex = (idx + 1).toString();
            }}
          >
            <Card {...card} />
          </div>
        ))}
      </div>

      <div className="flex max-w-[80%] relative aspect-[5/7] w-[150px] ">
        {deck.slice(0, Math.min(5, deck.length)).map((card, idx) => (
          <div
            key={`deck-${idx}`}
            className="absolute"
            style={{ left: `0`, top: `-${idx * 3}px` }}
          >
            <Card back {...card} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hand;
