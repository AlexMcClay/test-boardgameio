import { createFileRoute } from "@tanstack/react-router";
import logo from "../logo.svg";

import { Client } from "boardgame.io/react";
import { Local } from "boardgame.io/multiplayer";
import { MCTSBot } from "boardgame.io/ai";
import Board from "@/components/Board";
import type { PlayerID, Game, Move, Ctx } from "boardgame.io";
import type { GameState, Player } from "@/types";
import { createDeck } from "@/utils";

export const isVictory = ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
  if (G.players[0].hp <= 0) {
    return { winner: "1" };
  } else if (G.players[1].hp <= 0) {
    return { winner: "0" };
  }
};

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
    maxMana: 1,
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
  mana: 10,
  hand: createDeck(5),
  deck: createDeck(5),
};

const p1: Player = {
  id: "1",
  name: "Player 2",
  maxHp: 30,
  hp: 30,
  maxArmor: 0,
  armor: 0,
  mana: 10,
  hand: createDeck(5),
  deck: createDeck(5),
};

const placeCard: Move<GameState> = ({ G, ctx }, cardId: string) => {
  const player = G.players[ctx.currentPlayer];
  const cardIndex = player.hand.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) return; // Card not found in hand

  const card = player.hand[cardIndex];
  if (player.mana < (card.mana || 0)) {
    console.warn("Not enough mana to play the card");
    return; // Not enough mana to play the card
  } // Not enough mana to play the card

  // Place the card on the board
  G.board[ctx.currentPlayer].push(card);
  player.hand.splice(cardIndex, 1); // Remove the card from hand
  player.mana -= card.mana || 0; // Deduct mana cost
};

const drawCard: Move<GameState> = ({ G, ctx }) => {
  handleDrawCard(G, ctx);
};

function handleDrawCard(G: GameState, ctx: Ctx) {
  const player = G.players[ctx.currentPlayer];
  if (player.deck.length > 0) {
    const drawnCard = player.deck.pop();
    if (drawnCard) {
      player.hand.push(drawnCard);
    }
  } else {
    // Handle case when deck is empty, e.g., damage player or reshuffle
    console.warn("Deck is empty, cannot draw a card.");
  }
}

const HeathStoneGame: Game<GameState> = {
  name: "hearthstone",
  setup: setupData,
  moves: { drawCard, placeCard },
  turn: {
    onBegin: ({ G, ctx }) => {
      // Reset mana at the start of each turn
      // Draw a card at the start of the turn
      if (ctx.turn % 2) {
        G.maxMana = Math.round(ctx.turn / 2);
      }
      G.players[ctx.currentPlayer].mana = G.maxMana;
      if (ctx.turn > 1) {
        handleDrawCard(G, ctx);
      }
    },
  },
  endIf: isVictory,
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
