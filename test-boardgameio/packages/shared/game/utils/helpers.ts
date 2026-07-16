import {
  createCardFromID,
  getCurrentHealth,
  getMaxHealth,
  getManaCost,
} from ".";
import { cardTemplates } from "../data/cards";
import {
  type AddToHandEffect,
  type ApplyModifierEffect,
  type BaseEffectSelection,
  type Card,
  type CardModifier,
  type EffectContext,
  type EffectTypes,
  type GameEvent,
  type GameState,
  type Player,
} from "../types";
import { checkSingleTargetCondition } from "./effectEngine";
// Helper function to record game events
export function recordEvent(G: GameState, event: GameEvent) {
  // Monotonic sequence number = index in the full history. Clients filter by
  // this instead of timestamps (which collide within the same millisecond).
  event.seq = G.eventHistory.length;

  // Add to current move events
  G.gameEvents.push(event);

  // Also add to persistent history for debugging
  G.eventHistory.push(event);
}

/**
 * Applies an ApplyModifierEffect to a card's or player's modifier list with
 * stacking semantics:
 * - `effect.stackable === true`: every application pushes its own modifier.
 * - otherwise (default): a modifier from the same sourceCardId for the same
 *   stat is REPLACED in place — and a value of 0 removes it entirely.
 * Only `permanent`/`temporary` entries participate; `aura`/`inHand`/`enrage`
 * entries are owned by the refreshOngoing passes (see syncManagedModifiers).
 * Records an applyModifier event whenever the list actually changed.
 */
function applyModifierWithStacking(
  G: GameState,
  sourceId: string,
  target: Card | Player,
  targetType: "card" | "player",
  playerId: string,
  effect: ApplyModifierEffect,
  value: number,
) {
  const isTemporary = !!effect.duration;
  const lifecycle =
    isTemporary && effect.duration
      ? {
          sourcePlayerId: playerId, // The active player casting the spell/battlecry
          expiryTrigger: effect.duration.expiryTrigger,
          expiryOwner: effect.duration.expiryOwner,
          turnsRemaining: effect.duration.turnsRemaining ?? 1,
        }
      : undefined;

  if (target.modifiers === undefined) {
    target.modifiers = [];
  }
  const list = target.modifiers;

  if (!effect.stackable) {
    const existingIndex = list.findIndex(
      (m) =>
        (m.type === "permanent" || m.type === "temporary") &&
        m.sourceCardId === sourceId &&
        m.stat === effect.stat,
    );
    if (existingIndex !== -1) {
      if (value === 0) {
        list.splice(existingIndex, 1);
      } else {
        const existing = list[existingIndex];
        existing.value = value;
        existing.override = effect.override;
        existing.type = isTemporary ? "temporary" : "permanent";
        existing.lifecycle = lifecycle;
      }
      recordEvent(G, {
        type: "applyModifier",
        sourceId,
        key: effect.stat,
        value,
        playerId,
        timestamp: Date.now(),
        targetId: target.id,
        targetType,
      });
      return;
    }
    // Nothing to replace and nothing to add — silent no-op
    if (value === 0) return;
  }

  list.push({
    id: `mod-${sourceId}-${effect.stat}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    sourceCardId: sourceId, // Tracks which card created this buff
    stat: effect.stat,
    value: value,
    type: isTemporary ? "temporary" : "permanent",
    override: effect.override,
    lifecycle,
  });

  recordEvent(G, {
    type: "applyModifier",
    sourceId,
    key: effect.stat,
    value,
    playerId,
    timestamp: Date.now(),
    targetId: target.id,
    targetType,
  });
}

export function proccessApplyModifier(
  G: GameState,
  sourceId: string,
  targetCard: Card, // This is our target minion
  playerId: string,
  effect: ApplyModifierEffect,
  value: number,
) {
  applyModifierWithStacking(
    G,
    sourceId,
    targetCard,
    "card",
    playerId,
    effect,
    value,
  );
}

export function processApplyModifierToPlayer(
  G: GameState,
  sourceId: string,
  targetPlayer: Player,
  playerId: string,
  effect: ApplyModifierEffect,
  value: number,
) {
  applyModifierWithStacking(
    G,
    sourceId,
    targetPlayer,
    "player",
    playerId,
    effect,
    value,
  );
}

/** Desired state of one managed (aura/inHand/enrage) modifier on one target. */
export interface ManagedModifierSpec {
  sourceCardId: string;
  stat: CardModifier["stat"];
  value: number;
  override: boolean;
}

/**
 * Diff-syncs ALL managed modifiers of one type on one card/player against the
 * desired list. Adds missing entries, updates changed values, removes stale
 * ones (recording an applyModifier event with value 0) — and stays completely
 * silent when nothing changed, so the refresh passes can run after every move
 * without spamming the event log. Duplicate (source, stat) specs are summed.
 */
export function syncManagedModifiers(
  G: GameState,
  owner: Card | Player,
  ownerType: "card" | "player",
  ownerPlayerId: string,
  modifierType: "aura" | "inHand" | "enrage",
  desired: ManagedModifierSpec[],
) {
  const hasAny = (owner.modifiers?.length ?? 0) > 0;
  if (!hasAny && desired.length === 0) return;
  if (owner.modifiers === undefined) {
    owner.modifiers = [];
  }
  const list = owner.modifiers;

  const keyOf = (source: string, stat: string) => `${source}|${stat}`;
  const desiredByKey = new Map<string, ManagedModifierSpec>();
  desired.forEach((spec) => {
    const key = keyOf(spec.sourceCardId, spec.stat);
    const existing = desiredByKey.get(key);
    if (existing && !spec.override && !existing.override) {
      existing.value += spec.value;
    } else {
      desiredByKey.set(key, { ...spec });
    }
  });

  const recordChange = (source: string, stat: string, value: number) => {
    recordEvent(G, {
      type: "applyModifier",
      sourceId: source,
      key: stat,
      value,
      playerId: ownerPlayerId,
      timestamp: Date.now(),
      targetId: owner.id,
      targetType: ownerType,
    });
  };

  // Update or remove existing managed entries of this type
  for (let i = list.length - 1; i >= 0; i--) {
    const mod = list[i];
    if (mod.type !== modifierType) continue;
    const key = keyOf(mod.sourceCardId, mod.stat);
    const want = desiredByKey.get(key);
    if (!want) {
      list.splice(i, 1);
      recordChange(mod.sourceCardId, mod.stat, 0);
    } else {
      if (want.value !== mod.value || want.override !== mod.override) {
        mod.value = want.value;
        mod.override = want.override;
        recordChange(mod.sourceCardId, mod.stat, want.value);
      }
      desiredByKey.delete(key); // handled (changed or already correct)
    }
  }

  // Add the entries that don't exist yet
  desiredByKey.forEach((want) => {
    list.push({
      id: `mod-${want.sourceCardId}-${want.stat}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sourceCardId: want.sourceCardId,
      stat: want.stat,
      value: want.value,
      type: modifierType,
      override: want.override,
    });
    recordChange(want.sourceCardId, want.stat, want.value);
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

export function applyBoolEffectToPlayer(
  G: GameState,
  sourceId: string,
  targetPlayer: Player,
  effectType: "freeze" | "divineShield",
  playerKey: keyof Player,
) {
  if (!targetPlayer) return;

  // Dynamically set the player property to true (e.g. targetPlayer.frozen = true)
  (targetPlayer as any)[playerKey] = true;

  recordEvent(G, {
    type: effectType,
    sourceId: sourceId,
    targetId: targetPlayer.id,
    targetType: "player",
    playerId: targetPlayer.id,
    timestamp: Date.now(),
  } as GameEvent);
}

/**
 * A frozen character unfreezes at the end of the turn in which it was still
 * capable of attacking (i.e. it hasn't used up its attack(s) for the turn).
 * If it couldn't act this turn at all (summoning sickness with no Charge/Rush,
 * or Rush with no valid enemy minion to strike) or has already used up all its
 * attacks, it stays frozen and is re-checked at the end of its controller's
 * next turn instead.
 */
export function shouldMinionUnfreezeAtTurnEnd(
  G: GameState,
  ownerId: string,
  card: Card,
): boolean {
  if (card.summoningSickness && !card.charge && !card.rush) {
    return false;
  }

  if (card.summoningSickness && card.rush && !card.charge) {
    const enemyId = ownerId === "0" ? "1" : "0";
    if (G.board[enemyId].length === 0) return false;
  }

  return card.attacksLeft > 0;
}

export function shouldHeroUnfreezeAtTurnEnd(player: Player): boolean {
  return player.attacksLeft > 0;
}

export function dealDamageToPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  damageAmount: number,
  sourceEventIndex?: number,
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
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(targetPlayer)),
  });
}

