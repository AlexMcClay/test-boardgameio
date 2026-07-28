import type { Ctx } from "boardgame.io";
import type {
  GameState,
  Card,
  Player,
  TargetValue,
  TargetQuery,
  EffectTypes,
  EffectContext,
  HeroPower,
} from "./types";
import {
  canAfford,
  createCardFromID,
  getAttack,
  getCurrentHealth,
  getManaCost,
  getMaxHealth,
  getPlayerAttack,
  getSpendableMana,
  hasKeyword,
  isUserSelectValue,
} from "./utils";
import { resolveDynamicValue } from "./utils/effectEngine";
import {
  checkTargetRestrictions,
  validateMove,
  validateTargetQuery,
} from "./utils/validateMove";

// Types for AI moves
export type AIMove = {
  move: string;
  args: any[];
  score: number;
  description?: string; // For debugging
};

/**
 * Main AI enumerate function - generates all possible valid moves
 * This is called by boardgame.io's AI to determine what moves are available
 */
export function enumerateAIMoves(G: GameState, ctx: Ctx): AIMove[] {
  // Check move count limit - if exceeded 100 moves, return empty to end turn

  const moves: AIMove[] = [];
  const player = G.players[ctx.currentPlayer];

  // Special case: a Choose One / Discover prompt owns the action completely —
  // applyMove rejects everything else (engine.ts "choice-pending"), so
  // enumerating anything else would just spin the search on illegal moves.
  // Checked BEFORE the battlecry branch: a battlecry can open a Discover
  // (Selective Breeder), and the prompt is what's actually pending then.
  if (G.pendingChoice) {
    return enumerateChoiceMoves(G, ctx);
  }

  // Special case: If there's a pending battlecry, enumerate target selection
  if (G.activeBattlecryMinion) {
    const battlecryMoves = enumerateBattlecryTargets(G, ctx);
    // Also allow canceling the battlecry
    battlecryMoves.push({
      move: "cancelBattlecry",
      args: [],
      score: -50, // Low priority - prefer to use battlecry
      description: "Cancel battlecry",
    });
    return battlecryMoves;
  }

  // Enumerate all possible card plays from hand
  const handMoves = enumerateHandPlays(G, ctx, player);
  moves.push(...handMoves);

  // Enumerate all possible attacks from board
  const attackMoves = enumerateAttacks(G, ctx);
  moves.push(...attackMoves);

  // Enumerate hero power usage
  const heroPowerMoves = enumerateHeroPower(G, ctx, player);
  moves.push(...heroPowerMoves);

  // Enumerate hero (weapon) attacks
  const heroAttackMoves = enumerateHeroAttacks(G, ctx, player);
  moves.push(...heroAttackMoves);

  // Calculate intelligent endTurn score based on game state
  const wastedMana = getSpendableMana(player);
  const handSize = player.hand.length;
  const boardSize = G.board[ctx.currentPlayer].length;
  let endTurnScore = 0;

  // Heavily penalize wasting mana
  if (wastedMana >= 5) {
    endTurnScore -= 60; // Big penalty for wasting lots of mana
  } else if (wastedMana >= 3) {
    endTurnScore -= 40; // Moderate penalty
  } else if (wastedMana >= 1) {
    endTurnScore -= 20; // Small penalty for wasting a little mana
  }

  // Bonus if hand is empty or nearly empty
  if (handSize === 0) {
    endTurnScore += 30; // No cards to play anyway
  } else if (handSize <= 2 && wastedMana < 3) {
    endTurnScore += 10; // Few cards, might want to save them
  }

  // If board is full and no attacks available, passing might be reasonable
  if (boardSize >= 7 && attackMoves.length === 0) {
    endTurnScore += 15;
  }

  // Never pass up lethal. The +1000 bonuses in scoreAttack / scoreHeroAttack /
  // evaluateEffect mark a winning line; without this guard the playout policy
  // (which samples among the top few moves) could roll "end turn" on it.
  const hasLethal = moves.some((move) => move.score >= 900);
  if (hasLethal) {
    endTurnScore -= 500;
  }

  // Sort by score descending
  const scoredMoves = [...moves].sort((a, b) => b.score - a.score);

  // Ending the turn is ALWAYS an option. It used to be enumerated only when
  // fewer than two other moves existed, which meant MCTS could never choose to
  // hold a card — the bot emptied its hand every turn no matter how bad the
  // plays were. Now the search weighs passing against playing like any other
  // move, so it can keep an AoE for a board worth clearing, or decline to
  // overcommit. It is appended AFTER the cap so a wide board can't crowd it out.
  const top = scoredMoves.slice(0, 19);
  top.push({
    move: "endTurn",
    args: [],
    score: endTurnScore,
    description: "End turn",
  });
  top.sort((a, b) => b.score - a.score);

  return top;
}

/**
 * Enumerate the picks for an open Choose One / Discover prompt.
 *
 * Unlike enumerateBattlecryTargets, this builds the candidate list from every
 * character on the board and runs the REAL validator over it, rather than
 * re-deriving side/type rules — the option cards' targetQueries are ordinary
 * ones and there's no reason to hand-roll them a second time.
 */
