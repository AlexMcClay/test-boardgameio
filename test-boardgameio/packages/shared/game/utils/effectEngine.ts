// effectEngine.ts or helpers.ts
import {
  getCurrentHealth,
  getAttack,
  getManaCost,
  getMaxHealth,
} from "./index";
import type {
  GameState,
  Card,
  DynamicValue,
  EffectContext,
  TargetCondition,
  DamageEffect,
  BaseEffectSelection,
} from "../types";

export function resolveDynamicValue(
  val: number | DynamicValue,
  context: EffectContext,
): number {
  if (typeof val === "number") return val;

  const { G, playerID, excessDamageDealt, lastDamageDealt } = context;
  const enemyId = playerID === "0" ? "1" : "0";
  const multiplier = val.mult ?? 1;

  let baseValue = 0;

  switch (val.type) {
    case "player-armor":
      if (val.player === "friendly") baseValue = G.players[playerID].armor;
      else if (val.player === "enemy") baseValue = G.players[enemyId].armor;
      else baseValue = G.players["0"].armor + G.players["1"].armor;
      break;
    case "temp": {
      return context.temp ?? 0;
    }

    case "player-health":
      if (val.player === "friendly") baseValue = G.players[playerID].health;
      else if (val.player === "enemy") baseValue = G.players[enemyId].health;
      else baseValue = G.players["0"].health + G.players["1"].health;
      break;

    case "card-stat":
      if (val.stat === "attack") baseValue = getAttack(context.card);
      if (val.stat === "health") baseValue = getCurrentHealth(context.card);
      if (val.stat === "maxHealth") baseValue = getMaxHealth(context.card);
      if (val.stat === "mana") baseValue = getManaCost(context.card);

      break;

    case "minion-count": {
      let targets: Card[] = [];
      if (val.side === "friendly" || val.side === "all")
        targets = targets.concat(G.board[playerID]);
      if (val.side === "enemy" || val.side === "all")
        targets = targets.concat(G.board[enemyId]);

      // Filter count using your exact target criteria recursively!
      if (val.conditions) {
        targets = targets.filter((card) =>
          val.conditions!.every((cond) =>
            checkSingleTargetCondition(card, cond, context),
          ),
        );
      }
      baseValue = targets.length;
      break;
    }

    case "hand-count": {
      // Assuming you have G.players[id].hand: Card[]
      let count = 0;
      if (val.side === "friendly" || val.side === "all")
        count += G.players[playerID].hand.length;
      if (val.side === "enemy" || val.side === "all")
        count += G.players[enemyId].hand.length;
      baseValue = count;
      break;
    }

    case "excess-damage":
      baseValue = excessDamageDealt ?? 0;
      break;

    case "damage-dealt":
      baseValue = lastDamageDealt ?? 0;
      break;
  }

  return baseValue * multiplier;
}

/**
 * Evaluates whether a single card satisfies a specific targeted rule condition
 */
export function checkSingleTargetCondition(
  card: Card,
  condition: TargetCondition,
  context: EffectContext,
  conditionSourceID?: string,
): boolean {
  switch (condition.type) {
    case "boolean":
      // Safely evaluates truthiness (handles undefined properties as false)
      return !!card[condition.key] === condition.value;

    case "numeric": {
      const cardValue = resolveDynamicValue(condition.key, {
        ...context,
        card: card,
      });
      const targetValue = resolveDynamicValue(condition.value, context);
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
      const tags = [...(card.type ?? []), ...(card.tags ?? [])];
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

export interface ResolvedTarget {
  type: "card" | "player";
  id: string;
  ownerId: string;
  cardRef?: Card; // Direct reference if it's a minion
}

export function resolveTargets(
  effect: BaseEffectSelection,
  context: EffectContext,
): ResolvedTarget[] {
  const { G, playerID, target } = context;
  const enemyId = playerID === "0" ? "1" : "0";
  let pool: ResolvedTarget[] = [];

  // 1. Gather Base Structural Targets
  switch (effect.target) {
    case "user-select":
      if (target) {
        pool.push({
          type: target.type === "lane" ? "card" : target.type,
          id: target.id,
          ownerId: target.player,
          cardRef:
            target.type === "card"
              ? G.board[target.player].find((c) => c.id === target.id)
              : undefined,
        });
      }
      break;
    case "self": {
      pool.push({
        type: "card",
        id: context.card.id,
        ownerId: playerID,
        cardRef: context.card,
      });

      break;
    }

    case "friendly-hero":
      pool.push({ type: "player", id: playerID, ownerId: playerID });
      break;

    case "friendly-board":
      G.board[playerID].forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: playerID, cardRef: c });
      });
      break;

    case "friendly-all":
      pool.push({ type: "player", id: playerID, ownerId: playerID });
      G.board[playerID].forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: playerID, cardRef: c });
      });
      break;

    case "enemy-hero":
      pool.push({ type: "player", id: enemyId, ownerId: enemyId });
      break;

    case "enemy-board":
      G.board[enemyId].forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: enemyId, cardRef: c });
      });
      break;

    case "enemy-all":
      pool.push({ type: "player", id: enemyId, ownerId: enemyId });
      G.board[enemyId].forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: enemyId, cardRef: c });
      });
      break;

    case "board":
      Object.entries(G.board).forEach(([player, minions]) => {
        minions.forEach((c) => {
          pool.push({ type: "card", id: c.id, ownerId: player, cardRef: c });
        });
      });
      break;
  }

  // 2. Filter Targets based on specific card conditions (e.g., "to all TAUNT minions")
  if (effect.conditions && effect.conditions.length > 0) {
    pool = pool.filter((t) => {
      if (t.type === "player") return false; // Conditions typically inspect cards
      if (!t.cardRef) return false;
      return effect.conditions!.every((cond) =>
        checkSingleTargetCondition(t.cardRef!, cond, context),
      );
    });
  }

  // 3. Apply Random Sampling (e.g., "deal damage to 3 random minions" or "destroy all except 1")
  if (effect.rand) {
    pool = applyRandomFilters(pool, effect.rand);
  }

  return pool;
}

// Simple deterministic shuffle sample helper for boardgame.io context
function applyRandomFilters(
  pool: ResolvedTarget[],
  rand: { split: boolean; n: number },
): ResolvedTarget[] {
  if (pool.length === 0) return pool;

  // Clone array to safely mutate or shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  if (rand.n > 0) {
    return shuffled.slice(0, rand.n); // "3 random minions"
  } else if (rand.n < 0) {
    const takeCount = Math.max(0, pool.length + rand.n); // pool.length - 1 ("All except 1")
    return shuffled.slice(0, takeCount);
  }

  return pool;
}
