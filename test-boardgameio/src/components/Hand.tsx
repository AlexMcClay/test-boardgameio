import React from "react";
import Card from "./Card";
import type { Card as CardType } from "@/types";

interface Props {
  hand: CardType[];
  deckCount: number;
  isTop?: boolean; // true for player 1, false or undefined for player 0
}

const Hand = ({ hand, deckCount, isTop = false }: Props) => {
  return (
    <div
      className={`flex justify-between items-${
        isTop ? "end" : "start"
      } h-[15%]`}
    >
      <div></div>

      <div className="flex gap-2 max-w-[80%]">
        {hand.map((card, idx) => (
          <Card key={`${isTop ? "p1" : "p0"}-hand-${idx}`} {...card} />
        ))}
      </div>

      <div className="w-16 h-24 bg-yellow-700 rounded-lg shadow-md flex items-center justify-center">
        Deck ({deckCount})
      </div>
    </div>
  );
};

export default Hand;
