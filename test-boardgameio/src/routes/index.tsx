import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Hearthstone } from "@/game";
import { HearthstoneWithAI } from "@/game/AIExample";
import GameModeSelector from "@/components/GameModeSelector";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [gameMode, setGameMode] = useState<"pvp" | "ai" | null>(null);

  if (!gameMode) {
    return <GameModeSelector onModeSelect={setGameMode} />;
  }

  if (gameMode === "ai") {
    return <HearthstoneWithAI playerID="0" />;
  }

  return <Hearthstone />;
}
