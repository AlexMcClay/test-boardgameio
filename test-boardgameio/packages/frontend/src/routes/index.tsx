import { createFileRoute } from "@tanstack/react-router";
import MainMenu from "@/components/MainMenu";
import CollectionManager from "@/components/CollectionManager";
import PlayScreen from "@/components/PlayScreen/PlayScreen";

import { useDeckStore } from "@/stores/deckStore";
import { useViewStore, type MultiplayerSession } from "@/stores/viewStore";
import Gameboard from "@/components/GameBoard";
import {
  generateCardsFromDeckstring,
  type GameSetupData,
} from "@project/shared";
import { useGameConnection } from "@/hooks/gameHooks/useGameConnection";
import { useAIOpponent } from "@/hooks/gameHooks/useAIOpponent";
import MatchLoadingScreen from "@/components/MatchLoadingScreen";
import ConnectionLostModal from "@/components/Board/ConnectionLostModal";

export const Route = createFileRoute("/")({
  component: App,
});

/** Single-player vs MCTS bot, or local hotseat PvP — in-browser gameMachine. */
function LocalGame({
  setupData,
  ai,
}: {
  setupData: GameSetupData;
  ai: boolean;
}) {
  const connection = useGameConnection({
    mode: "local",
    setupData,
    // vs AI the human owns seat 0; hotseat controls whoever's turn it is
    playerID: ai ? "0" : null,
  });
  // Drives seat 1 with the Web-Worker MCTS bot whenever it's the bot's turn.
  useAIOpponent(ai ? connection.actor : null, "1");
  if (!connection.isReady) {
    return (
      <MatchLoadingScreen
        title={ai ? "Starting Game" : "Starting Hotseat Game"}
        detail={ai ? "Waking the opponent…" : "Dealing the opening hands…"}
      />
    );
  }
  return <Gameboard {...connection} />;
}

/** Online PvP — mirrors the authoritative server actor over the WebSocket. */
function OnlineGame({ session }: { session: MultiplayerSession }) {
  const connection = useGameConnection({ mode: "online", session });

  // The modal sits outside the ready check on purpose: the socket can drop
  // before the first sync ever arrives, and the loading screen alone would
  // spin forever with no way out.
  return (
    <>
      {connection.isReady ? (
        <Gameboard {...connection} />
      ) : (
        <MatchLoadingScreen
          title="Connecting to Match"
          detail="Syncing with the opponent…"
        />
      )}
      <ConnectionLostModal isOpen={!connection.isConnected} />
    </>
  );
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
    nextMultiplayerSession?: MultiplayerSession,
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
    // Online PvP doesn't need local decks — the server owns the state
    if (gameMode === "pvp" && multiplayerSession) {
      return <OnlineGame key={gameKey} session={multiplayerSession} />;
    }

    const { opponentDeck } = useDeckStore.getState();

    if (!opponentDeck) {
      return (
        <MatchLoadingScreen
          title="Starting Game"
          detail="Shuffling the opponent's deck…"
        />
      );
    }

    const setupData: GameSetupData = {
      player0: {
        deck: generateCardsFromDeckstring(selectedDeckForPlay.deckString),
        hero: selectedDeckForPlay.hero,
      },
      player1: {
        deck: generateCardsFromDeckstring(opponentDeck.deckString),
        hero: opponentDeck.hero,
      },
    };

    // "ai" = single player vs bot; "pvp" without a session = local hotseat
    return (
      <LocalGame key={gameKey} setupData={setupData} ai={gameMode === "ai"} />
    );
  }

  // Fallback
  return <MainMenu />;
}
