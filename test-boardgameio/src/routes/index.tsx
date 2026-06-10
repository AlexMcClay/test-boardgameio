import { createFileRoute } from "@tanstack/react-router";
import { Hearthstone } from "@/game";
import { HearthstoneWithAI } from "@/game/AIExample";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  // return <Hearthstone />;
  return <HearthstoneWithAI playerID="0" />;
}
