import React, { useState } from "react";
import Card from "./Card";
import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";
import Gameboard from "./GameBoard";
import { cardTemplates } from "@/utils/cards";
import { druidDeckString, warriorDeckString } from "@/utils/decks";
interface Props extends BoardProps<GameState> {}

const backgroundImage = "src/assets/wood.jpg"; // Path to your background image

const Board = ({ ctx, G, moves, ...props }: Props) => {
  const p0 = G.players["0"];
  const [deck, setDeck] = useState<Record<string, number>>({});

  function handleConfirmDeck() {
    moves.setDeck(ctx.currentPlayer, deck);
  }

  function handleDeckChange(cardId: string, count: number) {
    setDeck((prevDeck) => {
      const newDeck = { ...prevDeck };
      if (count > 0) {
        newDeck[cardId] = count;
      } else {
        delete newDeck[cardId];
      }
      return newDeck;
    });
  }

  function handleSetWholeDeck(deck: Record<string, number>) {
    setDeck(deck);
  }

  if (ctx.phase === "setDeck") {
    return (
      <div
        className="w-screen h-screen bg-[#1c1e22] flex items-center justify-center overflow-hidden relative flex-col"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // filter: "brightness(0.2)",
          // darken background with filter
          backgroundBlendMode: "multiply",
          backgroundColor: "#00000099",
        }}
      >
        <h2 className="text-white text-2xl mb-4">Set Your Deck</h2>
        <div className="flex gap-4 h-[80%]">
          <div className="flex gap-4 flex-wrap  p-4  overflow-auto">
            {Object.entries(cardTemplates)
              .sort((a, b) => {
                // sort by mana cost, then by name
                return (a[1].mana || 0) - (b[1].mana || 0);
              })
              .map(([id, card]) => (
                <div
                  className="relative"
                  key={id}
                  onClick={() => {
                    const currentCount = deck[id] || 0;

                    const newCount = currentCount + 1;
                    handleDeckChange(id, newCount);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const currentCount = deck[id] || 0;
                    const newCount = currentCount > 0 ? currentCount - 1 : 0;
                    handleDeckChange(id, newCount);
                  }}
                >
                  <Card
                    key={id}
                    card={{ ...card, id }}
                    back={false}
                    isDragging={false}
                  />
                  <div className="text-white absolute text-center mt-2 top-0 right-0">
                    x{deck[id] || 0}
                  </div>
                </div>
              ))}
          </div>
          {/* display predefined decks and their number of cards */}
          <div className="flex flex-col gap-2">
            <h3 className="text-white text-lg">Predefined Decks</h3>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => handleSetWholeDeck(warriorDeckString)}
            >
              Warrior Deck
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={() => handleSetWholeDeck(druidDeckString)}
            >
              Druid Deck
            </button>
          </div>
        </div>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleConfirmDeck}
        >
          Confirm Deck, Total Cards:{" "}
          {Object.values(deck).reduce((sum, count) => sum + count, 0)}
        </button>
      </div>
    );
  } else {
    return <Gameboard ctx={ctx} G={G} moves={moves} {...props} />;
  }
};

export default Board;
