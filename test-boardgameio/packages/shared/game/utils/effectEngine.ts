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
