// Animation event types for the animation queue system
import type { PlayerID } from "@project/shared";
import type { Card, GameState, HeroPower, SFXInstance } from "@project/shared";

export type AttackAnimation = {
  type: "attack";
  attackerId: string;
  targetId: string;
  targetType: "card" | "player";
  targetPlayerId: PlayerID;
  attackerPlayerId: PlayerID;
  startTime: number; // When to start on the timeline (ms from animation sequence start)
  duration: number; // How long the animation lasts (ms)
  sfx?: SFXInstance[];
};

export type DeathAnimation = {
  type: "death";
  cardId: string;
  playerId: PlayerID;
  startTime: number; // When to start on the timeline (ms from animation sequence start)
  duration: number; // How long the animation lasts (ms)
  sfx?: SFXInstance[];
};

export type DestroyWeaponAnimation = {
  type: "destroyWeapon";
  cardId: string;
  playerId: PlayerID;
  startTime: number;
  duration: number;
  sfx?: SFXInstance[];
};

/**
 * A card was discarded from hand. Like DeathAnimation this carries no visual of
 * its own — <HandCard> watches for one matching its id and swaps in the
 * flourish exit, which plays as the card leaves the visual hand.
 */
export type DiscardAnimation = {
  type: "discard";
  cardId: string;
  playerId: PlayerID;
  startTime: number;
  duration: number;
  sfx?: SFXInstance[];
};

/**
 * A minion was replaced in place by another template (Polymorph, Hex, Cat/Bear
 * Form). The engine preserves `card.id` across the swap so the board slot never
 * remounts — which also means nothing about it animates on its own. This holds
 * the queue for a beat and plays the new minion's arrival cue.
 */
export type TransformAnimation = {
  type: "transform";
  cardId: string;
  card: Card; // what it became
  playerId: PlayerID;
  startTime: number;
  duration: number;
  sfx?: SFXInstance[];
};

export type MinionPlacedAnimation = {
  type: "minionPlaced";
  card: Card;
  playerId: PlayerID;
  startTime: number;
  duration: number;
  sfx?: SFXInstance[];
};

export type SpellCastAnimation = {
  type: "spellCast";
  card: Card;
  playerId: PlayerID;
  startTime: number;
  duration: number;
  sfx?: SFXInstance[];
};

export type HitNumberAnimation = {
  type: "hitNumber";
  targetId: string; // card ID or player ID
  targetType: "card" | "player";
  playerId: PlayerID;
  value: number; // Amount (positive value)
  damageType: "damage" | "heal"; // To determine color
  startTime: number; // When to start on the timeline (ms from animation sequence start)
  duration: number; // How long the animation lasts (ms)
};

export type CardPlayedAnimation = {
  type: "cardPlayed";
  card: Card;
  duration: number;
  startTime: number;
  playerId: PlayerID;
};

export type HeroPowerPlayedAnimation = {
  type: "heroPowerPlayed";
  heroPower: HeroPower;
  duration: number;
  startTime: number;
  playerId: PlayerID;
};

export type SummonAnimation = {
  type: "summon";
  card: Card;
  duration: number;
  startTime: number;
  playerId: PlayerID;
  sfx?: SFXInstance[];
};

/**
 * Mulligan completion hold: keeps the animation queue busy while the overlay
 * reveals the replaced cards (first batch) and while the drawn hands settle
 * onto the board (second batch). Purely a pacing animation — no visual of
 * its own.
 */
export type MulliganEndAnimation = {
  type: "mulliganEnd";
  duration: number;
  startTime: number;
};

export type TriggerAnimation = {
  type: "trigger";
  duration: number;
  startTime: number;
  minionID: string;
  sfx?: SFXInstance[];
};

export type AnimationEvent =
  | AttackAnimation
  | DeathAnimation
  | DestroyWeaponAnimation
  | DiscardAnimation
  | TransformAnimation
  | HitNumberAnimation
  | CardPlayedAnimation
  | HeroPowerPlayedAnimation
  | MinionPlacedAnimation
  | SpellCastAnimation
  | SummonAnimation
  | MulliganEndAnimation
  | TriggerAnimation;

// Queue item that pairs animations with their game state and context
export type AnimationQueueItem = {
  animations: AnimationEvent[];
  gameState: GameState; // Full game state snapshot for this animation batch
  ctx: any; // Context snapshot (currentPlayer, phase, etc.)
};
