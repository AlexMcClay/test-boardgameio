import { createFileRoute } from "@tanstack/react-router";
import logo from "../logo.svg";

import { Client } from "boardgame.io/react";
import { Local } from "boardgame.io/multiplayer";
import { MCTSBot } from "boardgame.io/ai";
import Board from "@/components/Board";
import type { PlayerID, Game, Move } from "boardgame.io";
import type { GameState, Player } from "@/types";
import { createDeck } from "@/utils";

const setupData = (): GameState => {
  const G: GameState = {
    players: {
      "0": p0,
      "1": p1,
    },
    board: {
      "0": [],
      "1": [],
    },
  };
  return G;
};

const p0: Player = {
  id: "0",
  name: "Player 1",
  maxHp: 30,
  hp: 30,
  maxArmor: 0,
  armor: 0,
  maxMana: 10,
  mana: 10,
  hand: createDeck(5),
  deck: createDeck(20),
};

const p1: Player = {
  id: "1",
  name: "Player 2",
  maxHp: 30,
  hp: 30,
  maxArmor: 0,
  armor: 0,
  maxMana: 10,
  mana: 10,
  hand: createDeck(5),
  deck: createDeck(20),
};

const endTurn: Move<GameState> = ({ G, ctx, events }) => {
  // Switch to the next player
  events.endTurn();
  // Reset mana for the next turn
  G.players[ctx.currentPlayer].mana = G.players[ctx.currentPlayer].maxMana;
};

const HeathStoneGame: Game<GameState> = {
  name: "hearthstone",
  setup: setupData,
};

const Hearthstone = Client({
  board: Board,
  game: HeathStoneGame,
});

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return <Hearthstone />;
}
