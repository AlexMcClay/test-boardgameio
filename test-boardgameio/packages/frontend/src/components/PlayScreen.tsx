import { useEffect, useState } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore } from "@/stores/deckStore";
import {
  useViewStore,
  type GameMode,
  type MultiplayerSession,
} from "@/stores/viewStore";
import { generateCardsFromDeckstring, type SavedDeck } from "@project/shared";
import { matchmakingWebSocketService } from "@/services/matchMakingService";
import SettingsOverlay from "./SettingsOverlay";
import SettingsButton from "./SettingsButton";
import Deck from "./Deck";
import GameModeModal from "./GameModeModal";
import MatchmakingModal from "./MatchmakingModal";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { twMerge } from "tailwind-merge";

const backgroundImage = "assets/play_screen/background.png";
const playActive = "assets/play_screen/play.png";
const playInactive = "assets/play_screen/play_inactive.png";

const DECKS_PER_PAGE = 9;

interface PlayScreenProps {
  onGameStart: (
    mode: GameMode,
    multiplayerSession?: MultiplayerSession,
  ) => void;
}

const archClipPath = `polygon(
    0% 100%, 
    0% 50%, 
    3% 40%, 
    6% 32%, 
    12% 24%, 
    22% 16%, 
    36% 8%, 
    50% 1%, 
    64% 8%, 
    78% 16%, 
    88% 24%,
    94% 32%,
    97% 40%, 
    100% 50%, 
    100% 100%
  )`;

