import { useEffect, useState } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore } from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import { generateCardsFromDeckstring, type SavedDeck } from "@project/shared";
import { matchmakingWebSocketService } from "@/services/matchMakingService";

const backgroundImage = "assets/menu/main_menu.png";

type MultiplayerSession = {
  matchID: string;
  playerID: string;
  playerCredentials: string;
};

interface PlayScreenProps {
  onGameStart: (
    mode: "pvp" | "ai",
    multiplayerSession?: MultiplayerSession,
  ) => void;
}

const PlayScreen = ({ onGameStart }: PlayScreenProps) => {
  useEffect(() => {
    matchmakingWebSocketService.reconnect();

    return () => {
      matchmakingWebSocketService.disconnect();
    };
  }, []);

  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
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
  const [hoveredMode, setHoveredMode] = useState<"pvp" | "ai" | null>(null);

  const playSfx = useAudioStore((state) => state.playSfx);
  const { getAllDecks, selectDeckForPlay } = useDeckStore();
  const setView = useViewStore((state) => state.setView);

  const allDecks = getAllDecks();

  function handleSelectDeck(deck: SavedDeck) {
    playSfx("button-click");
    setSelectedDeck(deck);
    selectDeckForPlay(deck);
  }

  function handleStartGame(mode: "pvp" | "ai") {
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
    playSfx("button-click");
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

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 w-[800px] font-belwe">
        <h1 className="text-5xl font-bold text-amber-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          Select Your Deck
        </h1>

        {/* Deck Selection Grid */}
        {allDecks.length > 0 ? (
          <div className="grid grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto p-4 bg-black/40 rounded-lg border-2 border-amber-900">
            {allDecks.map((deck) => (
              <button
                key={deck.id}
                onClick={() => handleSelectDeck(deck)}
                onMouseEnter={() => playSfx("button-over")}
                className={`
                  relative flex flex-col items-center gap-3 p-4
                  bg-[#bda393] rounded-lg border-4 
                  ${
                    selectedDeck?.id === deck.id
                      ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                      : "border-[#8d7037]"
                  }
                  shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6)]
                  transition-all duration-200
                  hover:brightness-110 hover:translate-y-[-2px]
                `}
              >
                <img
                  src={deck.hero.portrait}
                  alt={deck.hero.heroName}
                  className="w-24 h-24 rounded-full border-4 border-amber-900 object-cover"
                />
                <span className="text-lg font-bold text-stone-800 text-center">
                  {deck.name}
                </span>
                <span className="text-sm text-stone-600">
                  {deck.hero.class}
                </span>
                {selectedDeck?.id === deck.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                    <span className="text-stone-800 font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 bg-black/40 rounded-lg border-2 border-amber-900">
            <p className="text-2xl text-amber-300">No decks available!</p>
            <p className="text-lg text-gray-400">
              Create a deck in the Collection Manager first.
            </p>
          </div>
        )}

        {/* Game Mode Buttons - Only show if deck is selected */}
        {selectedDeck && (
          <div className="flex gap-4 w-full">
            <button
              onClick={() => handleStartGame("pvp")}
              onMouseEnter={() => {
                setHoveredMode("pvp");
                playSfx("button-over");
              }}
              onMouseLeave={() => setHoveredMode(null)}
              className={`
                relative flex-1 py-4 px-6
                bg-[#bda393]
                rounded-lg
                border-4 border-[#8d7037]
                shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
                transition-all duration-200
                ${hoveredMode === "pvp" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6)] brightness-110" : ""}
              `}
            >
              <span className="text-2xl font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]">
                {isSearchingMatch ? "Searching For Match..." : "Play vs Player"}
              </span>
              <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
              <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
            </button>

            <button
              onClick={() => handleStartGame("ai")}
              onMouseEnter={() => {
                setHoveredMode("ai");
                playSfx("button-over");
              }}
              onMouseLeave={() => setHoveredMode(null)}
              className={`
                relative flex-1 py-4 px-6
                bg-[#bda393]
                rounded-lg
                border-4 border-[#8d7037]
                shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
                transition-all duration-200
                ${hoveredMode === "ai" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6)] brightness-110" : ""}
              `}
            >
              <span className="text-2xl font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]">
                Play vs AI
              </span>
              <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
              <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
            </button>
          </div>
        )}

        {/* Bottom Buttons */}
        <div className="flex gap-4 w-full mt-4">
          <button
            onClick={handleGoToCollection}
            onMouseEnter={() => playSfx("button-over")}
            className="relative flex-1 py-3 px-6 bg-[#9d8573] rounded-lg border-4 border-[#6d5437] shadow-[0_4px_0_rgba(72,54,41,1)] transition-all duration-200 hover:translate-y-1 hover:shadow-[0_2px_0_rgba(72,54,41,1)] hover:brightness-110"
          >
            <span className="text-xl font-bold text-stone-800">
              Manage Collection
            </span>
          </button>

          <button
            onClick={handleBackToMenu}
            onMouseEnter={() => playSfx("button-over")}
            className="relative flex-1 py-3 px-6 bg-[#9d8573] rounded-lg border-4 border-[#6d5437] shadow-[0_4px_0_rgba(72,54,41,1)] transition-all duration-200 hover:translate-y-1 hover:shadow-[0_2px_0_rgba(72,54,41,1)] hover:brightness-110"
          >
            <span className="text-xl font-bold text-stone-800">
              Back to Menu
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayScreen;