function enumerateChoiceMoves(G: GameState, ctx: Ctx): AIMove[] {
  const pending = G.pendingChoice!;
  const moves: AIMove[] = [];
  const enemyId = ctx.currentPlayer === "0" ? "1" : "0";

  pending.options.forEach((option, index) => {
    // Discover picks NEVER take a target — the card just goes to hand, and
    // gets aimed later when it's actually played. Only a Choose One half can
    // need one.
    const needsTarget =
      pending.kind === "chooseOne" &&
      !!option.targetQuery &&
      option.effects.some((e) => isUserSelectValue(e));

    if (!needsTarget) {
      moves.push({
        move: "resolveChoice",
        args: [index],
        score: scoreChoiceOption(G, ctx, pending.kind, option),
        description: `Choose: ${option.title}`,
      });
      return;
    }

    // Every character, filtered by the option's own targetQuery.
    const candidates: TargetValue[] = [
      ...G.board[ctx.currentPlayer].map((c) => ({
        type: "card" as const,
        id: c.id,
        player: ctx.currentPlayer,
      })),
      ...G.board[enemyId].map((c) => ({
        type: "card" as const,
        id: c.id,
        player: enemyId,
      })),
      { type: "player" as const, id: ctx.currentPlayer, player: ctx.currentPlayer },
      { type: "player" as const, id: enemyId, player: enemyId },
    ];

    candidates.forEach((target) => {
      const context: EffectContext = {
        G,
        ctx,
        card: option,
        target,
        playerID: ctx.currentPlayer,
        location: "hand",
        type: "spell",
      };
      if (!validateTargetQuery(option.targetQuery!, context, option.id)) return;
      moves.push({
        move: "resolveChoice",
        args: [index, target],
        score: scoreChoiceOption(G, ctx, pending.kind, option, target),
        description: `Choose: ${option.title} -> ${target.type} ${target.id}`,
      });
    });
  });

  // Choose One can be backed out of; Discover cannot.
  if (pending.kind === "chooseOne") {
    moves.push({
      move: "cancelChoice",
      args: [],
      score: -50, // Low priority — prefer to actually pick a half
      description: "Cancel choose one",
    });
  }

  return moves.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Rough desirability of one option. Deliberately simple: MCTS does the real
 * work by simulating the pick, this only shapes which branches get explored
 * first.
 */
function scoreChoiceOption(
  G: GameState,
  ctx: Ctx,
  kind: "chooseOne" | "discover",
  option: Card,
  target?: TargetValue,
): number {
  if (kind === "discover") {
    // Prefer expensive (usually stronger) cards, mildly prefer minions since
    // the bot plays boards better than it plays spells.
    return 10 + (option.baseMana ?? 0) * 2 + (option.isMinion ? 2 : 0);
  }
  // Choose One: reuse the battlecry target scorer where a target is involved,
  // since the option card's `effects` read exactly like a battlecry's onPlace.
  let score = 10;
  if (target) {
    const targetCard =
      target.type === "card"
        ? G.board[target.player].find((c) => c.id === target.id)
        : undefined;
    const targetEntity = targetCard ?? G.players[target.player];
    score += scoreBattlecryTarget(
      { ...option, onPlace: option.effects },
      targetEntity,
      {
        G,
        ctx,
        card: option,
        target,
        playerID: ctx.currentPlayer,
        location: "board",
        type: "minion",
      },
    );
  }
  return score;
}

/**
 * Every TargetValue the given query types could conceivably name: both boards,
 * both heroes, both lanes. Deliberately unfiltered — legality is decided by
 * enumerateValidTargets' predicate, which runs the engine's own validator.
 */
function collectCandidateTargets(
  G: GameState,
  currentPlayer: string,
  types: TargetQuery["type"],
): TargetValue[] {
  const enemyId = currentPlayer === "0" ? "1" : "0";
  const candidates: TargetValue[] = [];

  types.forEach((type) => {
    switch (type) {
      case "card":
        [currentPlayer, enemyId].forEach((owner) => {
          G.board[owner].forEach((c) => {
            candidates.push({ type: "card", id: c.id, player: owner });
          });
        });
        break;
      case "player":
        [currentPlayer, enemyId].forEach((owner) => {
          candidates.push({ type: "player", id: owner, player: owner });
        });
        break;
      case "lane":
        [currentPlayer, enemyId].forEach((owner) => {
          candidates.push({
            type: "lane",
            id: `lane-${owner}`,
            player: owner,
          });
        });
        break;
      // "hand" is never a user-select target in the current card pool.
    }
  });

  return candidates;
}

/**
 * The targets the ENGINE would actually accept.
 *
 * This is the fix for the bot walking into moves the engine silently drops
 * (Execute on an undamaged minion, a spell aimed at an Elusive or Stealthed
 * minion, a battlecry that may not hit itself). Callers pass the very
 * validator their move will be checked against, so enumeration can't drift
 * from engine semantics the way hand-rolled side/type filtering did.
 */
function enumerateValidTargets(
  G: GameState,
  ctx: Ctx,
  types: TargetQuery["type"],
  isLegal: (target: TargetValue) => boolean,
): TargetValue[] {
  return collectCandidateTargets(G, ctx.currentPlayer, types).filter(isLegal);
}

/** The board card or hero a TargetValue names, for scoring. */
function resolveTargetEntity(
  G: GameState,
  target: TargetValue,
): Card | Player | undefined {
  if (target.type === "card") {
    return G.board[target.player].find((c) => c.id === target.id);
  }
  if (target.type === "player") {
    return G.players[target.player];
  }
  return undefined;
}

/**
 * Damage needed to kill a hero. Armor soaks damage before health does, so
 * ignoring it makes the bot commit to "lethal" lines that leave the opponent
 * alive — worse than not seeing the lethal at all.
 */
function effectiveHealth(player: Player): number {
  return player.health + player.armor;
}

/** Short label for a target, used only in AIMove.description. */
function describeTarget(G: GameState, target: TargetValue): string {
  if (target.type === "card") {
    const card = G.board[target.player].find((c) => c.id === target.id);
    return card?.title ?? target.id;
  }
  if (target.type === "player") {
    return target.player === "0" ? "hero P0" : "hero P1";
  }
  return `board ${target.player}`;
}

/**
 * Enumerate battlecry target selection moves
 */
function enumerateBattlecryTargets(G: GameState, ctx: Ctx): AIMove[] {
  const moves: AIMove[] = [];
  const { cardId, playerId } = G.activeBattlecryMinion!;

  // Find the card on board
  const card = G.board[playerId].find((c) => c.id === cardId);
  if (!card || !card.battlecryQuery) return moves;

  // resolveBattlecry runs validateMove on the placed minion, which routes to
  // the activeBattlecryMinion branch and checks battlecryQuery — conditions
  // included. Self-targeting is legal unless the card says otherwise via an
  // `exclude-self` condition, so it is NOT hardcoded here.
  const targets = enumerateValidTargets(
    G,
    ctx,
    card.battlecryQuery.type,
    (target) => validateMove(G, ctx, cardId, "board", target).valid,
  );

  targets.forEach((target) => {
    const entity = resolveTargetEntity(G, target);
    if (!entity) return;
    const score = scoreBattlecryTarget(card, entity, {
      G,
      ctx,
      card: card,
      target: target,
      playerID: ctx.currentPlayer,
      location: "board",
      type: "minion",
    });
    moves.push({
      move: "resolveBattlecry",
      args: [cardId, target],
      score,
      description: `Battlecry target: ${describeTarget(G, target)}`,
    });
  });

  return moves;
}

/**
 * Score a battlecry target
 */
function scoreBattlecryTarget(
  card: Card,
  target: Card | Player,
  context: EffectContext,
): number {
  let score = 0;
  const { target: targetTypes } = context;
  const targetType = targetTypes?.type;

  // Check if battlecry does damage or healing
  const battlecryEffects = card.onPlace;

  battlecryEffects.forEach((effect) => {
    if (effect.type === "damage" && effect.target === "user-select") {
      // Damage battlecry
      const damage = resolveDynamicValue(effect.value, context);

      if (targetType === "card") {
        const targetCard = target as Card;
        // Prefer killing minions
        if (
          getCurrentHealth(targetCard) &&
          getCurrentHealth(targetCard) <= damage
        ) {
          score += 50; // High priority to kill
        } else {
          score += damage * 3; // Damage is valuable
        }
        // Prefer targeting high attack minions
        if (getAttack(targetCard)) {
          score += getAttack(targetCard) * 2;
        }
      } else {
        // Targeting player - check for lethal
        const targetPlayer = target as Player;
        if (
          targetPlayer.id !== context.playerID &&
          effectiveHealth(targetPlayer) <= damage
        ) {
          score += 1000; // LETHAL!
        } else {
          score += damage * 5; // Face damage is good
        }
      }
    } else if (effect.type === "heal" && effect.target === "user-select") {
      // Heal battlecry
      if (targetType === "card") {
        const targetCard = target as Card;
        // Prefer healing damaged minions
        if (getCurrentHealth(targetCard) && getMaxHealth(targetCard)) {
          const missingHealth =
            getMaxHealth(targetCard) - getCurrentHealth(targetCard);
          score +=
            Math.min(
              missingHealth,
              resolveDynamicValue(effect.value, context),
            ) * 3;
        }
      } else {
        // Healing player
        const targetPlayer = target as Player;
        const missingHealth = targetPlayer.maxHealth - targetPlayer.health;
        score +=
          Math.min(missingHealth, resolveDynamicValue(effect.value, context)) *
          2;
      }
    }
  });

  return score;
}

/**
 * Enumerate all possible card plays from hand
 */
function enumerateHandPlays(G: GameState, ctx: Ctx, player: Player): AIMove[] {
  const moves: AIMove[] = [];

  player.hand.forEach((card) => {
    // Check if card is affordable
    if (!canAfford(player, getManaCost(card))) {
      return; // Skip unaffordable cards
    }

    // Check board space for minions
    if (card.isMinion && G.board[ctx.currentPlayer].length >= 7) {
      return; // Board is full
    }

    // Minion without targeting - just needs to be placed
    if (card.isMinion) {
      const score = scoreCardPlay(G, ctx, card, undefined);
      moves.push({
        move: "placeCard",
        args: [card.id], // Don't pass undefined target
        score,
        description: `Play ${card.title}`,
      });
    } else {
      // Spell without targeting
      const targetMoves = enumerateTargets(G, ctx, card, "hand");
      moves.push(...targetMoves);
    }
  });

  return moves;
}

/**
 * Enumerate hero power usage moves
 */
function enumerateHeroPower(G: GameState, ctx: Ctx, player: Player): AIMove[] {
  const moves: AIMove[] = [];
  const heroPower = player.hero?.heroPower;

  if (!heroPower) return moves;
  if (player.heroPowerUsedThisTurn) return moves;
  if (!canAfford(player, heroPower.manaCost)) return moves;

  const requiresTarget = heroPower.effects.some(
    (effect) =>
      isUserSelectValue(effect) && (effect as any).target === "user-select",
  );

  if (!requiresTarget) {
    moves.push({
      move: "useHeroPower",
      args: [],
      score: scoreHeroPower(G, ctx, heroPower, undefined),
      description: `Use hero power: ${heroPower.name}`,
    });
    return moves;
  }

  // Mirrors useHeroPower's own check exactly, sourceID included — hero powers
  // never run checkTargetRestrictions, but validateTargetQuery is where the
  // Elusive gate lives, and `type: "heroPower"` is what arms it.
  const targets = enumerateValidTargets(
    G,
    ctx,
    heroPower.targetQuery.type,
    (target) =>
      validateTargetQuery(
        heroPower.targetQuery,
        {
          G,
          ctx,
          playerID: ctx.currentPlayer,
          target,
          location: "hand",
          type: "heroPower",
          heroPower,
        },
        `hero-power-${ctx.currentPlayer}`,
      ),
  );

  targets.forEach((target) => {
    moves.push({
      move: "useHeroPower",
      args: [target],
      score: scoreHeroPower(G, ctx, heroPower, target),
      description: `Hero power: ${heroPower.name} on ${describeTarget(G, target)}`,
    });
  });

  return moves;
}

/**
 * Score using a hero power
 */
function scoreHeroPower(
  G: GameState,
  ctx: Ctx,
  heroPower: HeroPower,
  target: TargetValue | undefined,
): number {
  let score = 15; // Baseline value for spending mana on hero power
  score += heroPower.manaCost * 5; // Mana efficiency, same weight as card plays

  heroPower.effects.forEach((effect) => {
    score += evaluateEffect(effect, {
      G,
      ctx,
      heroPower,
      location: "hand",
      playerID: ctx.currentPlayer,
      target,
      type: "heroPower",
      sourceEventIndex: G.eventHistory.length,
      excessDamageDealt: 0,
      lastDamageDealt: 0,
      temp: 0,
    });
  });

  return score;
}

/**
 * Enumerate all possible attacks from board
 */
function enumerateAttacks(G: GameState, ctx: Ctx): AIMove[] {
  const moves: AIMove[] = [];
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];

  G.board[ctx.currentPlayer].forEach((card) => {
    // Cheap pre-gate so we don't run the full validator per candidate for a
    // minion that plainly cannot swing. validateMove is still the authority on
    // summoning sickness, frozen, cantAttack, taunt, stealth and immune.
    if (card.attacksLeft <= 0 || !getAttack(card) || getAttack(card) <= 0) {
      return;
    }

    const targets = enumerateValidTargets(
      G,
      ctx,
      card.targetQuery.type,
      (target) => validateMove(G, ctx, card.id, "board", target).valid,
    );

    targets.forEach((target) => {
      const entity = resolveTargetEntity(G, target);
      if (!entity) return;
      const score = scoreAttack(
        card,
        entity,
        enemyPlayer,
        target.type === "player" ? "player" : "card",
        G,
        enemyPlayerId,
      );
      moves.push({
        move: "minionAttack",
        args: [card.id, target],
        score,
        description: `Attack ${describeTarget(G, target)} with ${card.title}`,
      });
    });
  });

  return moves;
}

