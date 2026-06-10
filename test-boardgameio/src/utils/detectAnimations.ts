// Utility to detect animation events from game event log
import type { GameState } from "@/types";
import type { AnimationEvent } from "@/types/animations";
import {
  ATTACK_ANIMATION,
  DEATH_ANIMATION,
  HIT_NUMBER_ANIMATION,
} from "./animationDurations";

/**
 * Detects all animations by reading from game event log
 * @param stateAfter - Game state after the move (contains gameEvents)
 * @returns Array of all animation events with timeline positions
 */
export function detectAllAnimations(stateAfter: GameState): AnimationEvent[] {
  const animations: AnimationEvent[] = [];
  const events = stateAfter.gameEvents || [];

  // Separate events by type for timeline management
  const attackEvents = events.filter((e) => e.type === "attack");
  const damageEvents = events.filter((e) => e.type === "damage");
  const healEvents = events.filter((e) => e.type === "heal");
  const deathEvents = events.filter((e) => e.type === "death");

  // Timeline: attacks first, then deaths
  if (attackEvents.length > 0) {
    // Add attack animations (start at 0ms)
    attackEvents.forEach((event) => {
      if (event.type === "attack") {
        animations.push({
          type: "attack",
          attackerId: event.attackerId,
          targetId: event.targetId,
          targetType: event.targetType,
          targetPlayerId: event.targetPlayerId,
          attackerPlayerId: event.attackerPlayerId,
          startTime: 0,
          duration: ATTACK_ANIMATION.duration,
        });
      }
    });

    // Hit numbers appear with attack (0ms)
    [...damageEvents, ...healEvents].forEach((event) => {
      if (event.type === "damage" || event.type === "heal") {
        animations.push({
          type: "hitNumber",
          targetId: event.targetId,
          targetType: event.targetType,
          playerId: event.playerId,
          value: event.value,
          damageType: event.type === "damage" ? "damage" : "heal",
          startTime: 0,
          duration: HIT_NUMBER_ANIMATION.duration,
        });
      }
    });

    // Deaths happen after attack (450ms)
    deathEvents.forEach((event) => {
      if (event.type === "death") {
        animations.push({
          type: "death",
          cardId: event.cardId,
          playerId: event.playerId,
          startTime: ATTACK_ANIMATION.duration + 50,
          duration: DEATH_ANIMATION.duration,
        });
      }
    });
  } else {
    // No attacks - all events start immediately
    [...damageEvents, ...healEvents].forEach((event) => {
      if (event.type === "damage" || event.type === "heal") {
        animations.push({
          type: "hitNumber",
          targetId: event.targetId,
          targetType: event.targetType,
          playerId: event.playerId,
          value: event.value,
          damageType: event.type === "damage" ? "damage" : "heal",
          startTime: 0,
          duration: HIT_NUMBER_ANIMATION.duration,
        });
      }
    });

    deathEvents.forEach((event) => {
      if (event.type === "death") {
        animations.push({
          type: "death",
          cardId: event.cardId,
          playerId: event.playerId,
          startTime: 0,
          duration: DEATH_ANIMATION.duration,
        });
      }
    });
  }

  return animations;
}
