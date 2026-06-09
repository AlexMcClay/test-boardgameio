// Utility to detect animation events by comparing game states
import type { GameState } from "@/types";
import type { DeathAnimation } from "@/types/animations";
import type { PlayerID } from "boardgame.io";

/**
 * Compares two game states and detects which cards died
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @returns Array of death animations for cards that were removed
 */
export function detectDeaths(
  stateBefore: GameState,
  stateAfter: GameState,
): DeathAnimation[] {
  const deaths: DeathAnimation[] = [];

  // Check both players' boards
  (["0", "1"] as PlayerID[]).forEach((playerId) => {
    const boardBefore = stateBefore.board[playerId];
    const boardAfter = stateAfter.board[playerId];

    // Find cards that existed before but not after
    boardBefore.forEach((card) => {
      const stillExists = boardAfter.some((c) => c.id === card.id);
      if (!stillExists) {
        deaths.push({
          type: "death",
          cardId: card.id,
          playerId,
        });
      }
    });
  });

  return deaths;
}
