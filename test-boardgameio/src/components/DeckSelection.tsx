import { useState } from "react";
import Card from "./Card";
import { cardTemplates, type CardTemplateKey } from "@/utils/cards";
import { premadeDecks } from "@/utils/decks";
import type { Card as CardType } from "@/types";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore, type DeckString } from "@/stores/deckStore";
import { twMerge } from "tailwind-merge";

interface DeckSelectionProps {
  onDeckConfirmed: () => void;
}

const backgroundImage = "assets/collection/collection.png";
const sheet = "assets/collection/sheet.png";

// class icons
const deathKnightIcon = "assets/icons/Death_Knight_icon.webp";
const demonHunterIcon = "assets/icons/Demon_Hunter_icon.webp";
const druidIcon = "assets/icons/Druid_icon.webp";
const hunterIcon = "assets/icons/Hunter_icon.webp";
const mageIcon = "assets/icons/Mage_icon.webp";
const paladinIcon = "assets/icons/Paladin_icon.webp";
const priestIcon = "assets/icons/Priest_icon.webp";
const rogueIcon = "assets/icons/Rogue_icon.webp";
const shamanIcon = "assets/icons/Shaman_icon.webp";
const warlockIcon = "assets/icons/Warlock_icon.webp";
const warriorIcon = "assets/icons/Warrior_icon.webp";
const neutralIcon = "assets/icons/Neutral_icon.webp";

const icons = [
  {
    icon: deathKnightIcon,
    name: "Death Knight",
  },
  {
    icon: demonHunterIcon,
    name: "Demon Hunter",
  },
  {
    icon: druidIcon,
    name: "Druid",
  },
  {
    icon: hunterIcon,
    name: "Hunter",
  },
  {
    icon: mageIcon,
    name: "Mage",
  },
  {
    icon: paladinIcon,
    name: "Paladin",
  },
  {
    icon: priestIcon,
    name: "Priest",
  },
  {
    icon: rogueIcon,
    name: "Rogue",
  },
  {
    icon: shamanIcon,
    name: "Shaman",
  },
  {
    icon: warlockIcon,
    name: "Warlock",
  },
  {
    icon: warriorIcon,
    name: "Warrior",
  },
  {
    icon: neutralIcon,
    name: "Neutral",
  },
];

const DeckSelection = ({ onDeckConfirmed }: DeckSelectionProps) => {
  const [deck, setDeck] = useState<DeckString>({});
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const playSfx = useAudioStore((state) => state.playSfx);
  const { setPlayerDeck, generateOpponentDeck } = useDeckStore();

  const CARDS_PER_PAGE = 8; // 2 rows × 4 columns

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

  function handleClassSelect(className: string) {
    playSfx("button-click");
    if (selectedClass === className) {
      // Deselect - show all cards
      setSelectedClass(null);
    } else {
      // Select new class
      setSelectedClass(className);
    }
    // Reset to first page when changing filter
    setCurrentPage(0);
  }

  function handlePreviousPage() {
    if (currentPage > 0) {
      playSfx("collection-manager-page-flip");
      setCurrentPage(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages - 1) {
      playSfx("collection-manager-page-flip");
      setCurrentPage(currentPage + 1);
    }
  }

  // Filter cards by class and collectibility
  const filteredCards = Object.entries(cardTemplates)
    .filter(([_, card]) => !(card as Omit<CardType, "id">).isUncollectible)
    .filter(([_, card]) => !selectedClass || card.class === selectedClass)
    .sort((a, b) => {
      // sort by mana cost, then by name
      return (a[1].mana ?? 0) - (b[1].mana ?? 0);
    });

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  const startIdx = currentPage * CARDS_PER_PAGE;
  const displayedCards = filteredCards.slice(
    startIdx,
    startIdx + CARDS_PER_PAGE,
  );

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

      <img src={sheet} className="absolute z-[0] left-[12vw] w-[57.5vw]" />

      {/* Top Bar */}

      <div className="absolute h-[5.7vh] w-[56vw] left-[12.6vw] top-[1vh] pl-[1vw] flex items-end gap-[0.5vw]">
        {icons.map((i) => (
          <button
            key={i.name}
            onClick={() => handleClassSelect(i.name)}
            className={twMerge(
              `bg-black h-[2.7vw] w-[2.7vw] rounded-[50%/20%] overflow-hidden border border-[#b7a27e] border-x-4 border-t-4 transition-all duration-200 origin-bottom hover:scale-110 `,
              selectedClass === i.name ? "scale-125 hover:scale-125 " : "",
            )}
            style={{ clipPath: "inset(0px 0px 20% 0px)" }}
          >
            <img src={i.icon} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <div className="absolute bg-gradient-to-t pointer-events-none from-black/60  h-[1.5vh] w-[56vw] left-[12.6vw] top-[4.5vh] pl-[1vw] "></div>

      {/* Left Panel - Card Collection */}
      <div
        className="flex flex-col w-[56vw] absolute h-[81vh] left-[12.6vw] top-[6vh]  rounded-lg shadow-lg p-[1vw] px-[0.5vw] overflow-hidden"
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "multiply",
        }}
      >
        <p className="absolute w-[12vw] h-[4vh] left-[21vw] top-[3.3vh] text-center text-[1.4vw]">
          {selectedClass || "All Classes"}
        </p>

        {/* Navigation zones */}
        <div className="mt-[8vh] relative h-[69vh]">
          {/* Left navigation zone */}
          <div
            onClick={handlePreviousPage}
            className={`absolute left-0 top-0 h-full  w-[5%] z-20 ${
              currentPage > 0
                ? " cursor-e-resize "
                : "cursor-not-allowed opacity-50"
            } transition-all duration-200 flex items-center justify-center`}
          >
            {currentPage > 0 && (
              <div className="text-4xl text-amber-300 opacity-0 hover:opacity-100 transition-opacity">
                ‹
              </div>
            )}
          </div>

          {/* Right navigation zone */}
          <div
            onClick={handleNextPage}
            className={`absolute right-0 top-0 h-full w-[5%]  z-20  ${
              currentPage < totalPages - 1
                ? " cursor-e-resize "
                : "cursor-not-allowed opacity-50"
            } transition-all duration-200 flex items-center justify-center`}
          >
            {currentPage < totalPages - 1 && (
              <div className="text-4xl text-amber-300 opacity-0 hover:opacity-100 transition-opacity">
                ›
              </div>
            )}
          </div>

          {/* Card grid */}
          <div className="card-grid grid grid-cols-4 grid-rows-2 gap-[2vw] px-[3vw] gap-y-[3vw] p-[1vw] items-center justify-center h-full">
            {displayedCards.map(([id, card]) => (
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
                  <div className="scale-140 absolute origin-top-left">
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

          {/* Page indicator */}
          <div className="absolute bottom-[-2vh] left-0 right-0 flex justify-center items-center py-2">
            <span className="text-black/60 text-[1.4vw] font-bold">
              Page {currentPage + 1}
            </span>
          </div>
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
