// Utility to detect animation events from game event log
import type { AnimationEvent } from "@/types/animations";
import {
  ATTACK_ANIMATION,
  CARD_PLAYED_ANIMATION,
  DEATH_ANIMATION,
  DESTROY_WEAPON_ANIMATION,
  HIT_NUMBER_ANIMATION,
  MINION_PLACED_ANIMATION,
  MINION_SUMMONED_ANIMATION,
  SPELL_CAST_ANIMATION,
  TRIGGER_ANIMATION,
} from "./animationDurations";
import type { GameEvent } from "@project/shared";

/**
 * Detects all animations for a slice of the game event log (one replay step).
 * @param events - seq-ordered events belonging to this step
 * @returns Array of all animation events with timeline positions
 */
export function detectAllAnimations(events: GameEvent[]): AnimationEvent[] {
  const animations: AnimationEvent[] = [];

  // Group events by type in a single pass (or simple filters)
  const attackEvents = events.filter((e) => e.type === "attack");
  const minionPlacedEvents = events.filter((e) => e.type === "minionPlaced");
  const spellCastEvents = events.filter((e) => e.type === "spell");
  const damageEvents = events.filter((e) => e.type === "damage");
  const healEvents = events.filter((e) => e.type === "heal");
  const deathEvents = events.filter((e) => e.type === "death");
  const destroyWeaponEvents = events.filter((e) => e.type === "destroyWeapon");
  const cardPlayedEvents = events.filter((e) => e.type === "cardPlayed");
  const heroPowerEvents = events.filter((e) => e.type === "heroPower");
  const summonEvents = events.filter((e) => e.type === "summon");
  const triggerEvents = events.filter((e) => e.type === "trigger");

  const hasAttacks = attackEvents.length > 0;

  // Process Card Played Animations (fires for minions, spells, and weapons alike)
  cardPlayedEvents.forEach((event) => {
    animations.push({
      type: "cardPlayed",
      card: structuredClone(event.card),
      duration: CARD_PLAYED_ANIMATION.duration,
      playerId: event.playerId,
      startTime: 0,
    });
  });

  heroPowerEvents.forEach((event) => {
    animations.push({
      type: "heroPowerPlayed",
      heroPower: event.heroPower,
      duration: CARD_PLAYED_ANIMATION.duration,
      playerId: event.playerId,
      startTime: 0,
    });
  });

  // Trigger — one card's "whenever…" clause firing. The engine resolves these
  // one per state update, so a step normally carries a single trigger; when one
  // does carry several, stagger them so the icons pulse in sequence and let
  // only the first play the shared cue (same rule the store uses for deaths —
  // several copies of one sound firing together just phase against each other).
  triggerEvents.forEach((event, i) => {
    // Two layers of sound:
    //  - the shared UI cue, first firing only (see above);
    //  - the card's OWN trigger voice line, if it has one. That's per-minion,
    //    so it can't stack with itself and every firing gets it.
    const voice = event.snapshot?.sfx?.trigger ?? [];
    animations.push({
      type: "trigger",
      minionID: event.cardId,
      duration: TRIGGER_ANIMATION.duration,
      startTime: i * TRIGGER_ANIMATION.stagger,
      sfx: [{ soundId: "trigger" }, ...voice],
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
      // sfx: event.card?.sfx?.attack,
    });
  });

  // Process Minion Placed Animations (sfx-only, runs alongside cardPlayed)
  minionPlacedEvents.forEach((event) => {
    animations.push({
      type: "minionPlaced",
      card: structuredClone(event.card),
      playerId: event.playerId,
      startTime: 0,
      duration: MINION_PLACED_ANIMATION.duration,
      sfx: event.card.sfx?.play,
    });
  });

  // Process Spell Cast Animations (sfx-only, runs alongside cardPlayed)
  spellCastEvents.forEach((event) => {
    animations.push({
      type: "spellCast",
      card: structuredClone(event.card),
      playerId: event.playerId,
      startTime: 0,
      duration: SPELL_CAST_ANIMATION.duration,
      sfx: event.card.sfx?.play,
    });
  });

  summonEvents.forEach((event) => {
    animations.push({
      type: "summon",
      card: structuredClone(event.card),
      playerId: event.playerId,
      startTime: 0,
      duration: MINION_SUMMONED_ANIMATION.duration,
      sfx: event.card.sfx?.play?.map((p) => ({
        ...p,
        delay: MINION_SUMMONED_ANIMATION.duration,
      })),
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
      sfx: event.card.sfx?.death,
    });
  });

  destroyWeaponEvents.forEach((event) => {
    animations.push({
      type: "destroyWeapon",
      cardId: event.cardId,
      playerId: event.playerId,
      startTime: deathStartTime,
      duration: DESTROY_WEAPON_ANIMATION.duration,
      sfx: [{ soundId: "weapon-destroy" }, ...(event.card.sfx?.death ?? [])],
    });
  });

  return animations;
}
