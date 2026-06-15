// Utility to detect animation events from game event log
import type { AnimationEvent } from "@/types/animations";
import {
  ATTACK_ANIMATION,
  CARD_PLAYED_ANIMATION,
  DEATH_ANIMATION,
  HIT_NUMBER_ANIMATION,
} from "./animationDurations";
import type { GameState } from "@project/shared";

/**
 * Detects all animations by reading from game event log
 * @param stateAfter - Game state after the move (contains gameEvents)
 * @returns Array of all animation events with timeline positions
 */
export function detectAllAnimations(stateAfter: GameState): AnimationEvent[] {
  const animations: AnimationEvent[] = [];
  const events = stateAfter.gameEvents || [];

  // Group events by type in a single pass (or simple filters)
  const attackEvents = events.filter((e) => e.type === "attack");
  const damageEvents = events.filter((e) => e.type === "damage");
  const healEvents = events.filter((e) => e.type === "heal");
  const deathEvents = events.filter((e) => e.type === "death");
  const minionPlacedEvents = events.filter((e) => e.type === "minionPlaced");
  const spelLEvents = events.filter((e) => e.type === "spell");

  const hasAttacks = attackEvents.length > 0;

  // Process Card Played Animations
  minionPlacedEvents.forEach((event) => {
    const card = structuredClone(event.card);
    card.isPlaced = false;
    animations.push({
      type: "cardPlayed",
      card: structuredClone(event.card),
      duration: CARD_PLAYED_ANIMATION.duration,
      playerId: event.playerId,
      startTime: 0,
    });
  });
  spelLEvents.forEach((event) => {
    animations.push({
      type: "cardPlayed",
      card: event.card,
      duration: CARD_PLAYED_ANIMATION.duration,
      playerId: event.playerId,
      startTime: 0,
    });
  });

  // Process Attack Animations
  attackEvents.forEach((event) => {
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
  });

  // Process Hit Numbers (Damage/Heal) - Always starts at 0
  [...damageEvents, ...healEvents].forEach((event) => {
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
  });

  //  Process Death Animations - Dynamic start time based on context
  const deathStartTime = hasAttacks ? ATTACK_ANIMATION.duration + 50 : 0;

  deathEvents.forEach((event) => {
    animations.push({
      type: "death",
      cardId: event.cardId,
      playerId: event.playerId,
      startTime: deathStartTime,
      duration: DEATH_ANIMATION.duration,
    });
  });

  return animations;
}
