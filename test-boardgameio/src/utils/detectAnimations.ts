// Utility to detect animation events by comparing game states
import type { GameState, MoveMetadata } from "@/types";
import type {
  AttackAnimation,
  DeathAnimation,
  HitNumberAnimation,
  AnimationEvent,
} from "@/types/animations";
import type { PlayerID } from "boardgame.io";
import {
  ATTACK_ANIMATION,
  DEATH_ANIMATION,
  HIT_NUMBER_ANIMATION,
} from "./animationDurations";

/**
 * Compares two game states and detects which cards died
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @returns Array of death animations for cards that were removed
 */
export function detectDeaths(
  stateBefore: GameState,
  stateAfter: GameState,
): DeathAnimation[] {
  const deaths: DeathAnimation[] = [];

  // Check both players' boards
  (["0", "1"] as PlayerID[]).forEach((playerId) => {
    const boardBefore = stateBefore.board[playerId];
    const boardAfter = stateAfter.board[playerId];

    // Find cards that existed before but not after
    boardBefore.forEach((card) => {
      const stillExists = boardAfter.some((c) => c.id === card.id);

      // Card died if it no longer exists
      if (!stillExists) {
        deaths.push({
          type: "death",
          cardId: card.id,
          playerId,
          startTime: 0, // Default, will be overridden by detectAllAnimations
          duration: DEATH_ANIMATION.duration, // Default duration
        });
      }
    });
  });

  return deaths;
}

/**
 * Detects attack animations by analyzing move metadata and state changes
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @param lastMove - Metadata about the last move
 * @param currentPlayer - The player who made the move
 * @returns Array of attack animations if an attack occurred
 */
export function detectAttacks(
  stateBefore: GameState,
  stateAfter: GameState,
  lastMove: MoveMetadata | undefined,
  currentPlayer: PlayerID,
): AttackAnimation[] {
  const attacks: AttackAnimation[] = [];

  // Early exit conditions - not an attack if:
  // 1. No move metadata
  // 2. Card played from hand (not already on board)
  // 3. No target specified
  if (!lastMove || lastMove.location !== "board" || !lastMove.target) {
    return attacks;
  }

  const target = lastMove.target;

  // Don't animate attacks on friendly targets (e.g., charge spell, buff spell)
  if (target.player === currentPlayer) {
    return attacks;
  }

  // Verify damage was actually dealt to confirm this was an attack
  let damageDealt = false;

  if (target.type === "player") {
    // Check if player HP decreased
    const hpBefore = stateBefore.players[target.player].hp;
    const hpAfter = stateAfter.players[target.player].hp;
    damageDealt = hpAfter < hpBefore;
  } else if (target.type === "card") {
    // Check if target card's health decreased or was removed
    const cardBefore = stateBefore.board[target.player].find(
      (c) => c.id === target.id,
    );
    const cardAfter = stateAfter.board[target.player].find(
      (c) => c.id === target.id,
    );

    if (cardBefore && cardBefore.health !== undefined) {
      // Card was removed (health reached 0) or health decreased
      damageDealt =
        !cardAfter ||
        (cardAfter.health !== undefined &&
          cardAfter.health < cardBefore.health);
    }
  }

  // Only create attack animation if damage was confirmed
  if (damageDealt) {
    attacks.push({
      type: "attack",
      attackerId: lastMove.cardId,
      targetId: target.id,
      targetType: target.type === "player" ? "player" : "card",
      targetPlayerId: target.player,
      attackerPlayerId: currentPlayer,
      startTime: 0, // Default, will be overridden by detectAllAnimations
      duration: ATTACK_ANIMATION.duration,
    });
  }

  return attacks;
}

/**
 * Detects hit number animations by comparing health values
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @returns Array of hit number animations for damage/healing
 */
export function detectHitNumbers(
  stateBefore: GameState,
  stateAfter: GameState,
): HitNumberAnimation[] {
  const hitNumbers: HitNumberAnimation[] = [];

  // Check player health changes
  (["0", "1"] as PlayerID[]).forEach((playerId) => {
    const hpBefore = stateBefore.players[playerId].hp;
    const hpAfter = stateAfter.players[playerId].hp;

    if (hpBefore !== hpAfter) {
      const difference = hpBefore - hpAfter;

      hitNumbers.push({
        type: "hitNumber",
        targetId: playerId,
        targetType: "player",
        playerId,
        value: Math.abs(difference),
        damageType: difference > 0 ? "damage" : "heal",
        startTime: 0, // Will be overridden by detectAllAnimations
        duration: HIT_NUMBER_ANIMATION.duration,
      });
    }
  });

  // Check card health changes
  (["0", "1"] as PlayerID[]).forEach((playerId) => {
    const boardBefore = stateBefore.board[playerId];
    const boardAfter = stateAfter.board[playerId];

    boardBefore.forEach((cardBefore) => {
      const cardAfter = boardAfter.find((c) => c.id === cardBefore.id);

      // Only check if card still exists and has health
      if (
        cardAfter &&
        cardBefore.health !== undefined &&
        cardAfter.health !== undefined
      ) {
        const difference = cardBefore.health - cardAfter.health;

        if (difference !== 0) {
          hitNumbers.push({
            type: "hitNumber",
            targetId: cardBefore.id,
            targetType: "card",
            playerId,
            value: Math.abs(difference),
            damageType: difference > 0 ? "damage" : "heal",
            startTime: 0, // Will be overridden by detectAllAnimations
            duration: HIT_NUMBER_ANIMATION.duration,
          });
        }
      }
    });
  });

  return hitNumbers;
}

/**
 * Detects all animations by comparing game states
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @param currentPlayer - The player who made the move
 * @returns Array of all detected animation events with timeline positions
 */
export function detectAllAnimations(
  stateBefore: GameState,
  stateAfter: GameState,
  currentPlayer: PlayerID,
): AnimationEvent[] {
  const animations: AnimationEvent[] = [];

  // Detect attacks first (they happen before deaths)

  // Detect hit numbers
  const hitNumbers = detectHitNumbers(stateBefore, stateAfter);
  const attacks = detectAttacks(
    stateBefore,
    stateAfter,
    stateAfter.lastMove,
    currentPlayer,
  );

  // Detect deaths
  const deaths = detectDeaths(stateBefore, stateAfter);

  // Timeline-based animation assignment
  if (attacks.length > 0) {
    const attack = attacks[0];

    // Hit numbers appear simultaneously with the attack
    hitNumbers.forEach((hitNumber) => {
      hitNumber.startTime = 0;
      hitNumber.duration = HIT_NUMBER_ANIMATION.duration;
    });
    animations.push(...hitNumbers);

    // Attack starts immediately and lasts 400ms
    attack.startTime = 0;
    attack.duration = ATTACK_ANIMATION.duration;
    animations.push(attack);

    deaths.forEach((death) => {
      death.duration = DEATH_ANIMATION.duration; // Death animations last 300ms
      death.startTime = ATTACK_ANIMATION.duration + 50;
    });

    animations.push(...deaths);
  } else {
    // No attacks, just deaths/damage (e.g., spell damage)
    // All deaths and hit numbers happen immediately
    deaths.forEach((death) => {
      death.startTime = 0;
      death.duration = DEATH_ANIMATION.duration;
    });
    animations.push(...deaths);

    hitNumbers.forEach((hitNumber) => {
      hitNumber.startTime = 0;
      hitNumber.duration = HIT_NUMBER_ANIMATION.duration;
    });
    animations.push(...hitNumbers);
  }

  return animations;
}
