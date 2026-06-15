import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeathStoneGame } from "@/game";
import { Client } from "boardgame.io/react";
import { Local } from "boardgame.io/multiplayer";
import { MCTSBot } from "boardgame.io/ai";
import { enumerateAIMoves } from "@/game/ai";
import MainMenu from "@/components/MainMenu";
import CollectionManager from "@/components/CollectionManager";
import PlayArea from "@/components/PlayArea";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore } from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import { createCardFromID, shuffleDeck } from "@/utils";
import type { CardTemplateKey } from "@/utils/cards";
import type { Card } from "@/types";
import type { State } from "boardgame.io";
import { premadeDecks } from "@/utils/decks";
import Gameboard from "@/components/GameBoard";

export const Route = createFileRoute("/")({
  component: App,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Custom bot class for AI
class FastMCTSBot extends MCTSBot {
  constructor(config: any) {
    super({
      ...config,
      iterations: 80,
      playoutDepth: 15,
      enumerate: enumerateAIMoves,
      game: HeathStoneGame,
    });
  }

  async play(state: State, playerID: any) {
    const allPossibleOptions = enumerateAIMoves(state.G, state.ctx);
    console.log(
      `All available legal moves (${allPossibleOptions.length}):`,
      allPossibleOptions,
    );
    const action = await super.play(state, playerID);
    await delay(750);
    console.log("AI chose action:", action.action.payload);
    return action;
  }
}

function App() {
  const [gameMode, setGameMode] = useState<"pvp" | "ai" | null>(null);
  const [gameKey, setGameKey] = useState(0); // Used to remount game component

  const currentView = useViewStore((state) => state.currentView);
  const { selectedDeckForPlay, generateOpponentDeck } = useDeckStore();

  useBackgroundMusic({
    autoplay: true,
  });

  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);

  useEffect(() => {
    setGlobalTrack("assets/audio/music/01_Main_Theme.mp3");
  }, [setGlobalTrack]);

  // Handle game start from PlayArea
  const handleGameStart = (mode: "pvp" | "ai") => {
    if (!selectedDeckForPlay) {
      console.error("No deck selected!");
      return;
    }

    // Generate opponent deck
    generateOpponentDeck();

    setGameMode(mode);
    setGameKey((prev) => prev + 1); // Force remount with new setupData
  };

  // Convert deck string to Card array
  const getDeckCards = (deckString: Record<string, number>): Card[] => {
    const deck: Card[] = [];
    for (const cardId in deckString) {
      const count = deckString[cardId as CardTemplateKey];
      if (count) {
        for (let i = 0; i < count; i++) {
          const card = createCardFromID(cardId as CardTemplateKey);
          if (card) deck.push(card);
        }
      }
    }
    return shuffleDeck(deck);
  };

  // Show main menu
  if (currentView === "main-menu") {
    return <MainMenu />;
  }

  // Show collection manager
  if (currentView === "collection") {
    return <CollectionManager />;
  }

  // Show play area (deck selection)
  if (currentView === "play" && !gameMode) {
    return <PlayArea onGameStart={handleGameStart} />;
  }

  // Show game
  if (currentView === "play" && gameMode && selectedDeckForPlay) {
    const { opponentDeck } = useDeckStore.getState();

    if (!opponentDeck) {
      return <div>Loading opponent deck...</div>;
    }

    // Get player deck cards
    const playerDeckCards = getDeckCards(selectedDeckForPlay.deckString);

    // Get a random opponent deck
    const randomOpponentDeck =
      premadeDecks[Math.floor(Math.random() * premadeDecks.length)];
    const opponentDeckCards = opponentDeck;

    // Create a custom game configuration with setupData
    const gameWithSetup = {
      ...HeathStoneGame,
      setup: (ctx: any) => {
        if (!HeathStoneGame.setup) {
          throw new Error("HeathStoneGame.setup is not defined");
        }
        return HeathStoneGame.setup(ctx, {
          playerDeck: playerDeckCards,
          playerHero: selectedDeckForPlay.hero,
          opponentDeck: opponentDeckCards,
          opponentHero: randomOpponentDeck.hero,
        });
      },
    };

    if (gameMode === "ai") {
      const HearthstoneWithAI = Client({
        board: Gameboard,
        game: gameWithSetup,
        numPlayers: 2,
        multiplayer: Local({
          bots: {
            "1": FastMCTSBot,
          },
        }),
        debug: {
          collapseOnLoad: true,
          hideToggleButton: true,
        },
      });

      return <HearthstoneWithAI key={gameKey} playerID="0" />;
    }

    // PvP mode
    const HearthstonePvP = Client({
      board: Gameboard,
      game: gameWithSetup,
      debug: { collapseOnLoad: true, hideToggleButton: true },
    });

    return <HearthstonePvP key={gameKey} />;
  }

  // Fallback
  return <MainMenu />;
}
