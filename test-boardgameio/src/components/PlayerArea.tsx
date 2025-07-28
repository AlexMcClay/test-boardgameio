import React from "react";
import Card from "./Card";
import type { Card as CardType, GameState, Player } from "@/types";
import type { PlayerID } from "boardgame.io";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import DragCard from "./Card/DragCard";
import HeroSection from "./HeroSection";
import HandCard from "./Card/HandCard";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  playerID: PlayerID; // Added playerID to match the Board component
}

const PlayerArea = ({
  player,
  isTop,
  playerID,
  G,
  ctx,
  events,
  moves,
  ...props
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
      {/* HERO STATS */}
      <HeroSection
        player={player}
        isTop={isTop}
        playerID={playerID}
        G={G}
        ctx={ctx}
        events={events}
        moves={moves}
        {...props}
      />

      <div
        className="flex relative self-center justify-center w-full"
        style={{
          height: "180px",
          marginBottom: isTop ? "40px" : "0",
        }}
      >
        {hand.map((card, idx) => {
          return (
            <HandCard
              key={card.id}
              size={hand.length}
              index={idx}
              isTop={isTop}
              card={card}
            />
          );
        })}
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
          title={`${deck.length} cards in deck`}
          style={{
            cursor: ctx.currentPlayer === playerID ? "pointer" : "not-allowed",
          }}
          aria-disabled={ctx.currentPlayer !== playerID}
        >
          <div
            className="absolute inset-0 bg-[#37373b] rounded-2xl flex items-center justify-center border-dotted border-2 border-gray-500 pointer-events-none
          "
          ></div>
          {deck
            .slice(Math.max(0, deck.length - 5), deck.length)
            .map((card, idx) => (
              <div
                key={card.id}
                className="absolute"
                style={{
                  left: `0`,
                  top: `-${idx * 3}px`,
                }}
              >
                <Card back card={card} />
              </div>
            ))}
        </button>
      </div>
    </div>
  );
};

export default PlayerArea;
