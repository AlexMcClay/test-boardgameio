// effectEngine.ts or helpers.ts
import {
  getCurrentHealth,
  getAttack,
  getCurrentDurability,
  getManaCost,
  getMaxHealth,
  getPlayerAttack,
  hasKeyword,
} from "./index";
import { MODIFIER_BOOL_KEYS } from "./helpers";
import type {
  Card,
  DynamicValue,
  EffectContext,
  ModifierBoolKey,
  TargetCondition,
  BaseEffectSelection,
} from "../types";

export function resolveDynamicValue(
  val: number | DynamicValue,
  context: EffectContext,
): number {
  if (typeof val === "number") return val;

  const { G, playerID, excessDamageDealt, lastDamageDealt } = context;
  const enemyId = playerID === "0" ? "1" : "0";
  const multiplier = typeof val.mult === "number" ? val.mult : 1;

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

    case "player-missing-health": {
      const p =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      baseValue = Math.max(0, p.maxHealth - p.health);
      break;
    }

    case "cards-played-turn":
      baseValue = G.eventHistory.filter(
        (e) => e.type === "cardPlayed" && e.turn === context.ctx.turn,
      ).length;
      break;

    case "player-max-mana":
    case "player-mana-cap": {
      const p =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      baseValue = val.type === "player-max-mana" ? p.maxMana : p.manaCap;
      break;
    }

    case "player-attack": {
      // Weapon and hero buffs included — getPlayerAttack is the same fold the
      // hero's own attacks use, so Savagery matches what the hero would hit for.
      const p =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      baseValue = getPlayerAttack(p);
      break;
    }

    case "hand-diff": {
      // How many MORE cards the other side holds. Never negative, so
      // "draw until you match" is a no-op when you're already ahead.
      const mine =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      const theirs =
        val.player === "friendly" ? G.players[enemyId] : G.players[playerID];
      baseValue = Math.max(0, theirs.hand.length - mine.hand.length);
      break;
    }

    case "weapon-durability": {
      // Charges left on the equipped weapon; 0 when unarmed.
      const p =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      baseValue = p.weapon ? getCurrentDurability(p.weapon) : 0;
      break;
    }

    case "weapon-attack": {
      // Attack of the equipped weapon, its buffs included (Deadly Poison), so
      // Bloodsail Raider matches what the weapon actually hits for. 0 unarmed.
      const p =
        val.player === "friendly" ? G.players[playerID] : G.players[enemyId];
      baseValue = p.weapon ? getAttack(p.weapon) : 0;
      break;
    }

    case "card-stat":
      if (!context.card) {
        baseValue = 0;
        break;
      }
      if (val.stat === "attack") baseValue = getAttack(context.card);
      if (val.stat === "health") baseValue = getCurrentHealth(context.card);
      if (val.stat === "maxHealth") baseValue = getMaxHealth(context.card);
      if (val.stat === "mana") baseValue = getManaCost(context.card);
      if (val.stat === "damageTaken") baseValue = context.card.damageTaken;
      // Printed Overload only. A card whose overload is itself a DynamicValue
      // has no fixed answer here, so it reads as 0 rather than guessing.
      if (val.stat === "overload")
        baseValue =
          typeof context.card.overload === "number" ? context.card.overload : 0;

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
            checkSingleTargetCondition(card, cond, context, context.card?.id),
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

    case "combo-count": {
      baseValue =
        G.eventHistory.filter(
          (e) => e.type === "cardPlayed" && e.turn === context.ctx.turn,
        ).length - 1; // subtracting this card played
      console.log(
        G.eventHistory.filter(
          (e) => e.type === "cardPlayed" && e.turn === context.ctx.turn,
        ),
        G.eventHistory.filter(
          (e) => e.type === "cardPlayed" && e.turn === context.ctx.turn,
        ).length,
      );
      break;
    }

    case "damage-dealt":
      baseValue = lastDamageDealt ?? 0;
      break;
  }

  return Math.round(baseValue * multiplier);
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
    case "boolean": {
      // Keyword flags go through hasKeyword so a MODIFIER-granted keyword
      // counts too — reading card[key] raw meant a minion given Taunt by Mark
      // of the Wild never satisfied a `taunt: true` condition. The remaining
      // BooleanCardKeys (isMinion/isSpell/summoningSickness) aren't keywords
      // and keep the plain read.
      const isKeyword = condition.key in MODIFIER_BOOL_KEYS;
      const actual = isKeyword
        ? hasKeyword(card, condition.key as ModifierBoolKey)
        : !!card[condition.key];
      return actual === condition.value;
    }

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
      const hit = text.includes(condition.value.toLowerCase());
      return condition.negate ? !hit : hit;
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
    case "exclude-target":
      return context.target?.id !== card.id;
    case "is-friendly":
      return context.target?.player === context.playerID;

    // Board state, not a property of `card` — the candidate is passed through
    // untouched. "friendly" is the acting player (the aura provider's owner
    // when this runs inside refreshOngoing, the caster for a played card).
    case "has-weapon": {
      const enemyId = context.playerID === "0" ? "1" : "0";
      const side =
        condition.side === "friendly" ? context.playerID : enemyId;
      return !!context.G.players[side]?.weapon;
    }

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
        id: context.card!.id,
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

    // Everything that can be damaged or healed: both heroes AND every minion.
    // Heroes go in first so a random split (Mad Bomber) treats them as equal
    // candidates rather than favouring board order.
    case "all-characters":
      (["0", "1"] as const).forEach((pId) => {
        pool.push({ type: "player", id: pId, ownerId: pId });
        G.board[pId].forEach((c) => {
          pool.push({ type: "card", id: c.id, ownerId: pId, cardRef: c });
        });
      });
      break;

    case "adjacent": {
      // Neighbors of context.card in its own zone: the board when the card is
      // placed there, else the hand ("Cards adjacent to this in hand ...").
      if (!context.card) break;
      const sourceId = context.card.id;
      let zone = G.board[playerID];
      let index = zone.findIndex((c) => c.id === sourceId);
      if (index === -1) {
        zone = G.players[playerID].hand;
        index = zone.findIndex((c) => c.id === sourceId);
      }
      if (index === -1) break;
      [zone[index - 1], zone[index + 1]].forEach((c) => {
        if (c) {
          pool.push({ type: "card", id: c.id, ownerId: playerID, cardRef: c });
        }
      });
      break;
    }

    case "adjacent-target": {
      // Neighbors of the user-selected target's board position (e.g. Explosive Shot)
      if (!target || target.type !== "card") break;
      const zone = G.board[target.player];
      const index = zone.findIndex((c) => c.id === target.id);
      if (index === -1) break;
      [zone[index - 1], zone[index + 1]].forEach((c) => {
        if (c) {
          pool.push({
            type: "card",
            id: c.id,
            ownerId: target.player,
            cardRef: c,
          });
        }
      });
      break;
    }

    case "friendly-hand":
      G.players[playerID].hand.forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: playerID, cardRef: c });
      });
      break;

    case "enemy-hand":
      G.players[enemyId].hand.forEach((c) => {
        pool.push({ type: "card", id: c.id, ownerId: enemyId, cardRef: c });
      });
      break;

    case "friendly-weapon": {
      // The equipped weapon lives on the player (not on the board), so cardRef
      // carries the reference; downstream handlers fall back to it.
      const weapon = G.players[playerID].weapon;
      if (weapon) {
        pool.push({
          type: "card",
          id: weapon.id,
          ownerId: playerID,
          cardRef: weapon,
        });
      }
      break;
    }

    case "enemy-weapon": {
      const weapon = G.players[enemyId].weapon;
      if (weapon) {
        pool.push({
          type: "card",
          id: weapon.id,
          ownerId: enemyId,
          cardRef: weapon,
        });
      }
      break;
    }
  }

  // 2. Filter Targets based on specific card conditions (e.g., "to all TAUNT minions")
  if (effect.conditions && effect.conditions.length > 0) {
    pool = pool.filter((t) => {
      if (t.type === "player") {
        // Most conditions read properties of a card, which a hero doesn't have,
        // so a hero can't satisfy them and is dropped. The IDENTITY filters are
        // the exception: they only ask "is this the source / the chosen
        // target?", which is a perfectly meaningful question about a hero.
        //
        // This is what lets "all OTHER characters" (Mad Bomber) keep both
        // heroes. It also fixes Swipe, whose `enemy-all` + exclude-target never
        // reached the enemy hero for its 1 splash damage.
        return effect.conditions!.every((cond) =>
          cond.type === "exclude-self"
            ? t.id !== context.card?.id
            : cond.type === "exclude-target"
              ? !(context.target?.type === "player" && context.target.id === t.id)
              : false,
        );
      }
      if (!t.cardRef) return false;
      return effect.conditions!.every((cond) =>
        // Pass the acting card's id so "exclude-self" can actually match
        checkSingleTargetCondition(t.cardRef!, cond, context, context.card?.id),
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
