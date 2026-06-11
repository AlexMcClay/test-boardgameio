import { useState } from "react";
import Card from "./Card";
import { cardTemplates, type CardTemplateKey } from "@/utils/cards";
import {
  druidDeckString,
  premadeDecks,
  warriorDeckString,
  type DeckString,
} from "@/utils/decks";
import type { Ctx } from "boardgame.io";
import type { Card as CardType } from "@/types";
import { createRandomDeckString } from "@/utils";

interface DeckSelectionProps {
  ctx: Ctx;
  moves: Record<string, (...args: any[]) => void>;
}

const backgroundImage = "src/assets/wood.jpg";

const DeckSelection = ({ ctx, moves }: DeckSelectionProps) => {
  const [deck, setDeck] = useState<Partial<Record<CardTemplateKey, number>>>(
    {},
  );

  function handleConfirmDeck() {
    moves.setDeck(ctx.currentPlayer, deck);
  }

  function handleDeckChange(cardId: CardTemplateKey, count: number) {
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

  function handleSetWholeDeck(deck: DeckString) {
    setDeck(deck);
  }

  function handleClearDeck() {
    setDeck({});
  }

  const totalCards = Object.values(deck).reduce((sum, count) => sum + count, 0);
  const maxCards = 30;

  // Calculate mana curve
  const manaCurve = Array.from({ length: 8 }, (_, i) => {
    const manaCount = Object.entries(deck).reduce((sum, [cardId, count]) => {
      const card = cardTemplates[cardId as CardTemplateKey];
      if (card) {
        const mana = card.mana ?? 0;
        if (i === 7) {
          // 7+ mana
          return mana >= 7 ? sum + count : sum;
        }
        return mana === i ? sum + count : sum;
      }
      return sum;
    }, 0);
    return manaCount;
  });

  return (
    <div
      className="deck-selection-container"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "multiply",
        backgroundColor: "#1a0a05",
      }}
    >
      {/* Header */}
      <div className="deck-selection-header">
        <h1 className="deck-selection-title">Deck Builder</h1>
        <div className="deck-count-display">
          <span
            className={
              totalCards > maxCards
                ? "text-red-400"
                : totalCards === maxCards
                  ? "text-green-400"
                  : "text-yellow-400"
            }
          >
            {totalCards}
          </span>
          <span className="text-gray-400"> / {maxCards}</span>
        </div>
      </div>

      <div className="deck-selection-content">
        {/* Left Panel - Card Collection */}
        <div className="card-collection-panel">
          <div className="panel-header">
            <h2 className="panel-title">Card Collection</h2>
            <p className="panel-subtitle">
              Left click to add • Right click to remove
            </p>
          </div>
          <div className="card-grid">
            {Object.entries(cardTemplates)
              .sort((a, b) => {
                // sort by mana cost, then by name
                return (a[1].mana ?? 0) - (b[1].mana ?? 0);
              })
              .filter(
                ([_, card]) => !(card as Omit<CardType, "id">).isUncollectible,
              )
              .map(([id, card]) => (
                <div
                  className="card-wrapper"
                  key={id}
                  onClick={() => {
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    if (currentCount < 2 && totalCards < maxCards) {
                      const newCount = currentCount + 1;
                      handleDeckChange(id as CardTemplateKey, newCount);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    const newCount = currentCount > 0 ? currentCount - 1 : 0;
                    handleDeckChange(id as CardTemplateKey, newCount);
                  }}
                >
                  <div
                    className={`card-container ${deck[id as CardTemplateKey] ? "card-selected" : ""}`}
                  >
                    <Card
                      key={id}
                      card={{ ...card, id }}
                      back={false}
                      isDragging={false}
                      ctx={ctx}
                    />
                    {deck[id as CardTemplateKey] &&
                      deck[id as CardTemplateKey]! > 0 && (
                        <div className="bg-amber-300 absolute -top-2 right-6  text-xl  font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {deck[id as CardTemplateKey]}
                        </div>
                      )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Panel - Deck Summary */}
        <div className="deck-summary-panel">
          <div className="panel-header">
            <h2 className="panel-title">Your Deck</h2>
          </div>

          {/* Mana Curve */}
          <div className="mana-curve-container">
            <h3 className="mana-curve-title">Mana Curve</h3>
            <div className="h-[100px] gap-1 flex items-end">
              {manaCurve.map((count, mana) => (
                <div
                  key={mana}
                  className="mana-bar-container h-full justify-end"
                >
                  <div
                    className="mana-bar"
                    style={{
                      height:
                        totalCards > 0
                          ? `${(count / totalCards) * 2 * 100}%`
                          : "0%",
                      minHeight: count > 0 ? "20px" : "0px",
                    }}
                  >
                    <span className="mana-bar-count">{count || ""}</span>
                  </div>
                  <div className="mana-bar-label">
                    {mana === 7 ? "7+" : mana}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predefined Decks */}
          <div className="predefined-decks">
            <h3 className="predefined-title">Quick Decks</h3>
            <div className="grid grid-cols-2 gap-2">
              {premadeDecks.map(({ name, deckString }) => (
                <button
                  key={name}
                  className="preset-deck-button warrior-button"
                  onClick={() => handleSetWholeDeck(deckString)}
                >
                  <span className="preset-deck-icon">📂</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>

            <button className="clear-deck-button" onClick={handleClearDeck}>
              Clear Deck
            </button>
          </div>

          {/* Confirm Button */}
          <button
            className={`confirm-deck-button ${totalCards === maxCards ? "ready" : ""}`}
            onClick={handleConfirmDeck}
            disabled={totalCards === 0}
          >
            <span className="button-text">
              {totalCards === 0
                ? "Select Cards"
                : totalCards === maxCards
                  ? "Done!"
                  : "Confirm Deck"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckSelection;
