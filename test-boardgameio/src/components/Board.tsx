import React from "react";
import Card from "./Card";
import PlayerArea from "./PlayerArea";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import Lane from "./Lane";
import DropDetectCard from "./Card/DropDetectCard";

interface Props extends BoardProps<GameState> {}

const Board = ({ ctx, G, moves, ...props }: Props) => {
  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = G.board["0"];
  const board1 = G.board["1"];

  const handleDragEnd = (event: DragEndEvent) => {
    // console.log("Drag ended", event);
    const { active, over } = event;
    if (!over) return;
    console.log("Active card:", active);
    console.log("Over lane:", over);
    if (over.id === `lane-${ctx.currentPlayer}`) {
      // place card
      moves.placeCard(active.id);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    console.log("Drag over", event);
  };

  return (
    <div className="w-screen h-screen bg-[#1c1e22] flex items-center justify-center overflow-hidden">
      <div className="aspect-[16/9] w-full max-h-screen bg-[#2a2f36] flex flex-col text-white px-6 py-4 gap-2">
        <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
          {/* Player 1 Hand */}
          <div className="h-1/4 flex flex-col justify-end">
            <PlayerArea
              moves={moves}
              player={p1}
              G={G}
              ctx={ctx}
              {...props}
              playerID={"1"}
            />
          </div>

          {/* Board Area */}
          <div className="flex flex-col gap-2 items-center justify-center h-[50%] border-y-4 bg border-yellow-800 py-2">
            {/* Player 1 Board */}
            <Lane playerID="1">
              {board1.map((card, idx) => (
                <DropDetectCard
                  playerID="1"
                  key={`p1-board-${idx}`}
                  {...card}
                />
              ))}
            </Lane>
            <Lane playerID="0">
              {board0.map((card, idx) => (
                <DropDetectCard
                  playerID="0"
                  key={`p0-board-${idx}`}
                  {...card}
                />
              ))}
            </Lane>
          </div>

          {/* Player 0 Hand */}
          <PlayerArea
            player={p0}
            G={G}
            ctx={ctx}
            {...props}
            moves={moves}
            playerID="0"
          />
        </DndContext>
      </div>
    </div>
  );
};

export default Board;
