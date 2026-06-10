// Animation event types for the animation queue system
import type { PlayerID } from "boardgame.io";

export type AttackAnimation = {
  type: "attack";
  attackerId: string;
  targetId: string;
  targetType: "card" | "player";
  targetPlayerId: PlayerID;
  attackerPlayerId: PlayerID;
  startTime: number; // When to start on the timeline (ms from animation sequence start)
  duration: number; // How long the animation lasts (ms)
};

export type DeathAnimation = {
  type: "death";
  cardId: string;
  playerId: PlayerID;
  startTime: number; // When to start on the timeline (ms from animation sequence start)
  duration: number; // How long the animation lasts (ms)
};

export type AnimationEvent = AttackAnimation | DeathAnimation;
