import type { PlayerID } from "boardgame.io";

export interface Card {
  id: string;
  title: string;
  description: string;
  mana: number | null;
  attack?: number;
  health?: number;
  type?: string; // e.g., "Spell", "Beast", "Demon", etc.
  imageUrl?: string; // URL to the card image
  effects: Array<EffectTypes>;
  onPlace: Array<EffectTypes>; // Effects that trigger when the card is placed
  isPlaced?: boolean; // Optional, to track if the card is placed on the board
  hasAttacked: boolean; // Optional, to track if the card has attacked this turn
  isSpell?: boolean; // Optional, to indicate if the card is a spell
  isMinnion: boolean; // Optional, to indicate if the card is a minion
  taunt?: boolean; // Optional, to indicate if the card has taunt
  targets: TargetTypes[]; // Optional, to specify valid targets for the card
}

export type TargetValue = {
  type: "card" | "player" | "lane";
  id: string;
  player: PlayerID;
};

type TargetTypes =
  | "card"
  | "player"
  | "card-friendly"
  | "card-opponent"
  | "player-friendly"
  | "player-opponent"
  | "lane-friendly"
  | "lane-opponent";

export type EffectTypes =
  | DamageEffect
  | HealEffect
  | DrawEffect
  | ChangeKeyEffect
  | SummonEffect
  | ManaEffect
  | IncrementValueEffect;

type DamageEffect = {
  type: "damage";
  value: number | keyof Card;

  target: "user-select" | "self-hero" | "enemy-hero"; // Target can be user-select, self-hero, enemy-hero, or hero
};

type HealEffect = {
  type: "heal";
  value: number;
};

type DrawEffect = {
  type: "draw";
  value: number; // Number of cards to draw
};

type ChangeKeyEffect = {
  type: "changeKey";
  key: keyof Card; // Key to change in the card object
  value: any; // New value for the key
  target: "other" | "self"; // Target of the change, either "other" or "self"
};

type IncrementValueEffect = {
  type: "incrementValue";
  key: keyof Card; // Key to change in the card object
  value: any; // New value for the key
  target: "other" | "self"; // Target of the change, either "other" or "self"
};

type SummonEffect = {
  type: "summon";
  cardID: string; // ID of the card to summon
};

type ManaEffect = {
  type: "mana";
  value: number;
};

export interface Player {
  id: PlayerID;
  name: string;
  heroPortrait: string; // Optional, if you want to display a hero portrait
  maxHp: number;
  hp: number;
  maxArmor: number;
  armor: number;
  mana: number;
  hand: Card[];
  deck: Card[];
}

export interface GameState {
  players: Record<PlayerID, Player>;
  board: Record<PlayerID, Card[]>;
  maxMana: number; // Optional, if you want to track max mana globally
}
