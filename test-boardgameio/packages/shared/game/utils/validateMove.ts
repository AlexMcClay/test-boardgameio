// utils/validateMove.ts
import { getAttack, getCurrentHealth, getManaCost, getMaxHealth } from ".";
import type {
  Card,
  TargetValue,
  GameState,
  TargetCondition,
  TargetQuery,
} from "../types";
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
 * Validates a target against a TargetQuery specification
 * Used for the new targeting system
 */
export function validateTargetQuery(
  query: TargetQuery,
  sourceID: string,
  G: GameState | null,
  currentPlayerID: PlayerID,
  targetValue: TargetValue,
) {
  const isFriendly = targetValue.player === currentPlayerID;

  const targetCard =
    targetValue.type === "card"
      ? G?.board[targetValue.player].find((c) => c.id === targetValue.id)
      : undefined;

  return query.type.some((type) => {
    switch (type) {
      case "card": {
        if (!targetCard) return false;
        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return (
          query.conditions?.every((condition) =>
            matchCondition(targetCard, condition, sourceID),
          ) ?? true
        );
      }
      case "player": {
        if (targetValue.type !== "player") return false;
        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return true;
      }
      case "lane": {
        if (targetValue.type !== "lane") return false;
        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return true;
      }
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
    if (
      G.activeBattlecryMinion.cardId !== cardId &&
      location === "hand" &&
      !card.isPlaced
    ) {
      // Allow placing new cards even with pending battlecry
    } else if (
      G.activeBattlecryMinion.cardId === cardId &&
      location === "board" &&
      target
    ) {
      const validTarget = validateTargetQuery(
        card.battlecryQuery!,
        card.id,
        G,
        ctx.currentPlayer,
        target,
      );

      if (!validTarget) {
        return { valid: false, error: "invalid-target" };
      }

      return { valid: true };
    } else if (
      G.activeBattlecryMinion.cardId !== cardId &&
      location === "board"
    ) {
      return { valid: false, error: "must-attack-taunt" };
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
  if (!card.isPlaced && player.mana < getManaCost(card)) {
    return { valid: false, error: "not-enough-mana" };
  }

  // Validate lane placement for unplaced minions
  if (!card.isPlaced && card.isMinion && target?.type === "lane") {
    if (target.player !== ctx.currentPlayer) {
      return { valid: false, error: "invalid-target" };
    }
    return { valid: true };
  }

  // Spell cards with required targets
  if (card.isSpell && !target) {
    return { valid: false, error: "spell-needs-target" };
  }

  // Check if valid target is provided
  if (target) {
    const validTarget = validateTargetQuery(
      card.targetQuery,
      card.id,
      G,
      ctx.currentPlayer,
      target,
    );

    // check if target is minion and if minion is stealthed
    if (target.type === "card" && target.id) {
      const targetCard = G.board[target.player].find((c) => c.id == target.id);
      if (targetCard && targetCard.stealth) {
        return { valid: false, error: "stealthed" };
      }
    }

    if (!validTarget) {
      return { valid: false, error: "invalid-target" };
    }

    // --- RUSH MECHANIC CHECK ---
    // If a minion has Rush but NOT Charge, and still has summon sickness, it cannot target a player/hero
    if (card.isMinion && card.summoningSickness && card.rush && !card.charge) {
      if (target.type === "player") {
        return { valid: false, error: "invalid-target" };
      }
    }

    // TAUNT MECHANIC: Check if trying to bypass taunt
    const isTargetingEnemy = target.player !== ctx.currentPlayer;
    if (isTargetingEnemy && !isTauntBypassAllowed(card)) {
      const enemyBoard = G.board[target.player];
      const enemyHasTaunt = hasTauntMinions(enemyBoard);

      if (enemyHasTaunt) {
        if (target.type === "player") {
          return { valid: false, error: "must-attack-taunt" };
        }

        if (target.type === "card") {
          const targetCard = enemyBoard.find((c) => c.id === target.id);
          if (!targetCard || !targetCard.taunt) {
            return { valid: false, error: "must-attack-taunt" };
          }
        }
      }
    }
  }

  // --- SUMMONING SICKNESS CHECK ---
  // Bypass summoning sickness if the minion has Charge OR Rush
  if (card.summoningSickness && !card.charge && !card.rush) {
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
    const isValidType = validateTargetQuery(
      activeCard.battlecryQuery!,
      activeCard.id,
      gameState,
      currentPlayer,
      {
        type: targetType,
        player: targetPlayerID,
        id: targetCardId || "",
      },
    );

    // Battlecries bypass taunt, so return immediately
    return isValidType;
  }

  // Check basic target type validity
  const isValidType = validateTargetQuery(
    activeCard.targetQuery,
    activeCard.id,
    gameState,
    currentPlayer,
    {
      type: targetType,
      player: targetPlayerID,
      id: targetCardId || "",
    },
  );

  if (!isValidType) return false;

  // --- RUSH MECHANIC UI CHECK ---
  // If rushing minion has summon sickness and doesn't have charge, it cannot highlight the enemy player
  if (
    activeCard.isMinion &&
    activeCard.summoningSickness &&
    activeCard.rush &&
    !activeCard.charge
  ) {
    if (targetType === "player") {
      return false;
    }
  }

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

/**
 * Evaluates whether a single card satisfies a specific targeted rule condition
 */
function matchCondition(
  card: Card,
  condition: TargetCondition,
  conditionSourceID: string,
): boolean {
  switch (condition.type) {
    case "boolean":
      // Safely evaluates truthiness (handles undefined properties as false)
      return !!card[condition.key] === condition.value;

    case "numeric": {
      const cardValue =
        condition.key === "attack"
          ? getAttack(card)
          : condition.key === "health"
            ? getCurrentHealth(card)
            : getManaCost(card);
      const targetValue = condition.value;
      switch (condition.operator) {
        case "==":
          return cardValue === targetValue;
        case "!=":
          return cardValue !== targetValue;
        case ">":
          return cardValue > targetValue;
        case ">=":
          return cardValue >= targetValue;
        case "<":
          return cardValue < targetValue;
        case "<=":
          return cardValue <= targetValue;
      }
    }

    case "text-contains": {
      const text = card[condition.key]?.toLowerCase() ?? "";
      return text.includes(condition.value.toLowerCase());
    }

    case "tags-include": {
      // Assuming your card type array is card.tags: string[] (e.g. ["Wisp", "Token"])
      const tags = card.type ?? [];
      return tags.some(
        (tag) => tag.toLowerCase() === condition.value.toLowerCase(),
      );
    }

    case "state-match": {
      const health = getCurrentHealth(card);
      const maxHealth = getMaxHealth(card);
      if (condition.condition === "isDamaged") return health < maxHealth;
      if (condition.condition === "isUndamaged") return health === maxHealth;
      return true;
    }

    case "exclude-self":
      return card.id !== conditionSourceID;

    default:
      return false;
  }
}
