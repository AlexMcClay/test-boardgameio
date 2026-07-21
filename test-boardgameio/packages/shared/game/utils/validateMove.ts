// utils/validateMove.ts
import { getManaCost, getPlayerAttack } from ".";
import type {
  Card,
  TargetValue,
  GameState,
  TargetQuery,
  EffectContextWithOptionalCard,
  Ctx,
  PlayerID,
} from "../types";

import { checkSingleTargetCondition } from "./effectEngine";

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

export function hasTargets(
  query: TargetQuery,
  context: EffectContextWithOptionalCard,
  sourceID: string,
) {
  // @ts-ignore
  const { G, target, playerID } = context;
  const mainPlayer = playerID;
  const enemyPlayer = mainPlayer == "0" ? "1" : "0";
  // const friendlyP = G.players[mainPlayer];
  // const enemyP = G.players[enemyPlayer];
  // const friendlyDeck = friendlyP.deck;
  // const enemyDeck = enemyP.deck;
  const friendlyBoard = G.board[mainPlayer];
  const enemyBoard = G.board[enemyPlayer];

  // friendly board
  const hasFriendlyTarget = friendlyBoard.some((c) =>
    validateTargetQuery(
      query,
      {
        ...context,
        card: c,
        target: {
          id: c.id,
          player: mainPlayer,
          type: "card",
        },
      },
      sourceID,
    ),
  );

  // friendly hero
  const fHero = validateTargetQuery(
    query,
    {
      ...context,
      target: {
        id: mainPlayer,
        player: mainPlayer,
        type: "player",
      },
    },
    sourceID,
  );

  const fLane = validateTargetQuery(
    query,
    {
      ...context,
      target: {
        id: `lane-${mainPlayer}`,
        player: mainPlayer,
        type: "lane",
      },
    },
    sourceID,
  );

  // enemy board
  const hasEnemyTarget = enemyBoard.some((c) =>
    validateTargetQuery(
      query,
      {
        ...context,
        card: c,
        target: {
          id: c.id,
          player: enemyPlayer,
          type: "card",
        },
      },
      sourceID,
    ),
  );
  const eHero = validateTargetQuery(
    query,
    {
      ...context,
      target: {
        id: enemyPlayer,
        player: enemyPlayer,
        type: "player",
      },
    },
    sourceID,
  );

  const eLane = validateTargetQuery(
    query,
    {
      ...context,
      target: {
        id: `lane-${enemyPlayer}`,
        player: enemyPlayer,
        type: "lane",
      },
    },
    sourceID,
  );

  return (
    hasEnemyTarget || hasFriendlyTarget || eHero || fHero || eLane || fLane
  );
}

/**
 * Validates a target against a TargetQuery specification
 * Used for the new targeting system
 */
export function validateTargetQuery(
  query: TargetQuery,
  context: EffectContextWithOptionalCard,
  sourceID: string,
) {
  const { G, target, playerID } = context;
  const isFriendly = target?.player === playerID;

  const targetCard =
    target?.type === "card"
      ? G?.board[target?.player].find((c) => c.id === target?.id)
      : undefined;

  return query.type.some((type) => {
    switch (type) {
      case "card": {
        if (!targetCard) return false;

        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return (
          query.conditions?.every((condition) =>
            checkSingleTargetCondition(
              targetCard,
              condition,
              {
                G,
                playerID: playerID,
                ctx: context.ctx,
                location: "board",
                card: targetCard,
                type: "minion",
              },
              sourceID,
            ),
          ) ?? true
        );
      }
      case "player": {
        if (target?.type !== "player") return false;
        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return true;
      }
      case "lane": {
        if (target?.type !== "lane") return false;
        if (query.side === "enemy" && isFriendly) return false;
        if (query.side === "friendly" && !isFriendly) return false;
        return true;
      }
    }
  });
}

const MOVE_TARGET_ERRORS = {
  "target-not-found": "invalid-target",
  stealthed: "stealthed",
  taunt: "must-attack-taunt",
} as const;

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
        {
          card: card,
          G,
          ctx,
          target,
          location: location,
          playerID: ctx.currentPlayer,
        },
        card.id,
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
      {
        card: card,
        G,
        ctx,
        target,
        location: location,
        playerID: ctx.currentPlayer,
      },
      card.id,
    );

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
    // Shared stealth + taunt rules
    const restriction = checkTargetRestrictions(G, ctx.currentPlayer, target, {
      bypassTaunt: isTauntBypassAllowed(card),
    });
    if (!restriction.ok) {
      return { valid: false, error: MOVE_TARGET_ERRORS[restriction.reason] };
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
  if (card.isPlaced && card.attacksLeft == 0) {
    return { valid: false, error: "already-attacked" };
  }

  return { valid: true };
}

