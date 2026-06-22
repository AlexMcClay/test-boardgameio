import { createFileRoute } from "@tanstack/react-router";
import { Client } from "boardgame.io/react";
import { Local, SocketIO } from "boardgame.io/multiplayer";
import { MCTSBot } from "boardgame.io/ai";
import MainMenu from "@/components/MainMenu";
import CollectionManager from "@/components/CollectionManager";
import PlayScreen from "@/components/PlayScreen/PlayScreen";

import { useDeckStore } from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import type { Ctx, State } from "boardgame.io";
import Gameboard from "@/components/GameBoard";
import {
  enumerateAIMoves,
  evaluateGameState,
  generateCardsFromDeckstring,
  HeathStoneGame,
  type GameState,
} from "@project/shared";

export const Route = createFileRoute("/")({
  component: App,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Custom bot class for AI
class FastMCTSBot extends MCTSBot {
  constructor(config: any) {
    super({
      ...config,
      iterations: 100,
      playoutDepth: 50,
      enumerate: enumerateAIMoves,
      game: HeathStoneGame,
      objectives: () => ({
        winGame: {
          checker: (G: GameState, ctx: Ctx) => {
            // const enemyId = ctx.currentPlayer === "0" ? "1" : "0";

            // Use evaluateGameState for scoring
            return evaluateGameState(G, ctx);
          },
          weight: 1.0,
        },
      }),
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
  const currentView = useViewStore((state) => state.currentView);
  const gameMode = useViewStore((state) => state.gameMode);
  const gameKey = useViewStore((state) => state.gameKey);
  const multiplayerSession = useViewStore((state) => state.multiplayerSession);
  const startGame = useViewStore((state) => state.startGame);

  const { selectedDeckForPlay, generateOpponentDeck } = useDeckStore();

  // Handle game start from PlayScreen
  const handleGameStart = (
    mode: "pvp" | "ai",
    nextMultiplayerSession?: {
      matchID: string;
      playerID: string;
      playerCredentials: string;
    },
  ) => {
    console.log(selectedDeckForPlay);
    if (!selectedDeckForPlay) {
      console.error("No deck selected!");
      return;
    }

    // Generate opponent deck
    generateOpponentDeck();

    // Use viewStore's startGame method
    startGame(mode, nextMultiplayerSession);
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
    return <PlayScreen onGameStart={handleGameStart} />;
  }

  // Show game
  if (currentView === "play" && gameMode && selectedDeckForPlay) {
    const { opponentDeck } = useDeckStore.getState();

    if (!opponentDeck) {
      return <div>Loading opponent deck...</div>;
    }

    // Get player deck cards from SavedDeck
    const playerDeckCards = generateCardsFromDeckstring(
      selectedDeckForPlay.deckString,
    );

    // Get opponent deck cards from SavedDeck
    const opponentDeckCards = generateCardsFromDeckstring(
      opponentDeck.deckString,
    );

    // Create a custom game configuration with setupData
    const gameWithSetup = {
      ...HeathStoneGame,
      setup: (ctx: any) => {
        if (!HeathStoneGame.setup) {
          throw new Error("HeathStoneGame.setup is not defined");
        }
        return HeathStoneGame.setup(ctx, {
          player0: {
            deck: playerDeckCards,
            hero: selectedDeckForPlay.hero,
          },
          player1: {
            deck: opponentDeckCards,
            hero: opponentDeck.hero,
          },
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

    if (gameMode === "pvp" && multiplayerSession) {
      const defaultServerUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
      const serverUrl =
        import.meta.env.VITE_BACKEND_HTTP_URL?.trim() || defaultServerUrl;
      const HearthstoneOnlinePvP = Client({
        board: Gameboard,
        game: HeathStoneGame,
        multiplayer: SocketIO({ server: serverUrl }),
        debug: { collapseOnLoad: true, hideToggleButton: true },
      });

      return (
        <HearthstoneOnlinePvP
          key={gameKey}
          matchID={multiplayerSession.matchID}
          playerID={multiplayerSession.playerID}
          credentials={multiplayerSession.playerCredentials}
        />
      );
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
