import {
  createCardFromID,
  getCurrentHealth,
  getMaxHealth,
  getManaCost,
} from ".";
import { cardTemplates } from "../data/cards";
import {
  type ApplyModifierEffect,
  type BaseEffectSelection,
  type Card,
  type CardModifier,
  type EffectTypes,
  type GameEvent,
  type GameState,
} from "../types";
import { checkSingleTargetCondition } from "./effectEngine";
// Helper function to record game events
export function recordEvent(G: GameState, event: GameEvent) {
  // Add to current move events
  G.gameEvents.push(event);

  // Also add to persistent history for debugging
  G.eventHistory.push(event);
}

export function proccessApplyModifier(
  G: GameState,
  sourceId: string,
  targetCard: Card, // This is our target minion
  playerId: string,
  effect: ApplyModifierEffect,
  value: number,
) {
  // Determine what lifecycle layer this modifier belongs to
  const isTemporary = !!effect.duration;

  // 3. Build out the unified clean modifier instance object
  const newModifier: CardModifier = {
    // Generate a simple deterministic unique ID for tracking/debugging
    id: `mod-${sourceId}-${effect.stat}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    sourceCardId: sourceId, // Tracks which card created this buff
    stat: effect.stat,
    value: value,
    type: isTemporary ? "temporary" : "permanent",
    override: effect.override,

    // 4. Inject runtime tracking data into the modifier lifecycle if it has a duration
    lifecycle:
      isTemporary && effect.duration
        ? {
            sourcePlayerId: playerId, // The active player casting the spell/battlecry
            expiryTrigger: effect.duration.expiryTrigger,
            expiryOwner: effect.duration.expiryOwner,
            turnsRemaining: effect.duration.turnsRemaining ?? 1,
          }
        : undefined,
  };

  // 5. Safely push it into our card's modifier scratchpad
  if (targetCard.modifiers === undefined) {
    targetCard.modifiers = [];
  }
  targetCard.modifiers.push(newModifier);

  recordEvent(G, {
    type: "applyModifier",
    sourceId: sourceId,
    key: effect.stat,
    value: value,
    playerId: playerId,
    timestamp: Date.now(),
    targetId: targetCard.id,
    targetType: "card",
  });
}

export function applyBoolEffectToCard(
  G: GameState,
  sourceId: string,
  targetCard: Card,
  targetPlayerId: string,
  effectType:
    | "freeze"
    | "divineShield"
    | "taunt"
    | "stealth"
    | "charge"
    | "rush"
    | "windfury",
  cardKey: keyof Card,
) {
  if (!targetCard) return;

  // Dynamically set the card property to true (e.g. targetCard.taunt = true)
  (targetCard as any)[cardKey] = true;

  // This matches your GameEvent type definitions exactly
  recordEvent(G, {
    type: effectType,
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    timestamp: Date.now(),
  } as GameEvent);
}

export function dealDamageToPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  damageAmount: number,
) {
  const targetPlayer = G.players[targetPlayerId];
  if (!targetPlayer) return;
  let hadDivineShield = false;

  // 1. DIVINE SHIELD CHECK: Intercept positive damage values
  if (targetPlayer.divineShield && damageAmount > 0) {
    // Pop the bubble!
    targetPlayer.divineShield = false;
    hadDivineShield = true;
    damageAmount = 0;
  }

  const armorDamage = Math.min(targetPlayer.armor, damageAmount);
  targetPlayer.armor -= armorDamage;
  const remainingDamage = damageAmount - armorDamage;
  targetPlayer.health -= remainingDamage;

  recordEvent(G, {
    type: "damage",
    sourceId: sourceId,
    targetId: targetPlayerId,
    targetType: "player",
    playerId: targetPlayerId,
    value: hadDivineShield && damageAmount > 0 ? 0 : damageAmount,
    timestamp: Date.now(),
  });
}

export function healPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  amount: number,
) {
  const player = G.players[targetPlayerId];
  if (!player) return;

  const actualHeal = Math.min(amount, player.maxHealth - player.health);
  if (actualHeal <= 0) return; // No healing needed (already at full health)

  player.health += actualHeal;

  recordEvent(G, {
    type: "heal",
    sourceId,
    targetId: targetPlayerId,
    targetType: "player",
    playerId: targetPlayerId,
    value: actualHeal,
    timestamp: Date.now(),
  });
}

export function dealDamageToCard(
  G: GameState,
  sourceId: string,
  targetCard: Card, // This is our target minion
  targetPlayerId: string,
  damageAmount: number,
) {
  if (!targetCard || !targetCard.isMinion) return;
  let hadDivineShield = false;

  // 1. DIVINE SHIELD CHECK: Intercept positive damage values
  if (targetCard.divineShield && damageAmount > 0) {
    // Pop the bubble!
    targetCard.divineShield = false;
    hadDivineShield = true;
  }

  // 2. STANDARD DAMAGE FALLBACK (If no shield is present or damage is 0)
  recordEvent(G, {
    type: "damage",
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    value: hadDivineShield && damageAmount > 0 ? 0 : damageAmount,
    timestamp: Date.now(),
  });

  // Instead of subtracting directly from health, increase damage taken!
  targetCard.damageTaken +=
    hadDivineShield && damageAmount > 0 ? 0 : damageAmount;
}

export function healCard(
  G: GameState,
  sourceId: string,
  targetCard: Card,
  playerId: string,
  amount: number,
) {
  if (!targetCard || !targetCard.isMinion) return;

  const actualHeal = Math.min(
    amount,
    getMaxHealth(targetCard) - getCurrentHealth(targetCard),
  );
  if (actualHeal <= 0) return; // Already at full health

  targetCard.damageTaken -= actualHeal;

  recordEvent(G, {
    type: "heal",
    sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId,
    value: actualHeal,
    timestamp: Date.now(),
  });
}

const types: EffectTypes["type"][] = [
  "applyModifier",
  "damage",
  "destroy",
  "divineShield",
  "freeze",
  "charge",
  "heal",
  "rush",
  "stealth",
  "taunt",
  "storeVar",
];

//  as BaseEffectSelection
export function isBaseEffectSelection(
  effect: EffectTypes,
  // @ts-ignore
): effect is BaseEffectSelection {
  return types.includes(effect.type);
}

// NEW HELPERS FOR ADD TO HAND / RETURN TO HAND MECHANICS

/**
 * Adds a card to a player's hand, handling hand limit (10 cards max)
 * If hand is full, card is burned (added to burntCards array)
 */
export function addCardToHand(
  G: GameState,
  playerID: string,
  card: Card,
  modifiers?: import("../types").ApplyModifierEffect[],
  source: "deck" | "global" | "graveyard" | "hand" | "board" = "global",
) {
  const player = G.players[playerID];

  // Apply modifiers if provided
  if (modifiers && modifiers.length > 0) {
    modifiers.forEach((modEffect) => {
      const value = typeof modEffect.value === "number" ? modEffect.value : 0;
      proccessApplyModifier(G, card.id, card, playerID, modEffect, value);
    });
  }

  // Check hand limit
  if (player.hand.length >= 10) {
    // Hand is full - burn the card
    player.burntCards.push(card);
    recordEvent(G, {
      type: "burnCard",
      cardId: card.id,
      playerId: playerID,
      timestamp: Date.now(),
      card,
    });
    console.log(`Card ${card.title} was burned (hand full)`);
  } else {
    // Add to hand
    player.hand.push(card);
    recordEvent(G, {
      type: "addToHand",
      cardId: card.id,
      playerId: playerID,
      timestamp: Date.now(),
      card,
      source,
    });
  }
}

/**
 * Returns a card from the board to its owner's hand
 * Strips all modifiers and resets the card to base state
 */
export function returnCardToHand(
  G: GameState,
  card: Card,
  ownerID: string,
  modifiers?: import("../types").ApplyModifierEffect[],
) {
  // Remove card from board
  const boardIndex = G.board[ownerID].findIndex((c) => c.id === card.id);
  if (boardIndex !== -1) {
    G.board[ownerID].splice(boardIndex, 1);
  }

  // Strip all modifiers and reset to base state
  const resetCard = stripCardModifiers(card);

  // Add to hand with new modifiers
  addCardToHand(G, ownerID, resetCard, modifiers, "board");

  recordEvent(G, {
    type: "returnToHand",
    cardId: resetCard.id,
    playerId: ownerID,
    timestamp: Date.now(),
    card: resetCard,
    fromBoard: true,
  });
}

/**
 * Resets a card to its original base state by removing all modifiers and buffs
 * Preserves the card's unique ID for tracking
 */
export function stripCardModifiers(card: Card): Card {
  // Create a fresh copy from the original template
  const freshCard = createCardFromID(card.originalID as any);

  if (!freshCard) {
    console.warn(`Cannot find template for card ${card.originalID}`);
    // Fallback: just clear modifiers manually
    return {
      ...card,
      modifiers: [],
      damageTaken: 0,
      isPlaced: false,
      summoningSickness: false,
      attacksLeft: card.windfury ? 2 : 1,
    };
  }

  // Preserve the unique card ID for tracking
  freshCard.id = card.id;

  return freshCard;
}

/**
 * Finds cards from various sources (deck, global pool, graveyard, etc.)
 * and returns an array of cards matching the given conditions
 */
export function findCardsInPool(
  G: GameState,
  playerID: string,
  effect: import("../types").AddToHandEffect,
  context: import("../types").EffectContext,
): Card[] {
  let pool: Card[] = [];
  const player = G.players[playerID];
  const count = typeof effect.value === "number" ? effect.value : 1;

  // Handle specific cardID(s)
  if (effect.cardID) {
    const cardIDs = Array.isArray(effect.cardID)
      ? effect.cardID
      : [effect.cardID];
    cardIDs.forEach((id) => {
      for (let i = 0; i < count; i++) {
        const card = createCardFromID(id as any);
        if (card) pool.push(card);
      }
    });
    return pool;
  }

  // Build pool based on source
  switch (effect.source) {
    case "deck":
      pool = [...player.deck];
      break;

    case "global":
      // Search all card templates
      pool = Object.keys(cardTemplates)
        .map((id) => createCardFromID(id as any))
        .filter((card): card is Card => card !== null);
      break;

    case "graveyard":
      pool = G.graveyard
        .filter((g) => g.originalOwner === playerID)
        .map((g) => {
          const card = createCardFromID(g.card.originalID as any);
          return card;
        })
        .filter((card): card is Card => card !== null);
      break;

    case "hand":
      pool = [...player.hand];
      break;

    case "board":
      // This will be handled by target resolution logic
      pool = [];
      break;
  }

  // Filter by conditions
  if (effect.conditions && effect.conditions.length > 0) {
    pool = pool.filter((card) =>
      effect.conditions!.every((cond) =>
        checkSingleTargetCondition(card, cond, context),
      ),
    );
  }

  // Apply randomization
  if (effect.rand && effect.rand.n > 0) {
    // Shuffle and take n random cards
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    pool = shuffled.slice(0, Math.min(effect.rand.n, pool.length));
  } else if (effect.rand && effect.rand.n < 0) {
    // Take last n cards (e.g., for "last drawn card")
    pool = pool.slice(effect.rand.n);
  }

  // Handle removeFromSource
  if (effect.removeFromSource && effect.source === "deck") {
    // Remove selected cards from deck
    pool.forEach((selectedCard) => {
      const index = player.deck.findIndex((c) => c.id === selectedCard.id);
      if (index !== -1) {
        player.deck.splice(index, 1);
      }
    });
  } else if (effect.removeFromSource && effect.source === "graveyard") {
    // Remove from graveyard
    pool.forEach((selectedCard) => {
      const index = G.graveyard.findIndex((g) => g.card.id === selectedCard.id);
      if (index !== -1) {
        G.graveyard.splice(index, 1);
      }
    });
  } else if (effect.removeFromSource && effect.source === "hand") {
    // Remove from hand
    pool.forEach((selectedCard) => {
      const index = player.hand.findIndex((c) => c.id === selectedCard.id);
      if (index !== -1) {
        player.hand.splice(index, 1);
      }
    });
  } else if (effect.source !== "global" && !effect.removeFromSource) {
    // Create copies instead of using originals
    pool = pool.map((card) => {
      const copy = createCardFromID(card.originalID as any);
      return copy || card;
    });
  }

  return pool;
}

/**
 * Discard cards from a player's hand based on the specified strategy
 * Tracks discarded cards in the discardedCards array
 */
export function discardCardsFromHand(
  currentCardId: string,
  G: GameState,
  playerId: string,
  count: number,
  strategy: "random" | "highest-cost" | "lowest-cost" | "all",
  turn: number,
) {
  const player = G.players[playerId];

  // Filter out the current card so it cannot be discarded by its own effect
  const eligibleHand = player.hand.filter((card) => card.id !== currentCardId);
  if (eligibleHand.length === 0) return;

  let cardsToDiscard: Card[] = [];

  switch (strategy) {
    case "random":
      // Shuffle and take first N cards from eligible hand
      const shuffled = [...eligibleHand].sort(() => Math.random() - 0.5);
      cardsToDiscard = shuffled.slice(0, Math.min(count, eligibleHand.length));
      break;

    case "highest-cost":
      // Sort eligible hand by cost descending, take top N
      const sortedHigh = [...eligibleHand].sort(
        (a, b) => getManaCost(b) - getManaCost(a),
      );
      cardsToDiscard = sortedHigh.slice(
        0,
        Math.min(count, eligibleHand.length),
      );
      break;

    case "lowest-cost":
      // Sort eligible hand by cost ascending, take top N
      const sortedLow = [...eligibleHand].sort(
        (a, b) => getManaCost(a) - getManaCost(b),
      );
      cardsToDiscard = sortedLow.slice(0, Math.min(count, eligibleHand.length));
      break;

    case "all":
      // Discard entire eligible hand
      cardsToDiscard = [...eligibleHand];
      break;
  }

  // Remove cards from hand and track them
  cardsToDiscard.forEach((card) => {
    const index = player.hand.findIndex((c) => c.id === card.id);
    if (index !== -1) {
      player.hand.splice(index, 1);

      // Track in discardedCards
      G.discardedCards.push({
        card: JSON.parse(JSON.stringify(card)),
        originalOwner: playerId,
        discardedOnTurn: turn,
        strategy: strategy,
      });

      // Record event for animations
      recordEvent(G, {
        type: "discard",
        cardId: card.id,
        playerId: playerId,
        timestamp: Date.now(),
        card: card,
        strategy: strategy,
      });
    } else {
      console.warn("card not found", card.id, card.title);
    }
  });
}