export function healPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  amount: number,
  sourceEventIndex?: number,
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
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(player)),
  });
}

export function dealDamageToCard(
  G: GameState,
  sourceId: string,
  targetCard: Card, // This is our target minion
  targetPlayerId: string,
  damageAmount: number,
  sourceEventIndex?: number,
) {
  if (!targetCard || !targetCard.isMinion) return;
  let hadDivineShield = false;

  // 1. DIVINE SHIELD CHECK: Intercept positive damage values
  if (targetCard.divineShield && damageAmount > 0) {
    // Pop the bubble!
    targetCard.divineShield = false;
    hadDivineShield = true;
  }

  const actualDamage = hadDivineShield && damageAmount > 0 ? 0 : damageAmount;

  // Instead of subtracting directly from health, increase damage taken!
  targetCard.damageTaken += actualDamage;

  // 2. STANDARD DAMAGE FALLBACK (If no shield is present or damage is 0)
  recordEvent(G, {
    type: "damage",
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    value: actualDamage,
    timestamp: Date.now(),
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(targetCard)),
  });
}

export function healCard(
  G: GameState,
  sourceId: string,
  targetCard: Card,
  playerId: string,
  amount: number,
  sourceEventIndex?: number,
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
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(targetCard)),
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
  modifiers?: ApplyModifierEffect[],
  source: "deck" | "global" | "graveyard" | "hand" | "board" = "global",
  sourceEventIndex?: number,
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
      eventRef: sourceEventIndex,
      snapshot: JSON.parse(JSON.stringify(card)),
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
  sourceEventIndex?: number,
) {
  // Remove card from board
  const boardIndex = G.board[ownerID].findIndex((c) => c.id === card.id);
  if (boardIndex !== -1) {
    G.board[ownerID].splice(boardIndex, 1);
  }

  // Strip all modifiers and reset to base state
  const resetCard = stripCardModifiers(card);

  // Add to hand with new modifiers
  addCardToHand(G, ownerID, resetCard, modifiers, "board", sourceEventIndex);

  recordEvent(G, {
    type: "returnToHand",
    cardId: resetCard.id,
    playerId: ownerID,
    timestamp: Date.now(),
    card: resetCard,
    fromBoard: true,
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(resetCard)),
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
  effect: AddToHandEffect,
  context: EffectContext,
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
  sourceEventIndex?: number,
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
        eventRef: sourceEventIndex,
        snapshot: JSON.parse(JSON.stringify(card)),
      });
    } else {
      console.warn("card not found", card.id, card.title);
    }
  });
}
