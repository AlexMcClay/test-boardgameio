import { useState } from "react";
import Card from "./Card";
import { cardTemplates, type CardTemplateKey } from "@/utils/cards";
import type { Card as CardType, SavedDeck } from "@/types";
import { useAudioStore } from "@/stores/audioStore";
import {
  useDeckStore,
  type DeckString,
  FILTER_BY_CLASS_WHEN_BUILDING,
} from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import { twMerge } from "tailwind-merge";
import { heros, type Hero } from "@/utils/heros";

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
  { icon: deathKnightIcon, name: "Death Knight" },
  { icon: demonHunterIcon, name: "Demon Hunter" },
  { icon: druidIcon, name: "Druid" },
  { icon: hunterIcon, name: "Hunter" },
  { icon: mageIcon, name: "Mage" },
  { icon: paladinIcon, name: "Paladin" },
  { icon: priestIcon, name: "Priest" },
  { icon: rogueIcon, name: "Rogue" },
  { icon: shamanIcon, name: "Shaman" },
  { icon: warlockIcon, name: "Warlock" },
  { icon: warriorIcon, name: "Warrior" },
  { icon: neutralIcon, name: "Neutral" },
];

type Mode = "viewer" | "card-select";

const CollectionManager = () => {
  const [mode, setMode] = useState<Mode>("viewer");
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<SavedDeck | null>(null);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deck, setDeck] = useState<DeckString>({});
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const playSfx = useAudioStore((state) => state.playSfx);
  const { saveUserDeck, deleteUserDeck, getAllDecks } = useDeckStore();
  const setView = useViewStore((state) => state.setView);

  const CARDS_PER_PAGE = 8; // 2 rows × 4 columns

  function handleBackToMenu() {
    playSfx("button-click");
    setView("main-menu");
  }

  function handleCreateNewDeck() {
    playSfx("button-click");
    setShowHeroModal(true);
  }

  function handleSelectHero(hero: Hero) {
    playSfx("button-click");
    setSelectedHero(hero);
    setShowHeroModal(false);
    setMode("card-select");
    setDeckName("");
    setDeck({});
    setEditingDeck(null);
    setSelectedClass(null);
    setCurrentPage(0);
  }

  function handleEditDeck(savedDeck: SavedDeck) {
    playSfx("button-click");
    setEditingDeck(savedDeck);
    setSelectedHero(savedDeck.hero);
    setDeckName(savedDeck.name);
    setDeck(savedDeck.deckString);
    setMode("card-select");
    setSelectedClass(null);
    setCurrentPage(0);
  }

  function handleDeleteDeck(deckId: string, event: React.MouseEvent) {
    event.stopPropagation();
    playSfx("button-click");
    if (confirm("Are you sure you want to delete this deck?")) {
      deleteUserDeck(deckId);
    }
  }

  function handleSaveDeck() {
    playSfx("button-click");

    const totalCards = Object.values(deck).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalCards !== 30) {
      alert("Deck must have exactly 30 cards!");
      return;
    }

    if (!deckName.trim()) {
      alert("Please enter a deck name!");
      return;
    }

    if (!selectedHero) {
      alert("Please select a hero!");
      return;
    }

    const savedDeck: SavedDeck = {
      id: editingDeck?.id || `user-${Date.now()}`,
      name: deckName,
      hero: selectedHero,
      deckString: deck,
    };

    saveUserDeck(savedDeck);

    // Return to viewer
    setMode("viewer");
    setEditingDeck(null);
    setSelectedHero(null);
    setDeckName("");
    setDeck({});
  }

  function handleCancelEdit() {
    playSfx("button-click");
    setMode("viewer");
    setEditingDeck(null);
    setSelectedHero(null);
    setDeckName("");
    setDeck({});
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

  function handleClearDeck() {
    playSfx("button-click");
    setDeck({});
  }

  function handleClassSelect(className: string) {
    playSfx("collection-manager-page-flip");
    if (selectedClass === className) {
      setSelectedClass(null);
    } else {
      setSelectedClass(className);
    }
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
    .filter(([_, card]) => {
      // If a class is specifically selected, filter by that class
      if (selectedClass) {
        return card.class === selectedClass;
      }

      // In card-select mode with FILTER_BY_CLASS_WHEN_BUILDING enabled
      if (
        mode === "card-select" &&
        FILTER_BY_CLASS_WHEN_BUILDING &&
        selectedHero
      ) {
        // Show hero's class + neutral
        return card.class === selectedHero.class || card.class === "Neutral";
      }

      // Otherwise show all cards
      return true;
    })
    .sort((a, b) => (a[1].mana ?? 0) - (b[1].mana ?? 0));

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
          return mana >= 7 ? sum + count : sum;
        }
        return mana === i ? sum + count : sum;
      }
      return sum;
    }, 0);
    return manaCount;
  });

  const allDecks = getAllDecks();

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
      <img src={backgroundImage} className="absolute z-[0]" alt="Background" />
      <img
        src={sheet}
        className="absolute z-[0] left-[12vw] w-[57.5vw]"
        alt="Sheet"
      />

      {/* Top Bar */}
      <div className="absolute h-[5.9vh] w-[56vw] left-[12.6vw] top-[1vh] pl-[1vw] flex items-end gap-[0.5vw]">
        {icons.map((i) => (
          <button
            key={i.name}
            onClick={() => handleClassSelect(i.name)}
            className={twMerge(
              `bg-black h-[2.7vw] w-[2.7vw] rounded-[50%/20%] overflow-hidden border border-[#b7a27e] border-x-4 border-t-4 transition-all duration-200 origin-bottom`,
              "hover:scale-110 cursor-pointer",
              selectedClass === i.name ? "scale-125 hover:scale-125" : "",
            )}
            style={{ clipPath: "inset(0px 0px 20% 0px)" }}
          >
            <img
              src={i.icon}
              className="w-full h-full object-cover"
              alt={i.name}
            />
          </button>
        ))}
      </div>

      <div className="absolute bg-gradient-to-t pointer-events-none from-black/60 h-[1.5vh] w-[56vw] left-[12.6vw] top-[4.5vh] pl-[1vw]"></div>

      {/* Left Panel - Card Collection */}
      <div className="flex flex-col w-[56vw] absolute h-[81vh] left-[12.6vw] top-[6vh] rounded-lg shadow-lg p-[1vw] px-[0.5vw] overflow-hidden">
        <p className="absolute w-[12vw] h-[4vh] left-[21vw] top-[3.3vh] text-center text-[1.4vw]">
          {mode === "viewer"
            ? "Collection"
            : selectedClass || selectedHero?.class || "All Classes"}
        </p>

        {/* Navigation zones */}
        <div className="mt-[8vh] relative h-[69vh]">
          {/* Left navigation zone */}
          <div
            onClick={handlePreviousPage}
            className={`absolute left-0 top-0 h-full w-[5%] z-20 ${
              currentPage > 0
                ? "cursor-e-resize"
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
            className={`absolute right-0 top-0 h-full w-[5%] z-20 ${
              currentPage < totalPages - 1
                ? "cursor-e-resize"
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
                className={
                  mode === "card-select"
                    ? "cursor-pointer z-10 transition-transform duration-200 hover:scale-105 minion-shadow"
                    : "z-10 minion-shadow"
                }
                key={id}
                onClick={() => {
                  if (mode === "card-select") {
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    if (currentCount < 2 && totalCards < maxCards) {
                      const newCount = currentCount + 1;
                      handleDeckChange(id as CardTemplateKey, newCount);
                    }
                  }
                }}
                onMouseEnter={() =>
                  mode === "card-select" && playSfx("card-over")
                }
                onContextMenu={(e) => {
                  if (mode === "card-select") {
                    e.preventDefault();
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    const newCount = currentCount > 0 ? currentCount - 1 : 0;
                    handleDeckChange(id as CardTemplateKey, newCount);
                  }
                }}
              >
                <div
                  className={`w-[11.7vw] aspect-[5/7] items-center justify-center relative transition-all ease-in ${mode === "card-select" && deck[id as CardTemplateKey] ? "card-selected" : ""}`}
                >
                  <div className="scale-140 absolute origin-top-left">
                    <Card
                      key={id}
                      card={{ ...card, id }}
                      back={false}
                      isDragging={false}
                    />
                    {mode === "card-select" &&
                      deck[id as CardTemplateKey] &&
                      deck[id as CardTemplateKey]! > 0 && (
                        <div className="bg-amber-300 absolute top-[-0.5vw] right-[-0.5vw] text-[1vw] font-bold rounded-full w-[1.25vw] h-[1.25vw] flex items-center justify-center">
                          {deck[id as CardTemplateKey]}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}
            {displayedCards.length === 0 && (
              <div className="col-span-4 row-span-2">
                <p className="text-[2vw] text-center text-black/70">
                  No Cards Available
                </p>
              </div>
            )}
          </div>

          {/* Page indicator */}
          <div className="absolute bottom-[-2vh] left-0 right-0 flex justify-center items-center py-2">
            <span className="text-black/60 text-[1.4vw] font-bold">
              Page {currentPage + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Changes based on mode */}
      <div className="w-[13.2vw] rounded-lg p-[1vw] flex flex-col items-center gap-[1vw] absolute left-[70.5vw] top-[7vh]">
        {mode === "viewer" && (
          <>
            <h2 className="text-[1.5vw] font-bold text-amber-300 mb-[1vw]">
              Your Decks
            </h2>

            <div className="flex flex-col gap-[0.5vw] w-full max-h-[60vh] overflow-y-auto">
              {allDecks.map((savedDeck) => (
                <div
                  key={savedDeck.id}
                  className="relative rounded w-full warrior-button transition-all duration-200 cursor-pointer p-[0.5vw] flex items-center gap-[0.5vw]"
                  onClick={() => handleEditDeck(savedDeck)}
                  onMouseEnter={() => playSfx("button-over")}
                >
                  <img
                    src={savedDeck.hero.portrait}
                    alt={savedDeck.hero.heroName}
                    className="w-[2.5vw] h-[2.5vw] rounded-full border-2 border-amber-900"
                  />
                  <span className="text-[0.9vw] text-amber-200 flex-1">
                    {savedDeck.name}
                  </span>
                  {!savedDeck.id.startsWith("premade-") && (
                    <button
                      onClick={(e) => handleDeleteDeck(savedDeck.id, e)}
                      className="text-red-400 hover:text-red-600 text-[0.8vw] px-[0.3vw]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onMouseEnter={() => playSfx("button-over")}
              className="warrior-button w-full p-[0.5vw] text-[1vw] text-amber-200 mt-[1vw]"
              onClick={handleCreateNewDeck}
            >
              Create New Deck
            </button>

            <button
              onMouseEnter={() => playSfx("button-over")}
              className="clear-deck-button w-full"
              onClick={handleBackToMenu}
            >
              Back to Menu
            </button>
          </>
        )}

        {mode === "card-select" && (
          <>
            <div className="w-full">
              <label className="text-[0.8vw] text-amber-300 block mb-[0.2vw]">
                Deck Name
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name..."
                className="w-full p-[0.3vw] text-[0.9vw] rounded bg-black/60 border border-amber-900 text-white"
                maxLength={30}
              />
            </div>

            {selectedHero && (
              <div className="flex items-center gap-[0.5vw] bg-black/40 p-[0.5vw] rounded border border-amber-900">
                <img
                  src={selectedHero.portrait}
                  alt={selectedHero.heroName}
                  className="w-[2vw] h-[2vw] rounded-full"
                />
                <span className="text-[0.8vw] text-amber-200">
                  {selectedHero.heroName}
                </span>
              </div>
            )}

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
            <div className="w-full bg-black/20 rounded-lg p-[1vw] border border-amber-900">
              <h3 className="text-[1vw] text-amber-300 text-center">
                Mana Curve
              </h3>
              <div className="h-[10vw] gap-1 flex items-end">
                {manaCurve.map((count, mana) => (
                  <div
                    key={mana}
                    className="flex flex-col items-center w-full h-full justify-end"
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

            <button
              onMouseEnter={() => playSfx("button-over")}
              className="clear-deck-button"
              onClick={handleClearDeck}
            >
              Clear Deck
            </button>

            <button
              onMouseEnter={() => playSfx("button-over")}
              className={`confirm-deck-button ${totalCards === maxCards && deckName.trim() ? "ready" : ""}`}
              onClick={handleSaveDeck}
              disabled={totalCards !== maxCards || !deckName.trim()}
            >
              <span className="button-text">Save Deck</span>
            </button>

            <button
              onMouseEnter={() => playSfx("button-over")}
              className="clear-deck-button"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Hero Selection Modal */}
      {showHeroModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setShowHeroModal(false)}
        >
          <div
            className="bg-[#2a1810] border-4 border-amber-900 rounded-lg p-[2vw] max-w-[60vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[2vw] font-bold text-amber-300 text-center mb-[2vw]">
              Select a Hero
            </h2>
            <div className="grid grid-cols-4 gap-[1vw]">
              {heros.map((hero) => (
                <button
                  key={hero.heroName}
                  onClick={() => handleSelectHero(hero)}
                  onMouseEnter={() => playSfx("button-over")}
                  className="flex flex-col items-center gap-[0.5vw] p-[1vw] rounded border-2 border-amber-900 hover:border-amber-500 transition-all hover:scale-105 bg-black/40"
                >
                  <img
                    src={hero.portrait}
                    alt={hero.heroName}
                    className="w-[8vw] h-[8vw] rounded-full border-4 border-amber-900"
                  />
                  <span className="text-[1vw] text-amber-200 text-center">
                    {hero.heroName}
                  </span>
                  <span className="text-[0.8vw] text-gray-400">
                    {hero.class}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowHeroModal(false)}
              onMouseEnter={() => playSfx("button-over")}
              className="mt-[2vw] w-full warrior-button p-[0.5vw] text-[1vw] text-amber-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManager;
