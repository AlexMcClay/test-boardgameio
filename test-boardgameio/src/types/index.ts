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
    isPlaced?: boolean; // Optional, to track if the card is placed on the board
    hasAttacked?: boolean; // Optional, to track if the card has attacked this turn
    isSpell?: boolean; // Optional, to indicate if the card is a spell
    isMinnion: boolean; // Optional, to indicate if the card is a minion
    targets: TargetTypes[]; // Optional, to specify valid targets for the card
}

type TargetTypes =
    | "card"
    | "player"
    | "card-friendly"
    | "card-opponent"
    | "player-friendly"
    | "player-opponent";

export type EffectTypes =
    | DamageEffect
    | HealEffect
    | DrawEffect
    | ChangeKeyEffect;

type DamageEffect = { type: "damage"; value: number };

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
};

export interface Player {
    id: PlayerID;
    name: string;
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
