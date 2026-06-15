// utils/validateMove.ts
import type { Card, TargetValue, GameState } from "../types";
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
  | "must-attack-taunt"
  | "summon-sickness"
  | "frozen"
  | "stealthed";

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
 * Battlecry validation: Check if target matches card's battlecryTargets (bypasses taunt)
 */
export function isValidTargetTypeForBattlecry(
  card: Card,
  targetType: "card" | "player" | "lane",
  targetPlayerID: PlayerID,
  currentPlayerID: PlayerID,
): boolean {
  if (!card.battlecryTargets || card.battlecryTargets.length === 0) {
    return false;
  }

  const isFriendly = targetPlayerID === currentPlayerID;

  return card.battlecryTargets.some((validTarget) => {
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

  // Check if there's a pending battlecry
  if (G.activeBattlecryMinion) {
    // Only allow the battlecry minion to act or allow other moves if it's a different card being placed
    if (
      G.activeBattlecryMinion.cardId !== cardId &&
      location === "hand" &&
      !card.isPlaced
    ) {
      // Allow placing new cards even with pending battlecry (player can play other cards first)
      // Continue with normal validation
    } else if (
      G.activeBattlecryMinion.cardId === cardId &&
      location === "board" &&
      target
    ) {
      // This is the battlecry resolution - use battlecryTargets for validation
      const validTarget = isValidTargetTypeForBattlecry(
        card,
        target.type,
        target.player,
        ctx.currentPlayer,
      );

      if (!validTarget) {
        return { valid: false, error: "invalid-target" };
      }

      // Battlecries bypass taunt - no taunt check needed
      return { valid: true };
    } else if (
      G.activeBattlecryMinion.cardId !== cardId &&
      location === "board"
    ) {
      // Trying to use a different placed card while battlecry is pending
      return { valid: false, error: "must-attack-taunt" }; // Reusing error code
    }
  }

  // Minions must be placed on the board (not directly targeted)
  if (!card.isPlaced && card.isMinion && target && target.type !== "lane") {
    return { valid: false, error: "minion-needs-board" };
  }

  // Board limit for minions
  if (
    !card.isPlaced &&
    card.isMinion &&
    G.board[ctx.currentPlayer].length >= 7
  ) {
    return { valid: false, error: "board-full" };
  }

  // Mana check for unplaced cards
  if (!card.isPlaced && player.mana < (card.mana || 0)) {
    return { valid: false, error: "not-enough-mana" };
  }

  // Validate lane placement for unplaced minions
  if (!card.isPlaced && card.isMinion && target?.type === "lane") {
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

    // check if target is minion  and if minion is stealthed
    if (target.type === "card" && target.id) {
      // fetch card
      const targetCard = G.board[target.player].find((c) => c.id == target.id);
      if (targetCard && targetCard.stealth) {
        return { valid: false, error: "stealthed" };
      }
    }

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

  if (card.summoningSickness) {
    return { valid: false, error: "summon-sickness" };
  }

  if (card.frozen) {
    return { valid: false, error: "frozen" };
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
  if (!activeCard.isPlaced && activeCard.isMinion) {
    return targetType === "lane" && targetPlayerID === currentPlayer;
  }

  // Check if this is a battlecry minion
  const isBattlecryMinion =
    gameState?.activeBattlecryMinion?.cardId === activeCard.id;

  // Placed cards that already attacked can't target anything (unless battlecry)
  if (activeCard.isPlaced && activeCard.hasAttacked && !isBattlecryMinion) {
    return false;
  }

  // For battlecry minions, use battlecryTargets for validation
  if (isBattlecryMinion) {
    const isValidType = isValidTargetTypeForBattlecry(
      activeCard,
      targetType,
      targetPlayerID,
      currentPlayer,
    );

    // Battlecries bypass taunt, so return immediately
    return isValidType;
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
