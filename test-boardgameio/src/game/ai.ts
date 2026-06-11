import type { Ctx } from "boardgame.io";
import type { GameState, Card, Player, TargetValue } from "@/types";

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

  if (moves.length === 0) {
    moves.push({
      move: "endTurn",
      args: [],
      score: -100, // Very low priority - only use if no other moves available
      description: "End turn",
    });
  }

  // Score all moves and sort by score (highest first)
  const scoredMoves = moves.map((move) => ({
    ...move,
    score: move.score + evaluateGameState(G, ctx),
  }));

  // Sort by score descending
  scoredMoves.sort((a, b) => b.score - a.score);

  // Return only top 10 moves to prevent infinite loops
  // console.log("SCORE MOVES", scoredMoves);
  return scoredMoves.slice(0, 10);
}

/**
 * Enumerate battlecry target selection moves
 */
function enumerateBattlecryTargets(G: GameState, ctx: Ctx): AIMove[] {
  const moves: AIMove[] = [];
  const { cardId, playerId } = G.activeBattlecryMinion!;

  // Find the card on board
  const card = G.board[playerId].find((c) => c.id === cardId);
  if (!card || !card.battlecryTargets) return moves;

  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";

  // Get valid targets based on battlecryTargets
  card.battlecryTargets.forEach((targetType) => {
    switch (targetType) {
      case "card-opponent":
      case "opponent":
        // Target enemy minions
        G.board[enemyPlayerId].forEach((enemyCard) => {
          const target: TargetValue = {
            type: "card",
            id: enemyCard.id,
            player: enemyPlayerId,
          };
          const score = scoreBattlecryTarget(card, enemyCard, "card");
          moves.push({
            move: "placeCard",
            args: [cardId, "board", target],
            score,
            description: `Battlecry target: ${enemyCard.title}`,
          });
        });
        break;

      case "player-opponent":
        // Target enemy hero
        const targetHero: TargetValue = {
          type: "player",
          id: enemyPlayerId,
          player: enemyPlayerId,
        };
        const scoreHero = scoreBattlecryTarget(
          card,
          G.players[enemyPlayerId],
          "player",
        );
        moves.push({
          move: "placeCard",
          args: [cardId, "board", targetHero],
          score: scoreHero,
          description: `Battlecry target: Enemy hero`,
        });
        break;

      case "card-friendly":
      case "friendly":
        // Target friendly minions
        G.board[ctx.currentPlayer].forEach((friendlyCard) => {
          if (friendlyCard.id !== cardId) {
            const target: TargetValue = {
              type: "card",
              id: friendlyCard.id,
              player: ctx.currentPlayer,
            };
            const score = scoreBattlecryTarget(card, friendlyCard, "card");
            moves.push({
              move: "placeCard",
              args: [cardId, "board", target],
              score,
              description: `Battlecry target: ${friendlyCard.title}`,
            });
          }
        });
        break;

      case "player-friendly":
        // Target friendly hero
        const targetOwnHero: TargetValue = {
          type: "player",
          id: ctx.currentPlayer,
          player: ctx.currentPlayer,
        };
        const scoreOwnHero = scoreBattlecryTarget(
          card,
          G.players[ctx.currentPlayer],
          "player",
        );
        moves.push({
          move: "placeCard",
          args: [cardId, "board", targetOwnHero],
          score: scoreOwnHero,
          description: `Battlecry target: Own hero`,
        });
        break;
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
  targetType: "card" | "player",
): number {
  let score = 0;

  // Check if battlecry does damage or healing
  const battlecryEffects = card.onPlace;

  battlecryEffects.forEach((effect) => {
    if (effect.type === "damage" && effect.target === "user-select") {
      // Damage battlecry
      const damage =
        typeof effect.value === "string"
          ? (card[effect.value] as number)
          : effect.value;

      if (targetType === "card") {
        const targetCard = target as Card;
        // Prefer killing minions
        if (targetCard.health && targetCard.health <= damage) {
          score += 50; // High priority to kill
        } else {
          score += damage * 3; // Damage is valuable
        }
        // Prefer targeting high attack minions
        if (targetCard.attack) {
          score += targetCard.attack * 2;
        }
      } else {
        // Targeting player - check for lethal
        const targetPlayer = target as Player;
        if (targetPlayer.hp <= damage) {
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
        if (targetCard.health && targetCard.maxHealth) {
          const missingHealth = targetCard.maxHealth - targetCard.health;
          score += Math.min(missingHealth, effect.value) * 3;
        }
      } else {
        // Healing player
        const targetPlayer = target as Player;
        const missingHealth = targetPlayer.maxHp - targetPlayer.hp;
        score += Math.min(missingHealth, effect.value) * 2;
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
    if (card.mana !== null && card.mana > player.mana) {
      return; // Skip unaffordable cards
    }

    // Check board space for minions
    if (card.isMinnion && G.board[ctx.currentPlayer].length >= 7) {
      return; // Board is full
    }

    // If card requires targeting, enumerate targets
    if (card.targets && card.targets.length > 0) {
      const targetMoves = enumerateTargets(G, ctx, card, "hand");
      moves.push(...targetMoves);
    } else if (card.isMinnion) {
      // Minion without targeting - just needs to be placed
      const score = scoreCardPlay(G, ctx, card, null);
      moves.push({
        move: "placeCard",
        args: [card.id, "hand"], // Don't pass undefined target
        score,
        description: `Play ${card.title}`,
      });
    } else {
      // Spell without targeting
      const score = scoreCardPlay(G, ctx, card, null);
      moves.push({
        move: "placeCard",
        args: [card.id, "hand"], // Don't pass undefined target
        score,
        description: `Cast ${card.title}`,
      });
    }
  });

  return moves;
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
    if (
      card.hasAttacked ||
      card.summoningSickness ||
      !card.attack ||
      card.attack <= 0
    ) {
      return;
    }

    // Check if enemy has taunt minions
    const enemyTaunts = G.board[enemyPlayerId].filter((c) => c.taunt);

    if (enemyTaunts.length > 0) {
      // Must attack taunts
      enemyTaunts.forEach((tauntCard) => {
        const target: TargetValue = {
          type: "card",
          id: tauntCard.id,
          player: enemyPlayerId,
        };
        const score = scoreAttack(card, tauntCard, enemyPlayer, "card");
        moves.push({
          move: "placeCard",
          args: [card.id, "board", target],
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
        const score = scoreAttack(card, enemyCard, enemyPlayer, "card");
        moves.push({
          move: "placeCard",
          args: [card.id, "board", target],
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
      const scoreFace = scoreAttack(card, enemyPlayer, enemyPlayer, "player");
      moves.push({
        move: "placeCard",
        args: [card.id, "board", targetFace],
        score: scoreFace,
        description: `Attack face with ${card.title}`,
      });
    }
  });

  return moves;
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

  if (card.isMinnion && location === "hand" && !card.isPlaced) {
    // place on lane
    const target: TargetValue = {
      type: "lane",
      id: `lane-${ctx.currentPlayer}`, // No specific ID for lane targeting
      player: ctx.currentPlayer,
    };
    const score = scoreCardPlay(G, ctx, card, target);
    moves.push({
      move: "placeCard",
      args: [card.id, location, target],
      score,
      description: `Play ${card.title} on lane`,
    });
    return moves; // Minions from hand can only be placed on lane, so return early
  }

  card.targets.forEach((targetType) => {
    switch (targetType) {
      case "card-opponent":
      case "opponent":
        // Target enemy minions
        G.board[enemyPlayerId].forEach((enemyCard) => {
          const target: TargetValue = {
            type: "card",
            id: enemyCard.id,
            player: enemyPlayerId,
          };
          const score = scoreCardPlay(G, ctx, card, target);
          moves.push({
            move: "placeCard",
            args: [card.id, location, target],
            score,
            description: `Play ${card.title} on ${enemyCard.title}`,
          });
        });
        break;

      case "player-opponent":
        // Target enemy hero
        const targetHero: TargetValue = {
          type: "player",
          id: enemyPlayerId,
          player: enemyPlayerId,
        };
        const scoreHero = scoreCardPlay(G, ctx, card, targetHero);
        if (card.isMinnion && !card.isPlaced) {
          // can't place minion on hero, skip this move
          break;
        }
        moves.push({
          move: "placeCard",
          args: [card.id, location, targetHero],
          score: scoreHero,
          description: `Play ${card.title} on enemy hero`,
        });
        break;

      case "card-friendly":
      case "friendly":
        // Target friendly minions
        G.board[ctx.currentPlayer].forEach((friendlyCard) => {
          const target: TargetValue = {
            type: "card",
            id: friendlyCard.id,
            player: ctx.currentPlayer,
          };
          const score = scoreCardPlay(G, ctx, card, target);
          moves.push({
            move: "placeCard",
            args: [card.id, location, target],
            score,
            description: `Play ${card.title} on ${friendlyCard.title}`,
          });
        });
        break;

      case "player-friendly":
        // Target friendly hero
        const targetOwnHero: TargetValue = {
          type: "player",
          id: ctx.currentPlayer,
          player: ctx.currentPlayer,
        };
        const scoreOwnHero = scoreCardPlay(G, ctx, card, targetOwnHero);
        moves.push({
          move: "placeCard",
          args: [card.id, location, targetOwnHero],
          score: scoreOwnHero,
          description: `Play ${card.title} on own hero`,
        });
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
  target: TargetValue | null,
): number {
  let score = 0;
  const player = G.players[ctx.currentPlayer];
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];

  // Mana efficiency - prefer using mana
  if (card.mana !== null) {
    score += card.mana * 5; // Each mana used is worth 5 points
    // Bonus for using most of available mana
    if (player.mana - card.mana < 2) {
      score += 10; // Bonus for efficient mana use
    }
  }

  // Minion value
  if (card.isMinnion) {
    score += 20; // Base value for board presence
    if (card.attack) score += card.attack * 8; // Attack is valuable
    if (card.health) score += card.health * 6; // Health is valuable
    if (card.taunt) score += 15; // Taunt is valuable
  }

  // Spell/Effect value
  card.effects.forEach((effect) => {
    score += evaluateEffect(effect, card, target, G, ctx, enemyPlayer);
  });

  // Battlecry value (if minion)
  if (card.isMinnion && card.onPlace.length > 0) {
    card.onPlace.forEach((effect) => {
      score += evaluateEffect(effect, card, target, G, ctx, enemyPlayer);
    });
  }

  return score;
}

/**
 * Score an attack
 */
function scoreAttack(
  attacker: Card,
  target: Card | Player,
  enemyPlayer: Player,
  targetType: "card" | "player",
): number {
  let score = 0;

  if (!attacker.attack) return -100; // Can't attack without attack value

  if (targetType === "card") {
    const targetCard = target as Card;

    // Check if this kills the target
    if (targetCard.health && targetCard.health <= attacker.attack) {
      score += 40; // Killing is good
      score += (targetCard.attack || 0) * 5; // Prefer killing high attack minions
      score += (targetCard.health || 0) * 3; // Value of health removed
    } else {
      // Partial damage
      score += attacker.attack * 2;
    }

    // Check if we survive the counter-attack
    if (attacker.health && targetCard.attack) {
      if (attacker.health <= targetCard.attack) {
        score -= 30; // We die in the trade
        // But if it's a favorable trade (we kill high value), it's okay
        if (targetCard.health && targetCard.health <= attacker.attack) {
          score += (targetCard.attack || 0) * 3 + (targetCard.health || 0) * 2;
        }
      }
    }

    // Prefer removing taunts
    if (targetCard.taunt) {
      score += 20;
    }
  } else {
    // Attacking face
    score += attacker.attack * 10; // Face damage is valuable

    // Check for lethal
    if (enemyPlayer.hp <= attacker.attack) {
      score += 1000; // LETHAL! Always go for it
    }
  }

  return score;
}

/**
 * Evaluate an effect's value
 */
function evaluateEffect(
  effect: any,
  card: Card,
  target: TargetValue | null,
  G: GameState,
  ctx: Ctx,
  enemyPlayer: Player,
): number {
  let score = 0;

  switch (effect.type) {
    case "damage":
      const damage =
        typeof effect.value === "string"
          ? (card[effect.value as keyof Card] as number)
          : effect.value;

      if (effect.target === "enemy-hero") {
        score += damage * 8;
        // Check for lethal
        if (enemyPlayer.hp <= damage) {
          score += 1000; // LETHAL!
        }
      } else if (effect.target === "user-select" && target) {
        if (target.type === "player") {
          score += damage * 8;
          const targetPlayer = G.players[target.player];
          if (targetPlayer.hp <= damage) {
            score += 1000; // LETHAL!
          }
        } else if (target.type === "card") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          if (targetCard && targetCard.health) {
            if (targetCard.health <= damage) {
              score += 40; // Killing minion
              score += (targetCard.attack || 0) * 5;
            } else {
              score += damage * 4;
            }
          }
        }
      }
      break;

    case "heal":
      if (effect.target === "friendly-hero" || effect.target === "self-hero") {
        const player = G.players[ctx.currentPlayer];
        const missingHp = player.maxHp - player.hp;
        score += Math.min(missingHp, effect.value) * 3;
      } else if (effect.target === "all-friendly") {
        score += effect.value * (G.board[ctx.currentPlayer].length + 1) * 2; // Heal on multiple minions is good
      } else if (effect.target === "user-select" && target) {
        if (target.type === "player") {
          const targetPlayer = G.players[target.player];
          const missingHp = targetPlayer.maxHp - targetPlayer.hp;
          score += Math.min(missingHp, effect.value) * 3;
        } else if (target.type === "card") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          if (targetCard && targetCard.health && targetCard.maxHealth) {
            const missingHealth = targetCard.maxHealth - targetCard.health;
            score += Math.min(missingHealth, effect.value) * 3;
          }
        }
      }
      break;

    case "draw":
      score += effect.value * 12; // Card draw is very valuable
      break;

    case "summon":
      score += 25; // Summoning minions is valuable
      break;

    case "mana":
      score += effect.value * 8; // Mana is valuable
      break;
  }

  return score;
}

/**
 * Evaluate overall game state
 */
function evaluateGameState(G: GameState, ctx: Ctx): number {
  let score = 0;
  const player = G.players[ctx.currentPlayer];
  const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
  const enemyPlayer = G.players[enemyPlayerId];

  // Board control
  const ourBoard = G.board[ctx.currentPlayer];
  const theirBoard = G.board[enemyPlayerId];

  // Count total stats on board
  const ourBoardValue = ourBoard.reduce(
    (sum, card) => sum + (card.attack || 0) * 2 + (card.health || 0),
    0,
  );
  const theirBoardValue = theirBoard.reduce(
    (sum, card) => sum + (card.attack || 0) * 2 + (card.health || 0),
    0,
  );

  score += (ourBoardValue - theirBoardValue) * 0.5;

  // HP difference
  score += (player.hp - enemyPlayer.hp) * 0.3;

  // Hand size
  score += player.hand.length * 2;

  return score;
}