/**
 * Enumerate hero attacks (using base attack and/or an equipped weapon)
 */
function enumerateHeroAttacks(
  G: GameState,
  ctx: Ctx,
  player: Player,
): AIMove[] {
  const moves: AIMove[] = [];

  if (
    player.attacksLeft <= 0 ||
    hasKeyword(player, "frozen") ||
    getPlayerAttack(player) <= 0
  ) {
    return moves;
  }

  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];
  const enemyTaunts = G.board[enemyPlayerId].filter((c) =>
    hasKeyword(c, "taunt"),
  );
  const candidateTargets: TargetValue[] = [];

  if (enemyTaunts.length > 0) {
    enemyTaunts.forEach((tauntCard) => {
      candidateTargets.push({
        type: "card",
        id: tauntCard.id,
        player: enemyPlayerId,
      });
    });
  } else {
    G.board[enemyPlayerId].forEach((enemyCard) => {
      candidateTargets.push({
        type: "card",
        id: enemyCard.id,
        player: enemyPlayerId,
      });
    });
    candidateTargets.push({
      type: "player",
      id: enemyPlayerId,
      player: enemyPlayerId,
    });
  }

  candidateTargets.forEach((target) => {
    const restriction = checkTargetRestrictions(G, ctx.currentPlayer, target);
    if (!restriction.ok) return;

    if (target.type === "card") {
      const targetCard = G.board[enemyPlayerId].find((c) => c.id === target.id);
      if (!targetCard) return;
      const score = scoreHeroAttack(player, targetCard, "card");
      moves.push({
        move: "heroAttack",
        args: [target],
        score,
        description: `Attack ${targetCard.title} with hero`,
      });
    } else {
      const score = scoreHeroAttack(player, enemyPlayer, "player");
      moves.push({
        move: "heroAttack",
        args: [target],
        score,
        description: `Attack face with hero`,
      });
    }
  });

  return moves;
}

