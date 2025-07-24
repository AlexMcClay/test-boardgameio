import React from "react";
import Card from "./Card";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";

interface Props extends BoardProps<GameState> {}

const Board = ({ ctx, G }: Props) => {
  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = G.board["0"];
  const board1 = G.board["1"];

  return (
    <div className="w-screen h-screen bg-[#1c1e22] flex items-center justify-center">
      <div className="aspect-[16/9] w-full max-h-screen bg-[#2a2f36] flex flex-col text-white px-6 py-4 gap-2">
        {/* Player 1 Hand + Deck */}
        <div className="flex justify-between items-end h-[15%]">
          <div></div>
          <div className="flex gap-2 max-w-[80%] overflow-x-hidden">
            {p1.hand.map((card, idx) => (
              <Card {...card} />
            ))}
          </div>
          <div className="w-16 h-24 bg-yellow-700 rounded-lg shadow-md flex items-center justify-center">
            Deck ({p1.deck.length})
          </div>
        </div>

        {/* Board Area */}
        <div className="flex flex-col gap-2 items-center justify-center h-[60%] border-y-4 border-yellow-800 py-2">
          {/* Player 1 Board */}
          <div className="flex justify-center gap-4 h-1/2 items-end">
            {board1.map((card, idx) => (
              <Card key={`p1-board-${idx}`} {...card} />
            ))}
          </div>

          <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">
            Battlefield
          </div>

          {/* Player 0 Board */}
          <div className="flex justify-center gap-4 h-1/2 items-start">
            {board0.map((card, idx) => (
              <Card key={`p0-board-${idx}`} {...card} />
            ))}
          </div>
        </div>

        {/* Player 0 Hand + Deck */}
        <div className="flex justify-between items-start h-[15%]">
          <div></div>

          <div className="flex gap-2 max-w-[80%] overflow-x-hidden">
            {p0.hand.map((card, idx) => (
              <Card key={`p0-hand-${idx}`} {...card} />
            ))}
          </div>
          <div className="w-16 h-24 bg-yellow-700 rounded-lg shadow-md flex items-center justify-center">
            Deck ({p0.deck.length})
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
