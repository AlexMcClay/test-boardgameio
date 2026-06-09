// Animation event types for the animation queue system
import type { PlayerID } from "boardgame.io";

export type AttackAnimation = {
  type: "attack";
  attackerId: string;
  targetId: string;
  targetType: "card" | "player";
  targetPlayerId: PlayerID;
  attackerPlayerId: PlayerID;
};

export type DeathAnimation = {
  type: "death";
  cardId: string;
  playerId: PlayerID;
};

export type AnimationEvent = AttackAnimation | DeathAnimation;
