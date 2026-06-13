import { useState } from "react";
import Card from "./Card";
import { cardTemplates, type CardTemplateKey } from "@/utils/cards";
import { premadeDecks } from "@/utils/decks";
import type { Card as CardType } from "@/types";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore, type DeckString } from "@/stores/deckStore";

interface DeckSelectionProps {
  onDeckConfirmed: () => void;
}

const backgroundImage = "assets/collection/collection.png";
const page = "assets/collection/page.png";

const DeckSelection = ({ onDeckConfirmed }: DeckSelectionProps) => {
  const [deck, setDeck] = useState<DeckString>({});
  const playSfx = useAudioStore((state) => state.playSfx);
  const { setPlayerDeck, generateOpponentDeck } = useDeckStore();

  function handleConfirmDeck() {
    playSfx("button-click");

    // Store the player's deck in Zustand
    setPlayerDeck(deck);

    // Generate a random deck for the opponent
    generateOpponentDeck();

    // Notify parent that deck is ready
    onDeckConfirmed();
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
    playSfx("button-click");
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
      className="w-screen h-screen flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "multiply",
        background: "black",
      }}
    >
      <img src={backgroundImage} className="absolute z-[0]" />

      {/* Left Panel - Card Collection */}
      <div
        className="flex flex-col w-[57.2vw] absolute h-[85vh] left-[12.1vw] top-[7vh]  rounded-lg shadow-lg p-[1vw] px-[0.5vw] overflow-hidden"
        style={{
          backgroundImage: `url(${page})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "multiply",
        }}
      >
        <div className="mb-[4vh]">
          <h2
            className="text-[1.25vw] text-amber-300"
            onClick={() => {
              console.log(
                Object.entries(cardTemplates)
                  .filter(([k, v]) => !(v as CardType).isUncollectible)
                  .map(([k, v]) => k)
                  .join(", "),
              );
            }}
          >
            Card Collection
          </h2>
          <p className="text-[0.8vw] text-amber-200">
            Left click to add • Right click to remove
          </p>
        </div>
        <div className="card-grid grid grid-cols-4 gap-[1.75vw] gap-y-[4vw] p-[1vw]  overflow-y-auto items-center justify-center overflow-x-hidden">
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
                className="cursor-pointer z-10 transition-transform duration-200 hover:scale-105 minion-shadow"
                key={id}
                onClick={() => {
                  const currentCount = deck[id as CardTemplateKey] || 0;
                  if (currentCount < 2 && totalCards < maxCards) {
                    const newCount = currentCount + 1;
                    handleDeckChange(id as CardTemplateKey, newCount);
                  }
                }}
                onMouseEnter={() => {
                  playSfx("card-over");
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const currentCount = deck[id as CardTemplateKey] || 0;
                  const newCount = currentCount > 0 ? currentCount - 1 : 0;
                  handleDeckChange(id as CardTemplateKey, newCount);
                }}
              >
                <div
                  className={` w-[11.7vw] aspect-[5/7] items-center justify-center relative transition-all ease-in  ${deck[id as CardTemplateKey] ? "card-selected" : ""}`}
                >
                  <div className="scale-150 absolute origin-top-left">
                    <Card
                      key={id}
                      card={{ ...card, id }}
                      back={false}
                      isDragging={false}
                    />
                    {deck[id as CardTemplateKey] &&
                      deck[id as CardTemplateKey]! > 0 && (
                        <div className="bg-amber-300 absolute top-[-0.5vw] right-[-0.5vw]  text-[1vw]  font-bold rounded-full w-[1.25vw] h-[1.25vw] flex items-center justify-center">
                          {deck[id as CardTemplateKey]}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Right Panel - Deck Summary */}
      <div className="w-[14vw] rounded-lg  p-[1vw] flex flex-col items-center gap-[1vw] absolute left-[70vw] top-[7vh]">
        {/* Predefined Decks */}
        <div className="flex flex-col gap-[0.5vw] w-full">
          <div className="grid grid-cols-1 gap-[0.2vw] w-full">
            {premadeDecks.map(({ name, deckString }) => (
              <button
                key={name}
                className="rounded w-full text-[0.8vw] warrior-button transition-all duration-200 flex items-center gap-[0.2vw] justify-center p-[0.5vw]"
                onClick={() => {
                  playSfx("button-click");
                  handleSetWholeDeck(deckString);
                }}
                onMouseEnter={() => {
                  playSfx("button-over");
                }}
              >
                <span className="text-[1vw] text-amber-200">{name}</span>
              </button>
            ))}
          </div>

          <button
            onMouseEnter={() => {
              playSfx("button-over");
            }}
            className="clear-deck-button"
            onClick={handleClearDeck}
          >
            Clear Deck
          </button>
        </div>

        <div className="text-[1.25vw] font-bold bg-black/60 px-[0.5vw] py-[0.25vw] rounded-lg border border-amber-900">
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

        {/* Mana Curve */}
        <div className=" w-full bg-black/20 rounded-lg p-[1vw] border border-amber-900">
          <h3 className="text-[1vw] text-amber-300 text-center">Mana Curve</h3>
          <div className="h-[10vw] gap-1 flex items-end">
            {manaCurve.map((count, mana) => (
              <div
                key={mana}
                className=" flex flex-col items-center w-full h-full justify-end"
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
                  <span className="text-[0.8vw] text-white font-bold">
                    {count || ""}
                  </span>
                </div>
                <div className="text-[0.8vw] text-gray-400 mt-1">
                  {mana === 7 ? "7+" : mana}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onMouseEnter={() => {
            playSfx("button-over");
          }}
          className={`confirm-deck-button ${totalCards === maxCards ? "ready" : ""}`}
          onClick={handleConfirmDeck}
          disabled={totalCards === 0}
        >
          <span className="button-text">
            {totalCards === 0 ? "Select Cards" : "Start Game"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default DeckSelection;
