import type { PlayerID } from "boardgame.io";

export interface Card {
    id: string;
    title?: string;
    description?: string;
    mana?: number;
    attack?: number;
    health?: number;
    type?: string; // e.g., "Spell", "Beast", "Demon", etc.
    imageUrl?: string; // URL to the card image
}

export interface Player {
    id: PlayerID;
    name: string;
    maxHp: number;
    hp: number;
    maxArmor: number;
    armor: number;
    maxMana: number;
    mana: number;
    hand: Card[];
    deck: Card[];
}

export interface GameState {
    players: Record<PlayerID, Player>;
    board: Record<PlayerID, Card[]>;
}
