// utils/validateMove.ts
import type { Card, TargetValue, GameState } from "@/types";
import type { Ctx, PlayerID } from "boardgame.io";

export type MoveValidationError =
  | "card-not-found"
  | "minion-needs-board"
  | "board-full"
  | "not-enough-mana"
  | "spell-needs-target"
  | "invalid-target"
  | "already-attacked"
  | "no-active-card"
  | "not-your-turn"
  | "must-attack-taunt";

export type MoveValidationResult =
  | { valid: true }
  | { valid: false; error: MoveValidationError };

/**
 * Helper: Check if a board has any taunt minions
 */
export function hasTauntMinions(board: Card[]): boolean {
  return board.some((card) => card.taunt === true);
}

/**
 * Helper: Check if a card can bypass taunt (spells can, minions cannot)
 */
export function isTauntBypassAllowed(card: Card): boolean {
  return card.isSpell === true;
}

/**
 * Core validation: Check if target matches card's target types
 */
export function isValidTargetType(
  card: Card,
  targetType: "card" | "player" | "lane",
  targetPlayerID: PlayerID,
  currentPlayerID: PlayerID,
): boolean {
  const isFriendly = targetPlayerID === currentPlayerID;

  return card.targets.some((validTarget) => {
    switch (validTarget) {
      case "card":
        return targetType === "card";
      case "player":
        return targetType === "player";
      case "card-friendly":
        return targetType === "card" && isFriendly;
      case "card-opponent":
        return targetType === "card" && !isFriendly;
      case "player-friendly":
        return targetType === "player" && isFriendly;
      case "player-opponent":
        return targetType === "player" && !isFriendly;
      case "lane-friendly":
        return targetType === "lane" && isFriendly;
      case "lane-opponent":
        return targetType === "lane" && !isFriendly;
      default:
        return false;
    }
  });
}

/**
 * Full move validation for game logic
 * Used in placeCard move function
 */
export function validateMove(
  G: GameState,
  ctx: Ctx,
  cardId: string,
  location: "hand" | "board",
  target?: TargetValue,
): MoveValidationResult {
  const player = G.players[ctx.currentPlayer];
  const card =
    location === "hand"
      ? player.hand.find((c) => c.id === cardId)
      : G.board[ctx.currentPlayer].find((c) => c.id === cardId);

  if (!card) {
    return { valid: false, error: "card-not-found" };
  }

  // Minions must be placed on the board (not directly targeted)
  if (!card.isPlaced && card.isMinnion && target && target.type !== "lane") {
    return { valid: false, error: "minion-needs-board" };
  }

  // Board limit for minions
  if (
    !card.isPlaced &&
    card.isMinnion &&
    G.board[ctx.currentPlayer].length >= 7
  ) {
    return { valid: false, error: "board-full" };
  }

  // Mana check for unplaced cards
  if (!card.isPlaced && player.mana < (card.mana || 0)) {
    return { valid: false, error: "not-enough-mana" };
  }

  // Validate lane placement for unplaced minions
  if (!card.isPlaced && card.isMinnion && target?.type === "lane") {
    // Minions can only be placed on friendly lanes
    if (target.player !== ctx.currentPlayer) {
      return { valid: false, error: "invalid-target" };
    }
    // Valid placement - return early (lanes aren't in targets array)
    return { valid: true };
  }

  // Spell cards with required targets
  if (card.isSpell && card.targets.length > 0 && !target) {
    return { valid: false, error: "spell-needs-target" };
  }

  // Check if valid target is provided
  if (target && card.targets.length > 0) {
    const validTarget = isValidTargetType(
      card,
      target.type,
      target.player,
      ctx.currentPlayer,
    );

    if (!validTarget) {
      return { valid: false, error: "invalid-target" };
    }

    // TAUNT MECHANIC: Check if trying to bypass taunt
    const isTargetingEnemy = target.player !== ctx.currentPlayer;
    if (isTargetingEnemy && !isTauntBypassAllowed(card)) {
      const enemyBoard = G.board[target.player];
      const enemyHasTaunt = hasTauntMinions(enemyBoard);

      if (enemyHasTaunt) {
        // If targeting enemy hero, must attack taunt instead
        if (target.type === "player") {
          return { valid: false, error: "must-attack-taunt" };
        }

        // If targeting an enemy card, it must be a taunt minion
        if (target.type === "card") {
          const targetCard = enemyBoard.find((c) => c.id === target.id);
          if (!targetCard || !targetCard.taunt) {
            return { valid: false, error: "must-attack-taunt" };
          }
        }
      }
    }
  }

  // Card already attacked
  if (card.isPlaced && card.hasAttacked) {
    return { valid: false, error: "already-attacked" };
  }

  return { valid: true };
}

/**
 * Lightweight validation for UI highlighting
 * Used in dragStore and components
 */
export function canTargetHighlight(
  activeCard: Card | null,
  currentPlayer: PlayerID | null,
  targetType: "card" | "player" | "lane",
  targetPlayerID: PlayerID,
  gameState: GameState | null,
  targetCardId?: string,
): boolean {
  if (!activeCard || !currentPlayer) return false;

  // Unplaced minions can only target lanes
  if (!activeCard.isPlaced && activeCard.isMinnion) {
    return targetType === "lane" && targetPlayerID === currentPlayer;
  }

  // Placed cards that already attacked can't target anything
  if (activeCard.isPlaced && activeCard.hasAttacked) {
    return false;
  }

  // Check basic target type validity
  const isValidType = isValidTargetType(
    activeCard,
    targetType,
    targetPlayerID,
    currentPlayer,
  );

  if (!isValidType) return false;

  // TAUNT MECHANIC: Check if trying to bypass taunt in UI
  if (gameState) {
    const isTargetingEnemy = targetPlayerID !== currentPlayer;
    if (isTargetingEnemy && !isTauntBypassAllowed(activeCard)) {
      const enemyBoard = gameState.board[targetPlayerID];
      const enemyHasTaunt = hasTauntMinions(enemyBoard);

      if (enemyHasTaunt) {
        // If targeting enemy hero, must attack taunt instead
        if (targetType === "player") {
          return false;
        }

        // If targeting an enemy card, it must be a taunt minion
        if (targetType === "card" && targetCardId) {
          const targetCard = enemyBoard.find((c) => c.id === targetCardId);
          if (!targetCard || !targetCard.taunt) {
            return false;
          }
        }
      }
    }
  }

  return true;
}