/**
 * Score a hero (weapon) attack. Similar to scoreAttack, but weighted more
 * conservatively since losing the hero ends the game.
 */
function scoreHeroAttack(
  attacker: Player,
  target: Card | Player,
  targetType: "card" | "player",
): number {
  let score = 0;
  const attackValue = getPlayerAttack(attacker);
  const attackerHealth = attacker.health + attacker.armor;

  if (targetType === "card") {
    const targetCard = target as Card;
    const targetHealth = getCurrentHealth(targetCard) || 0;
    const targetAttack = getAttack(targetCard) || 0;

    if (targetHealth > 0 && targetHealth <= attackValue) {
      score += 50;
      score += targetAttack * 6;
      score += targetHealth * 3;
      if (targetAttack >= 6) score += 40;
      else if (targetAttack >= 4) score += 20;
      if (hasKeyword(targetCard, "taunt")) score += 25;
    } else {
      score += attackValue * 3;
    }

    // Never risk the hero's life for a partial trade against a minion
    // that survives and hits back.
    if (targetAttack > 0 && attackerHealth <= targetAttack) {
      score -= 200;
    }
  } else {
    score += attackValue * 8;
    const targetPlayer = target as Player;
    if (effectiveHealth(targetPlayer) <= attackValue) {
      score += 1000; // LETHAL!
    }
  }

  return score;
}

/**
 * Enumerate targets for a card that requires targeting
 */
