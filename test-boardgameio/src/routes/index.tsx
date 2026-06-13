import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hearthstone, HeathStoneGame } from "@/game";
import { HearthstoneWithAI } from "@/game/AIExample";
import GameModeSelector from "@/components/GameModeSelector";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useAudioStore } from "@/stores/audioStore";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [gameMode, setGameMode] = useState<"pvp" | "ai" | null>(null);
  useBackgroundMusic({
    autoplay: true,
  });

  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);
  // Set the default main theme on startup
  useEffect(() => {
    setGlobalTrack("assets/audio/music/01_Main_Theme.mp3");
  }, [setGlobalTrack]);

  if (!gameMode) {
    return <GameModeSelector onModeSelect={setGameMode} />;
  }

  if (gameMode === "ai") {
    return <HearthstoneWithAI playerID="0" />;
  }

  return <Hearthstone />;
}