export function validateHeroAttack(
  G: GameState,
  ctx: Ctx,
  target: TargetValue,
): { valid: boolean; error?: string } {
  const attackerId = ctx.currentPlayer as PlayerID;
  const attacker = G.players[attackerId];
  const defenderId = target.player;

  if (attackerId === defenderId) {
    return { valid: false, error: "Cannot attack your own side." };
  }
  if (attacker.frozen) {
    return { valid: false, error: "Hero is frozen." };
  }
  if (attacker.attacksLeft <= 0) {
    return { valid: false, error: "Hero has already attacked this turn." };
  }
  if (getPlayerAttack(attacker) <= 0) {
    return {
      valid: false,
      error: "Hero has no attack (equip a weapon first).",
    };
  }
  if (target.type !== "card" && target.type !== "player") {
    return { valid: false, error: "Invalid target type for hero attack." };
  }

  const restriction = checkTargetRestrictions(G, attackerId, target);
  if (!restriction.ok) {
    return { valid: false, error: restriction.reason };
  }

  return { valid: true };
}

export type TargetRestrictionReason =
  | "target-not-found"
  | "stealthed"
  | "taunt";

export type TargetRestrictionResult =
  | { ok: true }
  | { ok: false; reason: TargetRestrictionReason };

/**
 * Shared stealth + taunt targeting rules used by both card/spell targeting
 * (validateMove) and hero attacks (validateHeroAttack).
 *
 *  - A stealthed minion can never be targeted directly.
 *  - If the defending player controls any *non-stealthed* Taunt minion, the
 *    target must be one of those Taunt minions — unless taunt is bypassed.
 *
 * Returns a neutral result; each caller maps `reason` to its own error text.
 */
export function checkTargetRestrictions(
  G: GameState,
  attackerPlayer: PlayerID,
  target: TargetValue,
  opts: { bypassTaunt?: boolean } = {},
): TargetRestrictionResult {
  const defenderBoard = G.board[target.player];

  const targetCard =
    target.type === "card"
      ? defenderBoard.find((c) => c.id === target.id)
      : undefined;

  // --- STEALTH ---
  if (target.type === "card") {
    if (!targetCard) return { ok: false, reason: "target-not-found" };
    if (targetCard.stealth) return { ok: false, reason: "stealthed" };
  }

  // --- TAUNT --- (only enemy taunts count; a stealthed Taunt does not enforce)
  const isTargetingEnemy = target.player !== attackerPlayer;
  if (isTargetingEnemy && !opts.bypassTaunt) {
    const enemyHasTaunt = defenderBoard.some((c) => c.taunt && !c.stealth);
    if (enemyHasTaunt) {
      if (target.type === "player") return { ok: false, reason: "taunt" };
      if (target.type === "card" && !targetCard!.taunt) {
        return { ok: false, reason: "taunt" };
      }
    }
  }

  return { ok: true };
}

/**
 * Lightweight validation for UI highlighting
 * Used in dragStore and components
 */
export function canTargetHighlight(
  activeCard: Card | null,
  context: EffectContextWithOptionalCard,
): boolean {
  if (!activeCard || !context.playerID) return false;

  // Unplaced minions can only target lanes
  if (!activeCard.isPlaced && activeCard.isMinion) {
    return (
      context?.target?.type === "lane" &&
      context?.target?.player === context.playerID
    );
  }

  // Check if this is a battlecry minion
  const isBattlecryMinion =
    context.G?.activeBattlecryMinion?.cardId === activeCard.id;

  // Placed cards that already attacked can't target anything (unless battlecry)
  if (
    activeCard.isPlaced &&
    activeCard.attacksLeft == 0 &&
    !isBattlecryMinion
  ) {
    return false;
  }

  // For battlecry minions, use battlecryTargets for validation
  if (isBattlecryMinion && context.target) {
    const isValidType = validateTargetQuery(
      activeCard.battlecryQuery!,
      { ...context, card: activeCard },
      activeCard.id,
    );

    // Battlecries bypass taunt, so return immediately
    return isValidType;
  }

  // Check basic target type validity
  if (!context.target) return false;
  const isValidType = validateTargetQuery(
    activeCard.targetQuery,
    { ...context, card: activeCard },
    activeCard.id,
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
    if (context.target.type === "player") {
      return false;
    }
  }

  // TAUNT MECHANIC: Check if trying to bypass taunt in UI
  if (context.G) {
    const isTargetingEnemy = context.target.player !== context.playerID;
    if (isTargetingEnemy && !isTauntBypassAllowed(activeCard)) {
      const enemyBoard = context.G.board[context.target.player];
      const enemyHasTaunt = hasTauntMinions(enemyBoard);

      if (enemyHasTaunt) {
        // If targeting enemy hero, must attack taunt instead
        if (context.target.type === "player") {
          return false;
        }

        // If targeting an enemy card, it must be a taunt minion
        if (context.target.type === "card" && context.target.id) {
          const targetCard = enemyBoard.find(
            (c) => c.id === context?.target?.id,
          );
          if (!targetCard || !targetCard.taunt) {
            return false;
          }
        }
      }
    }
  }

  return true;
}