function enumerateTargets(
  G: GameState,
  ctx: Ctx,
  card: Card,
  location: "hand" | "board",
): AIMove[] {
  const moves: AIMove[] = [];

  if (card.isMinion && location === "hand" && !card.isPlaced) {
    // place on lane
    const target: TargetValue = {
      type: "lane",
      id: `lane-${ctx.currentPlayer}`, // No specific ID for lane targeting
      player: ctx.currentPlayer,
    };
    const score = scoreCardPlay(G, ctx, card, target);
    moves.push({
      move: "placeCard",
      args: [card.id, target],
      score,
      description: `Play ${card.title} on lane`,
    });
    return moves; // Minions from hand can only be placed on lane, so return early
  }

  // placeCard runs validateMove, so run the same thing here: a spell whose
  // targetQuery conditions nothing on the board satisfies (Execute with no
  // damaged enemy) now yields zero moves and simply stays in hand, instead of
  // producing plays the engine drops on the floor.
  const targets = enumerateValidTargets(G, ctx, card.targetQuery.type, (target) =>
    validateMove(G, ctx, card.id, location, target).valid,
  );

  targets.forEach((target) => {
    moves.push({
      move: "placeCard",
      args: [card.id, target],
      score: scoreCardPlay(G, ctx, card, target),
      description: `Play ${card.title} on ${describeTarget(G, target)}`,
    });
  });

  return moves;
}

/**
 * Score playing a card
 */
function scoreCardPlay(
  G: GameState,
  ctx: Ctx,
  card: Card,
  target: TargetValue | undefined,
): number {
  let score = 0;
  const player = G.players[ctx.currentPlayer];
  // const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  // const enemyPlayer = G.players[enemyPlayerId];

  // Mana efficiency - prefer using mana
  const mana = getManaCost(card);
  score += mana * 5; // Each mana used is worth 5 points
  // Bonus for using most of available mana
  if (getSpendableMana(player) - mana < 2) {
    score += 10; // Bonus for efficient mana use
  }

  // Minion value
  if (card.isMinion) {
    score += 20; // Base value for board presence
    if (getAttack(card)) score += getAttack(card) * 8; // Attack is valuable
    if (getCurrentHealth(card)) score += getCurrentHealth(card) * 6; // Health is valuable

    // Keyword bonuses
    if (hasKeyword(card, "taunt")) score += 15; // Protection
    if (hasKeyword(card, "divineShield")) score += 12; // Survives first hit
    if (hasKeyword(card, "charge")) score += 15; // Immediate impact
    if (hasKeyword(card, "rush")) score += 10; // Can trade immediately
    if (hasKeyword(card, "stealth")) score += 5; // Protected for one turn
    if (hasKeyword(card, "poisonous")) score += 18; // Trades up with anything
    if (hasKeyword(card, "immune")) score += 20; // Can't be removed by damage
  }

  // Spell value - balance with minions
  if (card.isSpell) {
    score += 25; // Base spell value to balance with minion scoring
  }

  // Weapon value - repeated attack power over its durability
  if (card.isWeapon) {
    score += 15; // Base value for gaining a weapon
    score += (card.baseAttack ?? 0) * (card.baseDurability ?? 1) * 6;
  }

  // Base context fields so DynamicValues like excess-damage/damage-dealt/temp
  // don't silently resolve to 0 while scoring (they're populated for real
  // during actual effect execution, but scoring runs ahead of that).
  const baseContextFields = {
    sourceEventIndex: G.eventHistory.length,
    excessDamageDealt: 0,
    lastDamageDealt: 0,
    temp: 0,
  };

  // Spell/Effect value
  card.effects.forEach((effect) => {
    score += evaluateEffect(effect, {
      card: card,
      G,
      ctx,
      location: "board",
      playerID: ctx.currentPlayer,
      target,
      type: "spell",
      ...baseContextFields,
    });
  });

  // Battlecry value (if minion)
  if (card.isMinion && card.onPlace.length > 0) {
    card.onPlace.forEach((effect) => {
      score += evaluateEffect(effect, {
        card: card,
        G,
        ctx,
        location: "board",
        playerID: ctx.currentPlayer,
        target,
        type: "minion",
        ...baseContextFields,
      });
    });
  }

  // Deathrattle value (if minion)
  if (card.isMinion && card.deathrattle && card.deathrattle.length > 0) {
    card.deathrattle.forEach((effect) => {
      // Deathrattles are worth less than battlecries (only trigger on death)
      const deathrattleValue = evaluateEffect(effect, {
        card: card,
        G,
        ctx,
        location: "board",
        playerID: ctx.currentPlayer,
        target,
        type: "minion",
        ...baseContextFields,
      });
      score += deathrattleValue * 0.4; // 40% of full effect value
    });
  }

  return score;
}

/**
 * Score an attack (Board control priority with threat assessment)
 */
