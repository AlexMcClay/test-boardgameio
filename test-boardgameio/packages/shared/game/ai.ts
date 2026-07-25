import type { Ctx } from "boardgame.io";
import type {
  GameState,
  Card,
  Player,
  TargetValue,
  EffectTypes,
  EffectContext,
  HeroPower,
} from "./types";
import {
  createCardFromID,
  getAttack,
  getCurrentHealth,
  getManaCost,
  getMaxHealth,
  getPlayerAttack,
  hasKeyword,
  isUserSelectValue,
} from "./utils";
import { resolveDynamicValue } from "./utils/effectEngine";
import { checkTargetRestrictions } from "./utils/validateMove";

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
  const wastedMana = player.mana;
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

  // Score all moves and sort by score (highest first)
  // Note: With objectives, MCTS uses evaluateGameState during simulations
  // So we don't need to add it here - keeps scores positive and interpretable
  const scoredMoves = moves.map((move) => ({
    ...move,
    score: move.score, // Pure move value without game state adjustment
  }));

  // Sort by score descending
  scoredMoves.sort((a, b) => b.score - a.score);
  if (scoredMoves.length < 2) {
    scoredMoves.push({
      move: "endTurn",
      args: [],
      score: endTurnScore - 200,
      description: "End turn",
    });
  }

  // Return only top moves to prevent infinite loops (widened from 10 to make
  // room for hero power / hero attack moves alongside card plays & attacks)
  // console.log("SCORE MOVES", scoredMoves);
  return scoredMoves.slice(0, 20);
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

  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";

  // Get valid targets based on battlecryTargets
  card.battlecryQuery?.type.forEach((targetType) => {
    switch (targetType) {
      case "card": {
        if (
          card.battlecryQuery?.side === "all" ||
          card.battlecryQuery?.side === "enemy"
        ) {
          // Target enemy minions
          G.board[enemyPlayerId].forEach((enemyCard) => {
            const target: TargetValue = {
              type: "card",
              id: enemyCard.id,
              player: enemyPlayerId,
            };
            const score = scoreBattlecryTarget(card, enemyCard, {
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
              description: `Battlecry target: ${enemyCard.title}`,
            });
          });
        }

        // Target friendly minions
        if (
          card.battlecryQuery?.side === "all" ||
          card.battlecryQuery?.side === "friendly"
        ) {
          G.board[ctx.currentPlayer].forEach((friendlyCard) => {
            if (friendlyCard.id !== cardId) {
              const target: TargetValue = {
                type: "card",
                id: friendlyCard.id,
                player: ctx.currentPlayer,
              };
              const score = scoreBattlecryTarget(card, friendlyCard, {
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
                description: `Battlecry target: ${friendlyCard.title}`,
              });
            }
          });
        }

        break;
      }
      case "player": {
        if (
          card.battlecryQuery?.side === "all" ||
          card.battlecryQuery?.side === "enemy"
        ) {
          // Target enemy minions
          const targetHero: TargetValue = {
            type: "player",
            id: enemyPlayerId,
            player: enemyPlayerId,
          };
          const scoreHero = scoreBattlecryTarget(
            card,
            G.players[enemyPlayerId],
            {
              G,
              ctx,
              card: card,
              target: targetHero,
              playerID: ctx.currentPlayer,
              location: "board",
              type: "minion",
            },
          );
          moves.push({
            move: "resolveBattlecry",
            args: [cardId, targetHero],
            score: scoreHero,
            description: `Battlecry target: Enemy hero`,
          });
        }

        if (
          card.battlecryQuery?.side === "all" ||
          card.battlecryQuery?.side === "friendly"
        ) {
          const targetOwnHero: TargetValue = {
            type: "player",
            id: ctx.currentPlayer,
            player: ctx.currentPlayer,
          };
          const scoreOwnHero = scoreBattlecryTarget(
            card,
            G.players[ctx.currentPlayer],
            {
              G,
              ctx,
              card: card,
              target: targetOwnHero,
              playerID: ctx.currentPlayer,
              location: "board",
              type: "minion",
            },
          );
          moves.push({
            move: "resolveBattlecry",
            args: [cardId, targetOwnHero],
            score: scoreOwnHero,
            description: `Battlecry target: Own hero`,
          });
        }
      }
    }
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
        if (targetPlayer.maxHealth <= damage) {
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
    if (getManaCost(card) > player.mana) {
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
  if (player.mana < heroPower.manaCost) return moves;

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

  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";

  heroPower.targetQuery.type.forEach((targetType) => {
    const { side } = heroPower.targetQuery;
    if (targetType === "card") {
      if (side === "all" || side === "enemy") {
        G.board[enemyPlayerId].forEach((enemyCard) => {
          const target: TargetValue = {
            type: "card",
            id: enemyCard.id,
            player: enemyPlayerId,
          };
          moves.push({
            move: "useHeroPower",
            args: [target],
            score: scoreHeroPower(G, ctx, heroPower, target),
            description: `Hero power: ${heroPower.name} on ${enemyCard.title}`,
          });
        });
      }
      if (side === "all" || side === "friendly") {
        G.board[ctx.currentPlayer].forEach((friendlyCard) => {
          const target: TargetValue = {
            type: "card",
            id: friendlyCard.id,
            player: ctx.currentPlayer,
          };
          moves.push({
            move: "useHeroPower",
            args: [target],
            score: scoreHeroPower(G, ctx, heroPower, target),
            description: `Hero power: ${heroPower.name} on ${friendlyCard.title}`,
          });
        });
      }
    } else if (targetType === "player") {
      if (side === "all" || side === "enemy") {
        const target: TargetValue = {
          type: "player",
          id: enemyPlayerId,
          player: enemyPlayerId,
        };
        moves.push({
          move: "useHeroPower",
          args: [target],
          score: scoreHeroPower(G, ctx, heroPower, target),
          description: `Hero power: ${heroPower.name} on enemy hero`,
        });
      }
      if (side === "all" || side === "friendly") {
        const target: TargetValue = {
          type: "player",
          id: ctx.currentPlayer,
          player: ctx.currentPlayer,
        };
        moves.push({
          move: "useHeroPower",
          args: [target],
          score: scoreHeroPower(G, ctx, heroPower, target),
          description: `Hero power: ${heroPower.name} on own hero`,
        });
      }
    }
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
    // Can only attack if not summoning sick and hasn't attacked

    const isSicknessActive =
      card.summoningSickness &&
      !hasKeyword(card, "charge") &&
      !hasKeyword(card, "rush");
    const disabled =
      (card.attacksLeft == 0 || isSicknessActive || hasKeyword(card, "frozen")) &&
      !G?.activeBattlecryMinion;
    if (disabled || !getAttack(card) || getAttack(card) <= 0) {
      return;
    }

    // Check if enemy has taunt minions
    const enemyTaunts = G.board[enemyPlayerId].filter((c) =>
      hasKeyword(c, "taunt"),
    );

    if (enemyTaunts.length > 0) {
      // Must attack taunts
      enemyTaunts.forEach((tauntCard) => {
        const target: TargetValue = {
          type: "card",
          id: tauntCard.id,
          player: enemyPlayerId,
        };
        const score = scoreAttack(
          card,
          tauntCard,
          enemyPlayer,
          "card",
          G,
          enemyPlayerId,
        );
        moves.push({
          move: "minionAttack",
          args: [card.id, target],
          score,
          description: `Attack ${tauntCard.title} with ${card.title}`,
        });
      });
    } else {
      // Can attack any minion or face
      // Attack enemy minions
      G.board[enemyPlayerId].forEach((enemyCard) => {
        const target: TargetValue = {
          type: "card",
          id: enemyCard.id,
          player: enemyPlayerId,
        };
        const score = scoreAttack(
          card,
          enemyCard,
          enemyPlayer,
          "card",
          G,
          enemyPlayerId,
        );
        moves.push({
          move: "minionAttack",
          args: [card.id, target],
          score,
          description: `Attack ${enemyCard.title} with ${card.title}`,
        });
      });

      // Attack face
      const targetFace: TargetValue = {
        type: "player",
        id: enemyPlayerId,
        player: enemyPlayerId,
      };
      const scoreFace = scoreAttack(
        card,
        enemyPlayer,
        enemyPlayer,
        "player",
        G,
        enemyPlayerId,
      );
      moves.push({
        move: "minionAttack",
        args: [card.id, targetFace],
        score: scoreFace,
        description: `Attack face with ${card.title}`,
      });
    }
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
    if (targetPlayer.health <= attackValue) {
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
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";

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

  card.targetQuery.type.forEach((targetType) => {
    switch (targetType) {
      case "card":
        // Generic card targeting - enumerate both friendly and enemy minions
        // Enemy minions
        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "enemy"
        ) {
          G.board[enemyPlayerId].forEach((enemyCard) => {
            const target: TargetValue = {
              type: "card",
              id: enemyCard.id,
              player: enemyPlayerId,
            };
            const score = scoreCardPlay(G, ctx, card, target);
            moves.push({
              move: "placeCard",
              args: [card.id, target],
              score,
              description: `Play ${card.title} on ${enemyCard.title}`,
            });
          });
        }

        // Friendly minions
        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "friendly"
        ) {
          G.board[ctx.currentPlayer].forEach((friendlyCard) => {
            const target: TargetValue = {
              type: "card",
              id: friendlyCard.id,
              player: ctx.currentPlayer,
            };
            const score = scoreCardPlay(G, ctx, card, target);
            moves.push({
              move: "placeCard",
              args: [card.id, target],
              score,
              description: `Play ${card.title} on ${friendlyCard.title}`,
            });
          });
        }

        break;

      case "player":
        // Generic player targeting - enumerate both friendly and enemy heroes
        // Enemy hero
        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "enemy"
        ) {
          const targetEnemyHeroGeneric: TargetValue = {
            type: "player",
            id: enemyPlayerId,
            player: enemyPlayerId,
          };
          const scoreEnemyHeroGeneric = scoreCardPlay(
            G,
            ctx,
            card,
            targetEnemyHeroGeneric,
          );
          moves.push({
            move: "placeCard",
            args: [card.id, targetEnemyHeroGeneric],
            score: scoreEnemyHeroGeneric,
            description: `Cast ${card.title} on enemy hero`,
          });
        }

        // Friendly hero
        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "friendly"
        ) {
          const targetFriendlyHeroGeneric: TargetValue = {
            type: "player",
            id: ctx.currentPlayer,
            player: ctx.currentPlayer,
          };
          const scoreFriendlyHeroGeneric = scoreCardPlay(
            G,
            ctx,
            card,
            targetFriendlyHeroGeneric,
          );
          moves.push({
            move: "placeCard",
            args: [card.id, targetFriendlyHeroGeneric],
            score: scoreFriendlyHeroGeneric,
            description: `Cast ${card.title} on friendly hero`,
          });
        }

        break;
      case "lane":
        // Target enemy lane (for AoE spells)  if (
        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "enemy"
        ) {
          const targetEnemyLane: TargetValue = {
            type: "lane",
            id: `lane-${enemyPlayerId}`,
            player: enemyPlayerId,
          };
          const scoreEnemyLane = scoreCardPlay(G, ctx, card, targetEnemyLane);
          moves.push({
            move: "placeCard",
            args: [card.id, targetEnemyLane],
            score: scoreEnemyLane,
            description: `Cast ${card.title} on enemy board`,
          });
        }
        // Target friendly lane (for AoE spells)

        if (
          card.targetQuery.side == "all" ||
          card.targetQuery.side == "friendly"
        ) {
          const targetFriendlyLane: TargetValue = {
            type: "lane",
            id: `lane-${ctx.currentPlayer}`,
            player: ctx.currentPlayer,
          };
          const scoreFriendlyLane = scoreCardPlay(
            G,
            ctx,
            card,
            targetFriendlyLane,
          );
          moves.push({
            move: "placeCard",
            args: [card.id, targetFriendlyLane],
            score: scoreFriendlyLane,
            description: `Cast ${card.title} on friendly board`,
          });
        }
        break;
    }
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
  if (player.mana - mana < 2) {
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
    if (enemyPlayer.health <= getAttack(attacker)) {
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
        if (enemyPlayer.health <= damage) {
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
        if (enemyPlayer.health <= damage) {
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
            if (targetPlayer.health <= damage) {
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
      const currentMana = player.mana;
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
    case "windfury": {
      // These are buffs - only good on friendly minions
      if (effect.target === "user-select" && target?.type === "card") {
        const isFriendly = target.player === ctx.currentPlayer;

        if (isFriendly) {
          // Good - buff own minions
          if (effect.type === "taunt") score += 15; // Protection
          if (effect.type === "charge") score += 12; // Immediate value
          if (effect.type === "rush") score += 10; // Can trade immediately
          if (effect.type === "stealth") score += 5; // Protected for one turn
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

  // HP difference - increased 7x for MCTS
  score += (player.health - enemyPlayer.health) * 2;

  // Hand size (card advantage) - increased 5x for MCTS
  score += player.hand.length * 10;

  // Tempo advantage - having mana available is good
  score += player.mana * 0.5;

  // Win condition checks
  if (enemyPlayer.health <= 0) {
    score += 10000; // WE WIN!
  }
  if (player.health <= 0) {
    score -= 10000; // WE LOSE!
  }

  return score;
}
