// Helpers for reading the mulligan-completion event slice.
import type { GameEvent } from "@project/shared";

/**
 * Finds the card drawn by the first turn's beginTurn inside a mulligan
 * completion slice ([...replacement drawCards, mulligan, drawCard, beginTurn]).
 * Scanning backwards from the beginTurn event, the first drawCard is the turn
 * draw — replacement draws all precede the mulligan event.
 *
 * Used to keep the turn-drawn card out of the overlay's reveal stage and to
 * delay its appearance in the hand until after the mulligan cards settle.
 */
export function getMulliganTurnDrawCardId(events: GameEvent[]): string | null {
  const beginIndex = events.findIndex((e) => e.type === "beginTurn");
  if (beginIndex === -1) return null;
  for (let i = beginIndex - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === "drawCard") return event.cardId;
    if (event.type === "mulligan") break;
  }
  return null;
}
