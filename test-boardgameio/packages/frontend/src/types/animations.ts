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
};

export type AnimationEvent =
  | AttackAnimation
  | DeathAnimation
  | HitNumberAnimation
  | CardPlayedAnimation
  | HeroPowerPlayedAnimation
  | MinionPlacedAnimation
  | SpellCastAnimation
  | SummonAnimation;

// Queue item that pairs animations with their game state and context
export type AnimationQueueItem = {
  animations: AnimationEvent[];
  gameState: GameState; // Full game state snapshot for this animation batch
  ctx: any; // Context snapshot (currentPlayer, phase, etc.)
};