function scoreAttack(
  attacker: Card,
  target: Card | Player,
  enemyPlayer: Player,
  targetType: "card" | "player",
  G?: GameState,
  enemyPlayerId?: string,
): number {
  let score = 0;

  if (!getAttack(attacker)) return -100; // Can't attack without attack value

  if (targetType === "card") {
    const targetCard = target as Card;

    // BOARD CONTROL PRIORITY: Killing minions is highly valuable
    if (
      getCurrentHealth(targetCard) &&
      getCurrentHealth(targetCard) <= getAttack(attacker)
    ) {
      score += 50; // High removal value (increased from 40)
      score += (getAttack(targetCard) || 0) * 6; // Prefer removing threats (increased from 5)
      score += (getCurrentHealth(targetCard) || 0) * 3;

      // THREAT PRIORITY: Extra bonus for removing high-attack minions
      const targetAttack = getAttack(targetCard) || 0;
      if (targetAttack >= 6) {
        score += 40; // Major threat - prioritize removal
      } else if (targetAttack >= 4) {
        score += 20; // Significant threat
      }

      // Extra value for taunt removal
      if (hasKeyword(targetCard, "taunt")) score += 25; // Increased from 20
    } else {
      // Partial damage (still board control)
      score += getAttack(attacker) * 3; // Increased from 2
    }

    // Survival check (negative if we die)
    if (getCurrentHealth(attacker) && getAttack(targetCard)) {
      if (getCurrentHealth(attacker) <= getAttack(targetCard)) {
        score -= 25; // We die in the trade (reduced penalty from 30)

        // But if it's a favorable trade, still okay
        if (
          getCurrentHealth(targetCard) &&
          getCurrentHealth(targetCard) <= getAttack(attacker)
        ) {
          const theirValue =
            (getAttack(targetCard) || 0) * 4 +
            (getCurrentHealth(targetCard) || 0) * 3;
          const ourValue =
            (getAttack(attacker) || 0) * 4 +
            (getCurrentHealth(attacker) || 0) * 3;
          if (theirValue > ourValue) {
            score += 20; // Favorable trade despite death
          }
        }
      }
    }
  } else {
    // Attacking face (secondary priority to board control)
    score += getAttack(attacker) * 8; // Reduced from 10 to prioritize board control

    // THREAT ASSESSMENT: Penalize face attacks when enemy has threatening minions
    if (G && enemyPlayerId) {
      const enemyThreats = G.board[enemyPlayerId].filter(
        (c) => (getAttack(c) || 0) >= 5 && !c.summoningSickness,
      );
      if (enemyThreats.length > 0) {
        score -= 30; // Penalty for ignoring threats
      }
    }

    // Lethal is always priority
    if (effectiveHealth(enemyPlayer) <= getAttack(attacker)) {
      score += 1000; // LETHAL!
    }
  }

  return score;
}

/**
 * Evaluate an effect's value
 */
