import { useState } from "react";
import Card from "./Card";
import {
  cardTemplates,
  heros,
  type CardTemplateKey,
  type Card as CardType,
  type Hero,
  type SavedDeck,
} from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import {
  useDeckStore,
  type DeckString,
  FILTER_BY_CLASS_WHEN_BUILDING,
} from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import { twMerge } from "tailwind-merge";

const backgroundImage = "assets/collection/collection.png";
const sheet = "assets/collection/sheet.png";
const mana_crystal = "assets/mana.png";

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

  const isPremade = editingDeck?.id.startsWith("premade-") ?? false;

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
    if (isPremade) return;
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
          {selectedClass || "All Classes"}
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
                  mode === "card-select" && !isPremade
                    ? "cursor-pointer z-10 transition-transform duration-200 hover:scale-105 minion-shadow"
                    : "z-10 minion-shadow"
                }
                key={id}
                onClick={() => {
                  if (mode === "card-select" && !isPremade) {
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    if (currentCount < 2 && totalCards < maxCards) {
                      const newCount = currentCount + 1;
                      handleDeckChange(id as CardTemplateKey, newCount);
                    }
                  }
                }}
                onMouseEnter={() =>
                  mode === "card-select" && !isPremade && playSfx("card-over")
                }
                onContextMenu={(e) => {
                  if (mode === "card-select" && !isPremade) {
                    e.preventDefault();
                    const currentCount = deck[id as CardTemplateKey] || 0;
                    const newCount = currentCount > 0 ? currentCount - 1 : 0;
                    handleDeckChange(id as CardTemplateKey, newCount);
                  }
                }}
              >
                <div
                  className={`w-[11.7vw] aspect-[5/7] items-center justify-center relative transition-all ease-in `}
                >
                  <div className="scale-140 absolute origin-top-left">
                    <Card
                      key={id}
                      card={{ ...card, id, originalID: id }}
                      back={false}
                      isDragging={false}
                    />
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
      <div className="w-[13.2vw] h-[84vh] rounded-lg p-[1vw] flex flex-col items-center gap-[1vw] absolute left-[70.5vw] top-[7vh]">
        {mode === "viewer" && (
          <>
            <div className="flex flex-col gap-[0.5vw] w-full max-h-[60vh] overflow-y-auto">
              {allDecks.map((savedDeck) => (
                <div
                  key={savedDeck.id}
                  className="flex h-[4vw] items-end gap-[0.5vw] bg-black/40 rounded border border-amber-900 w-full cursor-pointer"
                  onClick={() => {
                    handleEditDeck(savedDeck);
                  }}
                  onMouseEnter={() => playSfx("button-over")}
                  style={{
                    backgroundImage: `url(${savedDeck.hero.portrait})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span className="w-full p-[0.3vw] text-[1.1vw] bg-gradient-to-r from-black to-transparent   text-white">
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

            <div className=" absolute bottom-[-2.4vw] left-[8.4vw] w-[8vw] text-[1.25vw]  text-white px-[0.5vw] py-[0.25vw] rounded-lg flex flex-col gap-0 ">
              <button
                onMouseEnter={() => playSfx("button-over")}
                className="clear-deck-button w-full"
                onClick={handleBackToMenu}
              >
                Back to Menu
              </button>
            </div>
          </>
        )}

        {mode === "card-select" && (
          <>
            {selectedHero && (
              <div
                className="flex h-[4vw] items-end gap-[0.5vw] bg-black/40 rounded border border-amber-900 left-[0.3vw] w-full absolute top-[-7vh]"
                style={{
                  backgroundImage: `url(${selectedHero.portrait})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="flex items-center w-full bg-gradient-to-r from-black to-transparent pr-[0.3vw]">
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="Enter deck name..."
                    className="w-full p-[0.3vw] text-[1.1vw] bg-transparent text-white focus:outline-none"
                    maxLength={30}
                    readOnly={isPremade}
                  />
                  {isPremade && (
                    <span className="text-[0.6vw] text-amber-400 font-bold whitespace-nowrap self-center">
                      (Premade)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CARD LIST GOES HERE */}
            <div
              className={twMerge(
                "flex flex-col w-full gap-[0.5vh] overflow-y-auto h-full rounded-[0.7vw]",
                Object.values(deck).reduce((sum, count) => sum + count, 0) ==
                  30 &&
                  " ring-blue-500 ring-2 shadow-blue-400  shadow-[0px_0px_60px_rgba(0,0,0,0.5)] ",
              )}
            >
              {Object.entries(deck)
                .sort(([aKey], [bKey]) => {
                  const aCard = cardTemplates[aKey as CardTemplateKey];
                  const bCard = cardTemplates[bKey as CardTemplateKey];
                  const aMana = aCard.mana ?? -1;
                  const bMana = bCard.mana ?? -1;
                  return aMana - bMana;
                })
                .map(([k, count]) => (
                  <div
                    key={k}
                    className={twMerge(
                      "bg-gray-800 text-white w-full h-[3vh] min-h-[3vh] flex items-center relative shadow rounded transition-colors",
                      !isPremade && "cursor-pointer hover:bg-gray-700",
                    )}
                    onClick={() => {
                      if (isPremade) return;
                      const currentCount = deck[k as CardTemplateKey] || 0;
                      if (currentCount > 0) {
                        handleDeckChange(
                          k as CardTemplateKey,
                          currentCount - 1,
                        );
                      }
                    }}
                    onMouseEnter={() => !isPremade && playSfx("card-over")}
                  >
                    <img
                      src={cardTemplates[k as CardTemplateKey].imageUrl}
                      className={twMerge(
                        "absolute h-[2.8vh] min-h-[2.8vh] w-[40%] right-0",
                        "object-cover object-center",
                        count > 1 && "right-[1.1vw]",
                      )}
                      style={{
                        WebkitMaskImage:
                          "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                        maskImage:
                          "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                      }}
                      alt="card-image"
                    />
                    {/* Mana Crystal */}
                    <div className=" select-none absolute text-lg w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold  shadow-md z-10 ">
                      <img
                        src={mana_crystal}
                        alt="cardTemplates[k as CardTemplateKey] Back"
                        className="object-cover w-full h-full absolute scale-100 brightness-90"
                        draggable="false"
                      />
                      <span
                        className="relative z-20 text-[1.1vw] font-extrabold font-belwe  scale-160 translate-y-[-10%] translate-x-[-5%]"
                        style={{
                          WebkitTextStroke: "0.5px black",
                          textShadow: "0 1px 0px black",
                        }}
                      >
                        {cardTemplates[k as CardTemplateKey].mana ?? ""}
                      </span>
                    </div>

                    <span
                      className="pl-[2vw] text-[0.8vw] z-20"
                      style={{
                        WebkitTextStroke: "0.2px black",
                        textShadow: "0 1px 0px black",
                      }}
                    >
                      {cardTemplates[k as CardTemplateKey].title}
                    </span>

                    {count > 1 && (
                      <div className="absolute right-0 top-0 bg-gray-950 h-full flex items-center text-yellow-400 px-[0.3vw] rounded">
                        {count}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className=" absolute bottom-[-2.4vw] left-[8.4vw] w-[8vw] text-[1.25vw]  text-white px-[0.5vw] py-[0.25vw] rounded-lg flex flex-col gap-0 ">
              <button
                onMouseEnter={() => playSfx("button-over")}
                className="clear-deck-button"
                onClick={isPremade ? handleCancelEdit : handleSaveDeck}
              >
                <span className="button-text">
                  {isPremade ? "Back" : "Save Deck"}
                </span>
              </button>
            </div>

            <div className=" absolute bottom-[-1.8vw] left-[1.5vw] text-[1.25vw]  text-white px-[0.5vw] py-[0.25vw] rounded-lg flex flex-col gap-0 ">
              <div>
                <span>{totalCards}</span>
                <span> / {maxCards}</span>
              </div>
              <span className="text-[0.8vw] absolute bottom-[-0.5vh] left-[1.2vw]">
                Cards
              </span>
            </div>
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
