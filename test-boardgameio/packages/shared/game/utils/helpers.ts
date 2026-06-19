import { getCurrentHealth, getMaxHealth } from ".";
import {
  type ApplyModifierEffect,
  type BaseEffectSelection,
  type Card,
  type CardModifier,
  type DynamicValue,
  type EffectTypes,
  type GameEvent,
  type GameState,
} from "../types";
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
