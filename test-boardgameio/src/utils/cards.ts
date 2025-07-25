import type { Card, EffectTypes } from "@/types";

const damage = (
    value: number,
    target: "user-select" | "self-hero" | "enemy-hero" = "user-select",
): EffectTypes => {
    return {
        type: "damage",
        value: value,
        target: target,
    };
};

const heal = (value: number): EffectTypes => {
    return {
        type: "heal",
        value: value,
    };
};

const draw = (value: number): EffectTypes => {
    return {
        type: "draw",
        value: value,
    };
};

const changeKey = (
    key: keyof Card,
    value: any,
    target: "other" | "self" = "other",
): EffectTypes => {
    return {
        type: "changeKey",
        key: key,
        value: value,
        target: target,
    };
};

const summon = (
    cardID: string,
): EffectTypes => {
    return {
        type: "summon",
        cardID: cardID,
    };
};

// cardTemplates.ts
export const cardTemplates: Record<string, Omit<Card, "id">> = {
    "flame-imp": {
        title: "Flame Imp",
        description: "Deal 3 damage to your hero.",
        mana: 1,
        attack: 3,
        health: 2,
        type: "Demon",
        imageUrl: "src/assets/Flame_Imp.jpg",
        effects: [damage(3)],
        onPlace: [damage(3, "self-hero")],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "chillwind-yeti": {
        title: "Chillwind Yeti",
        description: "A solid yeti.",
        mana: 4,
        attack: 4,
        health: 5,
        type: "Beast",
        imageUrl: "src/assets/Chillwind_Yeti.jpg",
        effects: [damage(4)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "fireball": {
        title: "Fireball",
        description: "Deal 6 damage.",
        mana: 4,
        attack: undefined,
        health: undefined,
        type: "Spell",
        imageUrl: "src/assets/fireball.jpg",
        effects: [damage(6)],
        onPlace: [],

        isSpell: true,
        targets: ["card", "player"],
        isMinnion: false,
        hasAttacked: false,
    },
    "arcane-intellect": {
        title: "Arcane Intellect",
        description: "Draw 2 cards.",
        mana: 3,
        imageUrl: "src/assets/Arcane_Intellect.jpg",
        type: "Spell",
        effects: [draw(2)],
        onPlace: [],

        isSpell: true,
        targets: [], // Can target the player to draw cards
        isMinnion: false,
        hasAttacked: false,
    },
    "boulderfist-ogre": {
        title: "Boulderfist Ogre",
        description: "Big, dumb, strong.",
        mana: 6,
        attack: 6,
        health: 7,
        type: "Ogre",
        imageUrl: "src/assets/Boulderfist_Ogre_full.jpg",
        effects: [damage(6)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "wolfrider": {
        title: "Wolfrider",
        description: "Charge.",
        mana: 3,
        attack: 3,
        health: 1,
        type: "Beast",
        imageUrl: "src/assets/Wolfrider.jpg",
        effects: [damage(3)],
        onPlace: [changeKey("hasAttacked", false, "self")],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "frostbolt": {
        title: "Frostbolt",
        description: "Deal 3 damage and Freeze.",
        mana: 2,
        type: "Spell",
        imageUrl: "src/assets/Frostbolt.jpg",
        effects: [damage(3)],
        onPlace: [],

        isSpell: true,
        targets: ["card", "player"],
        isMinnion: false,
        hasAttacked: false,
    },
    "bloodfen-raptor": {
        title: "Bloodfen Raptor",
        description: "Just a raptor.",
        mana: 2,
        attack: 3,
        health: 2,
        type: "Beast",
        imageUrl: "src/assets/Bloodfen_Raptor.jpg",
        effects: [damage(3)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "river-crocolisk": {
        title: "River Crocolisk",
        description: "Swampy and snappy.",
        mana: 2,
        attack: 2,
        health: 3,
        type: "Beast",
        imageUrl: "src/assets/River_Crocolisk.jpg",
        effects: [damage(2)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "ironfur-grizzly": {
        title: "Ironfur Grizzly",
        description: "Taunt.",
        mana: 3,
        attack: 3,
        health: 3,
        type: "Beast",
        imageUrl: "src/assets/Ironfur_Grizzly.jpg",
        effects: [damage(3)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "charge": {
        title: "Charge",
        description: "Give a minion Charge.",
        mana: 1,
        type: "Spell",
        imageUrl: "src/assets/Charge.jpg",
        effects: [changeKey("hasAttacked", false)],
        onPlace: [],

        isSpell: true,
        isMinnion: false,
        targets: ["card-friendly"],
        hasAttacked: false,
    },
    "murloc-raider": {
        title: "Murloc Raider",
        description: "",
        attack: 2,
        health: 1,
        mana: 1,
        type: "Murloc",
        imageUrl: "src/assets/Murloc_Raider.jpg",
        effects: [damage(2)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "frostwolf-grunt": {
        title: "Frostwolf Grunt",
        description: "Taunt.",
        attack: 2,
        health: 2,
        mana: 2,
        type: "Orc",
        imageUrl: "src/assets/Frostwolf_Grunt.jpg",
        effects: [damage(2)],
        onPlace: [],

        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "murloc-tidehunter": {
        title: "Murloc Tidehunter",
        description: "Battlecry: Summons a 1/1 Murloc Scout.",
        attack: 2,
        health: 1,
        mana: 2,
        type: "Murloc",
        imageUrl: "src/assets/Murloc_Raider.jpg",
        effects: [
            damage(2),
        ],
        onPlace: [summon("murloc-scout")],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "murloc-scout": {
        title: "Murloc Scout",
        description: "A small murloc.",
        attack: 1,
        health: 1,
        mana: 1,
        type: "Murloc",
        imageUrl: "src/assets/Murloc_Raider.jpg",
        effects: [damage(1)],
        onPlace: [],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "razorfen-hunter": {
        title: "Razorfen Hunter",
        description: "Battlecry: Summons a 1/1 Boar.",
        attack: 2,
        health: 3,
        mana: 3,
        type: "Tauren",
        imageUrl: "src/assets/Razorfen_Hunter.jpg",
        effects: [damage(2)],
        onPlace: [summon("boar")],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
    "boar": {
        title: "Boar",
        description: "A wild boar.",
        attack: 1,
        health: 1,
        mana: 1,
        type: "Beast",
        imageUrl: "src/assets/Boar.jpg",
        effects: [damage(1)],
        onPlace: [],
        targets: ["card-opponent", "player-opponent"],
        isMinnion: true,
        hasAttacked: false,
    },
} as const;