const PlayScreen = ({ onGameStart }: PlayScreenProps) => {
  useEffect(() => {
    matchmakingWebSocketService.reconnect();

    return () => {
      matchmakingWebSocketService.disconnect();
    };
  }, []);

  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGameModeModalOpen, setIsGameModeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = matchmakingWebSocketService.subscribe((msg) => {
      console.log("Received WebSocket message: ", msg);

      if (msg.type === "searching_for_match") {
        setIsSearchingMatch(true);
      }

      if (msg.type === "match_found") {
        setIsSearchingMatch(false);
        onGameStart("pvp", {
          matchID: msg.matchID,
          playerID: msg.playerID,
          playerCredentials: msg.playerCredentials,
        });
      }
    });

    return unsubscribe;
  }, [onGameStart]);

  const [selectedDeck, setSelectedDeck] = useState<SavedDeck | null>(null);

  const playSfx = useAudioStore((state) => state.playSfx);
  const { getAllDecks, selectDeckForPlay } = useDeckStore();
  const setView = useViewStore((state) => state.setView);

  const allDecks = getAllDecks();
  const totalPages = Math.ceil(allDecks.length / DECKS_PER_PAGE);
  const startIndex = currentPage * DECKS_PER_PAGE;
  const visibleDecks = allDecks.slice(startIndex, startIndex + DECKS_PER_PAGE);

  function handleSelectDeck(deck: SavedDeck) {
    playSfx("button-click");
    // Just select the deck (remove modal trigger)
    setSelectedDeck(deck);
    selectDeckForPlay(deck);
  }

  function handleModeSelection(mode: GameMode) {
    playSfx("button-click");
    setSelectedGameMode(mode);
    setIsGameModeModalOpen(false);
  }

  function handleStartGame() {
    if (!selectedGameMode || !selectedDeck) {
      playSfx("button-click");
      alert("Please select both a game mode and a deck!");
      return;
    }

    const mode = selectedGameMode;
    if (isSearchingMatch) {
      matchmakingWebSocketService.send({
        type: "cancel_search",
        playerID: localStorage.getItem("user_id") || "",
      });
      alert("Canceling current matchmaking search...");
      setIsSearchingMatch(false);
      return;
    }
    if (!selectedDeck) {
      alert("Please select a deck first!");
      return;
    }

    setIsGameModeModalOpen(false);

    if (mode === "pvp" && !matchmakingWebSocketService.isConnected()) {
      console.log(
        "Matchmaking server is not connected. Setting up Local Play instead.",
      );
      onGameStart(mode);
    } else if (mode === "pvp") {
      console.log("Starting matchmaking via WebSocket...");
      matchmakingWebSocketService.send({
        type: "find_match",
        playerID: localStorage.getItem("user_id") || "",
        playerDeck: generateCardsFromDeckstring(selectedDeck.deckString),
        playerHero: selectedDeck.hero,
      });
      setIsSearchingMatch(true);
      return;
    }

    onGameStart(mode);
  }

  function handleBackToMenu() {
    playSfx("button-click");
    setView("main-menu");
  }

  function handleGoToCollection() {
    playSfx("button-click");
    setView("collection");
  }

  function handlePreviousPage() {
    if (currentPage > 0) {
      playSfx("button-click");
      setCurrentPage(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages - 1) {
      playSfx("button-click");
      setCurrentPage(currentPage + 1);
    }
  }

  function handleCancelSearch() {
    playSfx("button-click");
    matchmakingWebSocketService.send({
      type: "cancel_search",
      playerID: localStorage.getItem("user_id") || "",
    });
    setIsSearchingMatch(false);
  }

  return (
    <div
      className="fixed inset-0  font-belwe"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {/* Left Panel - Deck Selection */}
      <div className="flex-1 flex flex-col h-full  absolute left-[13vw] w-[48vw]">
        {/* Header */}
        <div className="flex flex-col items-center mb-[2vw]">
          <h1 className="text-[2vw] font-bold text-amber-100 drop-shadow-[0_0.3vw_0.3vw_rgba(0,0,0,0.8)]">
            {selectedGameMode === "pvp"
              ? "Play vs Player"
              : selectedGameMode === "ai"
                ? "Play vs AI"
                : "Play (Select Mode)"}
          </h1>
          <h2 className="text-[1.5vw] mt-[3vw] font-bold px-[1vw] text-white bg-black/40 drop-shadow-[0_0.2vw_0.2vw_rgba(0,0,0,0.8)]">
            Choose Your Deck
          </h2>
        </div>

        {/* Deck Grid Container with Navigation */}
        <div className="relative flex-1 flex justify-center">
          {/* Left Arrow */}
          {totalPages > 1 && currentPage > 0 && (
            <button
              onClick={handlePreviousPage}
              onMouseEnter={() => playSfx("button-over")}
              className="absolute left-[-3vw] top-1/2 -translate-y-1/2 z-20 bg-amber-600/80 hover:bg-amber-500 text-white rounded-full p-[1vw] shadow-lg transition-all duration-200 hover:scale-110"
            >
              <IoChevronBack className="w-[2.5vw] h-[2.5vw]" />
            </button>
          )}

          {/* Deck Grid */}
          <div className="relative  w-[90%]">
            {allDecks.length > 0 ? (
              <div className="grid grid-cols-3 grid-rows-3 gap-[6vw] p-[3vw] h-full">
                {" "}
                {/* Increased gap to give scale breathing room */}
                {visibleDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className={`relative transition-all duration-200 scale-125 origin-center ${
                      selectedDeck?.id === deck.id
                        ? "drop-shadow-[0_0_1.5vw_rgba(251,191,36,0.8)]"
                        : ""
                    }`}
                  >
                    <Deck
                      type="play"
                      id={deck.id}
                      name={deck.name}
                      image={deck.hero.portrait}
                      handleEditDeck={() => handleSelectDeck(deck)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[40vh] gap-[1vw]">
                <p className="text-[2vw] text-amber-300 font-bold">
                  No decks available!
                </p>
                <p className="text-[1.3vw] text-gray-300">
                  Create a deck in the Collection Manager first.
                </p>
              </div>
            )}
          </div>

          {/* Right Arrow */}
          {totalPages > 1 && currentPage < totalPages - 1 && (
            <button
              onClick={handleNextPage}
              onMouseEnter={() => playSfx("button-over")}
              className="absolute right-[-3vw] top-1/2 -translate-y-1/2 z-20 bg-amber-600/80 hover:bg-amber-500 text-white rounded-full p-[1vw] shadow-lg transition-all duration-200 hover:scale-110"
            >
              <IoChevronForward className="w-[2.5vw] h-[2.5vw]" />
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Hero Portrait */}
      <div className="w-[22vw]  absolute left-[64vw]  h-full">
        <div className="flex justify-start absolute top-[1vw] left-[5vw] z-50">
          <button
            onClick={() => {
              playSfx("button-click");
              setIsGameModeModalOpen(true);
            }}
            onMouseEnter={() => playSfx("button-over")}
            className="relative py-[0.25vw] px-[2.5vw] bg-[#bda393] rounded-lg border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110"
          >
            <span className="text-[1.25vw] font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]">
              {selectedGameMode === "pvp"
                ? "vs Player"
                : selectedGameMode === "ai"
                  ? "vs AI"
                  : "Game Mode"}
            </span>
            <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
          </button>
        </div>

        <div className="">
          {selectedDeck ? (
            <>
              <div className="absolute top-[17.7vw] w-[15vw]  left-[4vw]   overflow-hidden">
                <div
                  className="relative h-full w-full overflow-hidden pointer-events-none"
                  style={{ clipPath: archClipPath }}
                >
                  {/* The Hero Image (Added pointer-events-none) */}
                  <img
                    src={selectedDeck.hero.portrait}
                    alt={selectedDeck.hero.name}
                    className="h-full w-full object-cover opacity-100 pointer-events-none"
                    draggable="false"
                  />

                  {/* Conforming Inset Shadow Overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-100 border border-black"
                    style={{
                      boxShadow: "inset 0px 0px 20px 8px rgba(0, 0, 0, 1)",
                      clipPath: archClipPath,
                    }}
                  />

                  {/* Top Arc Inset Shadow Correction */}
                  <div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-transparent"
                    style={{ clipPath: archClipPath }}
                  />
                </div>
              </div>
              <div className=" absolute top-[35.6vw] left-[5vw] w-[12vw] rounded-full   flex items-center justify-center">
                <p className="text-[1.5vw] text-white">{selectedDeck.name}</p>
              </div>
            </>
          ) : (
            <></>
          )}
          <button
            onClick={() => {
              if (selectedDeck) {
                handleStartGame();
              }
            }}
            onMouseEnter={() => {
              if (selectedDeck) playSfx("play-over");
            }}
            style={{
              backgroundImage: `url(${selectedDeck ? playActive : playInactive})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
            className={twMerge(
              "absolute  top-[41.6vw]  left-[5.2vw] w-[12vw] h-[12vw] rounded-full  flex items-center justify-center duration-100  cursor-pointer",
              selectedDeck && "top-[41.3vw] playGlow",
            )}
          ></button>
        </div>
      </div>

      <div className="flex justify-start absolute top-[50.7vw] left-[29.8vw] z-50">
        <button
          onClick={handleGoToCollection}
          onMouseEnter={() => playSfx("button-over")}
          className="relative py-[0.25vw] px-[2.5vw] bg-[#bda393] rounded-lg border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110"
        >
          <span className="text-[1.25vw] font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]">
            My Collection
          </span>
          <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
        </button>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-[1vw] items-center justify-end w-full absolute top-[51.7vw] left-[-10vw]">
        {/* Back Button */}
        <button
          onClick={handleBackToMenu}
          onMouseEnter={() => playSfx("button-over")}
          className="relative py-[0.25vw] px-[2.5vw] bg-[#bda393] rounded-lg border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110"
        >
          <span className="text-[1.25vw] font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]">
            Back
          </span>
          <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
        </button>
      </div>

      {/* Settings Button */}
      <SettingsButton setIsSettingsOpen={setIsSettingsOpen} />

      {/* Settings Overlay */}
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Game Mode Selection Modal */}
      <GameModeModal
        isOpen={isGameModeModalOpen}
        onClose={() => setIsGameModeModalOpen(false)}
        onSelectMode={handleModeSelection}
      />

      {/* Matchmaking Modal */}
      <MatchmakingModal
        isOpen={isSearchingMatch}
        onCancel={handleCancelSearch}
      />
    </div>
  );
};

export default PlayScreen;
