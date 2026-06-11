/**
 * Example: How to enable AI opponent in your Hearthstone Clone
 *
 * This file demonstrates how to set up a game with an AI opponent.
 * You can use this as a starting point or integrate it into your existing setup.
 */

import { Client } from "boardgame.io/react";
import { Local } from "boardgame.io/multiplayer";
import Board from "@/components/Board";
import { HeathStoneGame } from "./index";
import { MCTSBot } from "boardgame.io/ai";
import { enumerateAIMoves } from "./ai";
import type { State } from "boardgame.io";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Create your custom bot class
class FastMCTSBot extends MCTSBot {
  constructor(config: any) {
    super({
      ...config,
      iterations: 80, // Your custom iterations count
      playoutDepth: 15, // Your custom depth
      enumerate: enumerateAIMoves,
      game: HeathStoneGame,
    });
  }

  // Override the internal play method to add a delay
  async play(state: State, playerID: any) {
    const allPossibleOptions = enumerateAIMoves(state.G, state.ctx);

    console.log(
      `All available legal moves (${allPossibleOptions.length}):`,
      allPossibleOptions,
    );

    // 1. Let the original MCTS algorithm instantly calculate the best move
    const action = await super.play(state, playerID);

    // 2. Wait for 1.5 seconds (1500ms) to let the UI breathe
    await delay(750);

    // 3. Return the move to boardgame.io to be executed
    console.log("AI chose action:", action.action.payload);
    return action;
  }
}

/**
 * Hearthstone Client with AI Opponent
 *
 * This creates a game where:
 * - Player 0 (you) plays manually
 * - Player 1 (AI) makes automatic moves
 */
export const HearthstoneWithAI = Client({
  board: Board,
  game: HeathStoneGame,
  numPlayers: 2,

  // Enable local multiplayer with AI bot
  multiplayer: Local({
    bots: {
      // 2. Pass the class constructor here without using 'new'
      "1": FastMCTSBot,
    },
  }),

  // Keep debug panel visible to see AI thinking
  debug: {
    collapseOnLoad: true,
    hideToggleButton: true,
  },
});

export default HearthstoneWithAI;
