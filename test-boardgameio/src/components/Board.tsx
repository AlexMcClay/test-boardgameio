import React from "react";
import Card from "./Card";
import Hand from "./Hand";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";

interface Props extends BoardProps<GameState> {}

const Board = ({ ctx, G }: Props) => {
  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = G.board["0"];
  const board1 = G.board["1"];

  return (
    <div className="w-screen h-screen bg-[#1c1e22] flex items-center justify-center overflow-hidden">
      <div className="aspect-[16/9] w-full max-h-screen bg-[#2a2f36] flex flex-col text-white px-6 py-4 gap-2">
        {/* Player 1 Hand */}
        <div className="h-1/4 flex flex-col justify-end">
          <Hand hand={p1.hand} isTop deck={p1.deck} />
        </div>

        {/* Board Area */}
        <div className="flex flex-col gap-2 items-center justify-center h-[50%] border-y-4 bg border-yellow-800 py-2">
          {/* Player 1 Board */}
          <div className="flex justify-center gap-4 h-1/2 items-end bg-black opacity-30  w-full">
            {board1.map((card, idx) => (
              <Card key={`p1-board-${idx}`} {...card} />
            ))}
          </div>
          <div className="flex justify-center gap-4 h-1/2 items-end bg-black opacity-30  w-full">
            {board0.map((card, idx) => (
              <Card key={`p0-board-${idx}`} {...card} />
            ))}
          </div>
        </div>

        {/* Player 0 Hand */}
        <Hand hand={p0.hand} deck={p0.deck} />
      </div>
    </div>
  );
};

export default Board;