function evaluateEffect(effect: EffectTypes, context: EffectContext): number {
  let score = 0;
  const { ctx, G, target } = context;
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];
  switch (effect.type) {
    case "damage":
      const damage = resolveDynamicValue(effect.value, context);

      if (effect.target === "enemy-hero") {
        score += damage * 8;
        // Check for lethal
        if (effectiveHealth(enemyPlayer) <= damage) {
          score += 1000; // LETHAL!
        }
      } else if (effect.target === "enemy-board") {
        // AoE damage - check if it's worth using
        const enemyBoard = G.board[enemyPlayer.id];

        if (enemyBoard.length === 0) {
          score -= 100; // Don't waste AoE on empty board
        } else if (enemyBoard.length === 1) {
          score -= 50; // Prefer single-target removal for 1 minion
        }

        // Evaluate damage on each minion
        enemyBoard.forEach((targetCard) => {
          if (targetCard && getCurrentHealth(targetCard)) {
            if (getCurrentHealth(targetCard) <= damage) {
              score += 40; // Killing minion
              score += (getAttack(targetCard) || 0) * 5;
            } else {
              score += damage * 4;
            }
          }
        });
      } else if (effect.target === "enemy-all") {
        score += damage * 8;
        // Check for lethal
        if (effectiveHealth(enemyPlayer) <= damage) {
          score += 1000; // LETHAL!
        }
        // minions
        G.board[enemyPlayer.id].forEach((targetCard) => {
          if (targetCard && getCurrentHealth(targetCard)) {
            if (getCurrentHealth(targetCard) <= damage) {
              score += 40; // Killing minion
              score += (getAttack(targetCard) || 0) * 5;
            } else {
              score += damage * 4;
            }
          }
        });
      } else if (effect.target === "user-select" && target) {
        // Check if target is friendly or enemy
        const isFriendly = target.player === ctx.currentPlayer;

        if (target.type === "player") {
          const targetPlayer = G.players[target.player];

          if (isFriendly) {
            // NEVER damage own hero!
            score -= 1000;
          } else {
            // Damage enemy hero
            score += damage * 16;
            if (effectiveHealth(targetPlayer) <= damage) {
              score += 1000; // LETHAL!
            }
          }
        } else if (target.type === "card") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          if (targetCard && getCurrentHealth(targetCard)) {
            if (isFriendly) {
              // Penalize damaging own minions (unless it's a buff card like Inner Rage)
              score -= 100 + (damage ?? getAttack(targetCard) * 50);
            } else {
              // Damage enemy minions
              if (getCurrentHealth(targetCard) <= damage) {
                score += 40; // Killing minion
                score += (getAttack(targetCard) || 0) * 5;
              } else {
                score += damage * 4;
              }
            }
          }
        }
      }
      break;

    case "heal":
      const heal = resolveDynamicValue(effect.value, context);
      if (effect.target === "friendly-hero") {
        const player = G.players[ctx.currentPlayer];
        const missingHp = player.maxHealth - player.health;
        score += Math.min(missingHp, heal) * 3;
      } else if (effect.target === "friendly-all") {
        score += heal * (G.board[ctx.currentPlayer].length + 1) * 2; // Heal on multiple minions is good
      } else if (effect.target === "user-select" && target) {
        const isFriendly = target.player === ctx.currentPlayer;

        if (target.type === "player") {
          const targetPlayer = G.players[target.player];
          const missingHp = targetPlayer.maxHealth - targetPlayer.health;

          if (isFriendly) {
            // Good - heal own hero
            score += Math.min(missingHp, heal) * 3;
          } else {
            // Bad - don't waste heals on enemy
            score -= 100;
          }
        } else if (target.type === "card") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          if (
            targetCard &&
            getCurrentHealth(targetCard) &&
            getMaxHealth(targetCard)
          ) {
            const missingHealth =
              getMaxHealth(targetCard) - getCurrentHealth(targetCard);

            if (isFriendly) {
              // Good - heal own minion
              score += Math.min(missingHealth, heal) * 3;
            } else {
              // Bad - don't heal enemy minions
              score -= 100;
            }
          }
        }
      }
      break;

    case "draw": {
      const drawCount = resolveDynamicValue(effect.value, context);
      if (effect.target === "enemy") {
        score -= drawCount * 12; // Giving the opponent cards is bad for us
      } else {
        score += drawCount * 12; // Card draw is very valuable
      }
      break;
    }

    case "summon":
      score += 25; // Summoning minions is valuable
      break;

    case "mana": {
      // Smart mana card logic - check if we have cards that become playable
      const player = G.players[ctx.currentPlayer];
      const currentMana = getSpendableMana(player);
      const extraMana = resolveDynamicValue(effect.value, context);

      // Find the best card we can play with extra mana (prefer bigger cards)
      const bestPlayableCard = player.hand
        .filter(
          (c) =>
            getManaCost(c) > currentMana &&
            getManaCost(c) <= currentMana + extraMana,
        )
        .sort((a, b) => getManaCost(b) - getManaCost(a))[0];

      if (bestPlayableCard) {
        // High value if enables a big play
        score += getManaCost(bestPlayableCard) * 10;
      } else {
        // Still check if it enables multiple smaller cards
        const smallCards = player.hand.filter(
          (c) => getManaCost(c) <= extraMana && getManaCost(c) > 0,
        );
        if (smallCards.length > 0) {
          score += smallCards.length * 8; // Multiple small plays
        } else {
          score -= 30; // Wasted mana card
        }
      }
      break;
    }

    case "armor": {
      // Defensive value - more valuable when low on health
      const player = G.players[ctx.currentPlayer];
      const healthPercent = player.health / player.maxHealth;
      if (healthPercent < 0.5) {
        score += resolveDynamicValue(effect.value, context) * 5; // High value when low health
      } else {
        score += resolveDynamicValue(effect.value, context) * 3; // Still valuable for survivability
      }
      break;
    }

    case "freeze": {
      // Control/tempo value - evaluate enemy board
      if (effect.target === "enemy-board") {
        const enemyBoardValue = G.board[enemyPlayer.id].reduce(
          (sum, c) => sum + (getAttack(c) || 0) * 2,
          0,
        );
        score += Math.min(enemyBoardValue * 0.4, 30); // Cap at 30 points
      } else if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;
        const targetCard = G.board[target.player].find(
          (c) => c.id === target.id,
        );
        if (targetCard) {
          if (isFriendly) {
            // Bad - don't freeze own minions
            score -= 100;
          } else {
            // Good - freeze enemy minions
            score += (getAttack(targetCard) || 0) * 4; // Value based on attack prevented
          }
        }
      }
      break;
    }

    case "destroy": {
      // Extremely high value for hard removal
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;
        const targetCard = G.board[target.player].find(
          (c) => c.id === target.id,
        );
        if (targetCard) {
          if (isFriendly) {
            // NEVER destroy own minions!
            score -= 1000;
          } else {
            // Great - destroy enemy minions
            score += 60; // Base destroy value
            score += (getAttack(targetCard) || 0) * 6;
            score += (getCurrentHealth(targetCard) || 0) * 4;
            if (hasKeyword(targetCard, "taunt")) score += 20; // Extra value for taunt removal
          }
        }
      }
      break;
    }

    case "divineShield": {
      // Survivability buff - only good on friendly minions
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;
        const targetCard = G.board[target.player].find(
          (c) => c.id === target.id,
        );
        if (targetCard && !hasKeyword(targetCard, "divineShield")) {
          if (isFriendly) {
            // Good - buff own minions
            score += 15; // Base value
            score += (getAttack(targetCard) || 0) * 2; // More value on big attackers
          } else {
            // Bad - don't buff enemy minions
            score -= 100;
          }
        }
      }
      break;
    }

    case "taunt":
    case "charge":
    case "rush":
    case "stealth":
    case "windfury":
    case "poisonous":
    case "immune": {
      // These are buffs - only good on friendly minions
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;

        if (isFriendly) {
          // Good - buff own minions
          if (effect.type === "taunt") score += 15; // Protection
          if (effect.type === "charge") score += 12; // Immediate value
          if (effect.type === "rush") score += 10; // Can trade immediately
          if (effect.type === "stealth") score += 5; // Protected for one turn
          if (effect.type === "immune") score += 20; // Dodges removal
          if (effect.type === "poisonous") {
            // Worth most on a minion that will actually get to swing
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            score += 12;
            if (targetCard && getAttack(targetCard) > 0) score += 6;
          }
          if (effect.type === "windfury") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            score += (getAttack(targetCard || ({} as Card)) || 0) * 4; // Extra attack is valuable
          }
        } else {
          // Bad - don't buff enemy minions
          score -= 100;
        }
      } else if (
        effect.target === "friendly-all" ||
        effect.target === "friendly-board"
      ) {
        if (effect.type === "taunt") score += 15;
        if (effect.type === "charge") score += 12;
        if (effect.type === "rush") score += 10;
        if (effect.type === "stealth") score += 5;
        if (effect.type === "windfury") score += 20;
        if (effect.type === "poisonous") score += 18;
        if (effect.type === "immune") score += 25;
      }
      break;
    }

    case "durability": {
      // Repairing your own weapon is good; chipping the enemy's is good too.
      const amount = resolveDynamicValue(effect.value, context);
      const ownWeapon = effect.target === "friendly-weapon";
      const player = G.players[ctx.currentPlayer];
      const enemy = G.players[ctx.currentPlayer === "0" ? "1" : "0"];
      if (ownWeapon) {
        // Worthless with no weapon equipped, or one already at full durability.
        if (!player.weapon) score -= 50;
        else score += amount * 8;
      } else if (effect.target === "enemy-weapon") {
        if (!enemy.weapon) score -= 50;
        else score += -amount * 8;
      }
      break;
    }

    case "applyModifier": {
      // Buff evaluation - good for friendly, bad for enemy
      const modEffect = effect;

      // If targeted buff, check if friendly or enemy
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;
        const targetCard = G.board[target.player].find(
          (c) => c.id === target.id,
        );
        if (targetCard) {
          if (isFriendly) {
            // Good - buff own minions (attack is worth a bit more than health)
            if (modEffect.stats?.attack !== undefined) {
              score += resolveDynamicValue(modEffect.stats.attack, context) * 6;
            }
            if (modEffect.stats?.health !== undefined) {
              score += resolveDynamicValue(modEffect.stats.health, context) * 5;
            }
            // Better to buff already strong minions
            score += (getAttack(targetCard) || 0) * 1.5;
          } else {
            // Bad - don't buff enemy minions
            score -= 100;
          }
        }
      } else {
        // Non-targeted buffs (like friendly-all)
        if (modEffect.stats?.attack !== undefined) {
          score += resolveDynamicValue(modEffect.stats.attack, context) * 6;
        }
        if (modEffect.stats?.health !== undefined) {
          score += resolveDynamicValue(modEffect.stats.health, context) * 5;
        }
      }
      break;
    }

    case "changeKey": {
      // Evaluate based on what key is being changed
      // if (effect.key === "taunt" && resolveDynamicValue(effect.value, context) === true) {
      //   score += 15; // Taunt is protective
      // } else if (effect.key === "charge" && resolveDynamicValue(effect.value, context) === true) {
      //   score += 12; // Charge adds immediate value
      // }
      break;
    }

    case "sequence": {
      // Recurse into each step of the sequence
      effect.steps.forEach((step) => {
        score += evaluateEffect(step, context);
      });
      break;
    }

    case "conditional": {
      // Best-effort: we don't fully re-check conditions during scoring, so
      // average the "then" and "else" branches to approximate expected value
      const thenScore = effect.then.reduce(
        (sum, step) => sum + evaluateEffect(step, context),
        0,
      );
      if (effect.else && effect.else.length > 0) {
        const elseScore = effect.else.reduce(
          (sum, step) => sum + evaluateEffect(step, context),
          0,
        );
        score += (thenScore + elseScore) / 2;
      } else {
        score += thenScore;
      }
      break;
    }

    case "storeVar": {
      // No direct board impact - it only sets up a later step in a sequence
      break;
    }

    case "addToHand": {
      // Card advantage is very valuable
      const count = resolveDynamicValue(effect.value, context);
      score += count * 12;
      break;
    }

    case "returnToHand":
    case "bounce": {
      // Good tempo/removal-lite when bouncing enemy minions, bad on friendly ones
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;
        const targetCard = G.board[target.player].find(
          (c) => c.id === target.id,
        );
        if (targetCard) {
          if (isFriendly) {
            score -= 30; // Losing board presence/tempo on our own minion
          } else {
            score += 20 + (getAttack(targetCard) || 0) * 3; // Tempo removal
          }
        }
      } else if (effect.target === "enemy-board") {
        score += G.board[enemyPlayerId].length * 15;
      } else if (effect.target === "friendly-board") {
        score -= G.board[ctx.currentPlayer].length * 15;
      }
      break;
    }

    case "discard": {
      const discardTarget = effect.target === "enemy" ? "enemy" : "self";
      const count = resolveDynamicValue(effect.value, context);
      if (discardTarget === "enemy") {
        score += count * 15; // Opponent card disadvantage
      } else {
        score -= count * 20; // We lose cards
      }
      break;
    }

    case "equip": {
      // Value based on the referenced weapon template's stats
      const weaponTemplate = createCardFromID(
        effect.cardID as Parameters<typeof createCardFromID>[0],
      );
      if (weaponTemplate) {
        const equipTarget = effect.target === "enemy" ? "enemy" : "self";
        const value =
          15 +
          (weaponTemplate.baseAttack ?? 0) *
            (weaponTemplate.baseDurability ?? 1) *
            6;
        score += equipTarget === "self" ? value : -value;
      }
      break;
    }
  }

  return score;
}

