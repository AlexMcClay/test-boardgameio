import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeathStoneGame } from "@/game";
import { Client } from "boardgame.io/react";
import { Local } from "boardgame.io/multiplayer";
import { MCTSBot } from "boardgame.io/ai";
import { enumerateAIMoves } from "@/game/ai";
import Board from "@/components/Board";
import GameModeSelector from "@/components/GameModeSelector";
import DeckSelection from "@/components/DeckSelection";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore } from "@/stores/deckStore";
import { createCardFromID, shuffleDeck } from "@/utils";
import type { CardTemplateKey } from "@/utils/cards";
import type { Card } from "@/types";
import type { State } from "boardgame.io";

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
  const [showDeckSelection, setShowDeckSelection] = useState(false);
  const [gameKey, setGameKey] = useState(0); // Used to remount game component

  const { playerDeck, opponentDeck, isDeckReady, clearDecks } = useDeckStore();

  useBackgroundMusic({
    autoplay: true,
  });

  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);

  useEffect(() => {
    setGlobalTrack("assets/audio/music/01_Main_Theme.mp3");
  }, [setGlobalTrack]);

  // Reset decks when game mode changes
  useEffect(() => {
    if (gameMode) {
      clearDecks();
      setShowDeckSelection(true);
    }
  }, [gameMode, clearDecks]);

  const handleDeckConfirmed = () => {
    setShowDeckSelection(false);
    setGameKey((prev) => prev + 1); // Force remount with new setupData
  };

  const handleBackToModeSelect = () => {
    setGameMode(null);
    setShowDeckSelection(false);
    clearDecks();
  };

  // Convert deck string to Card array
  const getPlayerDeckCards = (): Card[] | undefined => {
    if (!playerDeck || Object.keys(playerDeck).length === 0) return undefined;

    const deck: Card[] = [];
    for (const cardId in playerDeck) {
      const count = playerDeck[cardId as CardTemplateKey];
      if (count) {
        for (let i = 0; i < count; i++) {
          const card = createCardFromID(cardId as CardTemplateKey);
          if (card) deck.push(card);
        }
      }
    }
    return shuffleDeck(deck);
  };

  if (!gameMode) {
    return <GameModeSelector onModeSelect={setGameMode} />;
  }

  if (showDeckSelection) {
    return <DeckSelection onDeckConfirmed={handleDeckConfirmed} />;
  }

  if (!isDeckReady || !opponentDeck) {
    return <div>Loading...</div>;
  }

  // Prepare setup data
  const playerDeckCards = getPlayerDeckCards();

  // Create a custom game configuration with setupData
  const gameWithSetup = {
    ...HeathStoneGame,
    setup: (ctx: any) => {
      if (!HeathStoneGame.setup) {
        throw new Error("HeathStoneGame.setup is not defined");
      }
      return HeathStoneGame.setup(ctx, {
        playerDeck: playerDeckCards,
        opponentDeck: opponentDeck,
      });
    },
  };

  if (gameMode === "ai") {
    const HearthstoneWithAI = Client({
      board: Board,
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
    board: Board,
    game: gameWithSetup,
    debug: { collapseOnLoad: true, hideToggleButton: true },
  });

  return <HearthstonePvP key={gameKey} />;
}
