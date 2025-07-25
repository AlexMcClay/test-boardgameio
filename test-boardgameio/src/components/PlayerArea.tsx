import React from "react";
import Card from "./Card";
import type { Card as CardType, GameState, Player } from "@/types";
import type { PlayerID } from "boardgame.io";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import DragCard from "./Card/DragCard";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  playerID: PlayerID; // Added playerID to match the Board component
}

const mana_crystal = "src/assets/mana.png";

const PlayerArea = ({
  player,
  isTop,
  playerID,
  G,
  ctx,
  events,
  moves,
}: Props) => {
  const handleEndTurn = () => {
    // Logic to end the turn, e.g., call a move to end the turn
    if (events && events.endTurn) {
      // Call the endTurn event if available
      events.endTurn();
    }
  };

  const handleDrawCard = () => {
    // Ensure the current player can draw a card
    if (ctx.currentPlayer !== playerID) return;
    // Logic to draw a card, e.g., call a move to draw a card
    if (moves && moves.drawCard) {
      // Call the drawCard move if available
      moves.drawCard();
    }
  };

  const { hand, deck } = player;
  return (
    <div
      className={`grid grid-cols-3 justify-between items-${isTop ? "end" : "start"} `}
    >
      <div
        id="player-stats"
        className={`overflow-visible ${ctx.currentPlayer === playerID ? "ring-2 ring-yellow-300" : ""}`}
      >
        <div className="text-lg font-bold whitespace-nowrap">{player.name}</div>
        <div className={`flex gap-2 flex-col `}>
          <span className="whitespace-nowrap">
            HP: {player.hp}/{player.maxHp}
          </span>
          <div className="flex">
            {Array.from({ length: G.maxMana }).map((_, idx) => (
              <img
                key={idx}
                src={mana_crystal}
                alt="Mana Crystal"
                className={`w-6 h-6 ${idx < player.mana ? "" : "opacity-50"}`}
                draggable="false"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex  relative self-center justify-center w-full">
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
            <DragCard {...card} />
          </div>
        ))}
      </div>

      <div className="flex w-full self-start justify-end items-center gap-2">
        <button
          className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors cursor-pointer ${ctx.currentPlayer === playerID ? "" : "opacity-50 cursor-not-allowed"}`}
          onClick={handleEndTurn}
          disabled={ctx.currentPlayer !== playerID}
        >
          End Turn
        </button>
        <button
          className="flex max-w-[80%] relative aspect-[5/7] w-[150px] "
          // onClick={handleDrawCard}
          title="Click to draw a card"
          style={{
            cursor: ctx.currentPlayer === playerID ? "pointer" : "not-allowed",
          }}
          aria-disabled={ctx.currentPlayer !== playerID}
        >
          <div
            className="absolute inset-0 bg-[#37373b] rounded-2xl flex items-center justify-center border-dotted border-2 border-gray-500 pointer-events-none
          "
          ></div>
          {deck.slice(0, Math.min(5, deck.length)).map((card, idx) => (
            <div
              key={`deck-${idx}`}
              className="absolute"
              style={{ left: `0`, top: `-${idx * 3}px` }}
            >
              <Card back {...card} />
            </div>
          ))}
        </button>
      </div>
    </div>
  );
};

export default PlayerArea;