/**
 * Evaluate overall game state
 * IMPORTANT: These weights are critical for MCTS simulations!
 * MCTS uses this function to evaluate game positions during playouts.
 */
export function evaluateGameState(G: GameState, ctx: Ctx): number {
  let score = 0;
  const player = G.players[ctx.currentPlayer];
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];

  // Board control - HEAVILY weighted for MCTS
  const ourBoard = G.board[ctx.currentPlayer];
  const theirBoard = G.board[enemyPlayerId];

  // Count total stats on board
  const ourBoardValue = ourBoard.reduce(
    (sum, card) =>
      sum + (getAttack(card) || 0) * 2 + (getCurrentHealth(card) || 0),
    0,
  );
  const theirBoardValue = theirBoard.reduce(
    (sum, card) =>
      sum + (getAttack(card) || 0) * 2 + (getCurrentHealth(card) || 0),
    0,
  );

  // Board control is CRITICAL - increased 10x for MCTS
  score += (ourBoardValue - theirBoardValue) * 5;

  // HP difference - increased 7x for MCTS. Armor counts: it is effective HP.
  score += (effectiveHealth(player) - effectiveHealth(enemyPlayer)) * 2;

  // Card advantage. Held cards are worth real points, which is what lets the
  // search prefer keeping a card over making a bad play — but a played minion
  // is worth several times more, so this never turns into hoarding.
  score += (player.hand.length - enemyPlayer.hand.length) * 10;

  // Tempo advantage - having mana available is good
  score += getSpendableMana(player) * 0.5;

  // Win condition checks
  if (enemyPlayer.health <= 0) {
    score += 10000; // WE WIN!
  }
  if (player.health <= 0) {
    score -= 10000; // WE LOSE!
  }

  return score;
}
