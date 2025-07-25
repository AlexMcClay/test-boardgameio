import { createFileRoute } from "@tanstack/react-router";
import { Hearthstone } from "@/game";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return <Hearthstone />;
}
