import type { Card, EffectTypes } from "@/types";

const damage = (
  value: number | keyof Card,
  target: "user-select" | "self-hero" | "enemy-hero" = "user-select"
): EffectTypes => {
  return {
    type: "damage",
    value: value,
    target: target,
  };
};

const mana = (value: number): EffectTypes => {
  return { type: "mana", value: value };
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
  target: "other" | "self" = "other"
): EffectTypes => {
  return {
    type: "changeKey",
    key: key,
    value: value,
    target: target,
  };
};

const incrementValue = (
  key: keyof Card,
  value: number,
  target: "other" | "self" = "other"
): EffectTypes => {
  return {
    type: "incrementValue",
    key: key,
    value: value,
    target: target,
  };
};

const summon = (cardID: string): EffectTypes => {
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
    effects: [damage("attack")],
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
    effects: [damage("attack")],
    onPlace: [],

    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  fireball: {
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
    effects: [damage("attack")],
    onPlace: [],

    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  wolfrider: {
    title: "Wolfrider",
    description: "Charge.",
    mana: 3,
    attack: 3,
    health: 1,
    type: "Beast",
    imageUrl: "src/assets/Wolfrider.jpg",
    effects: [damage("attack")],
    onPlace: [changeKey("hasAttacked", false, "self")],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  frostbolt: {
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
    effects: [damage("attack")],
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
    effects: [damage("attack")],
    onPlace: [],

    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "ironfur-grizzly": {
    title: "Ironfur Grizzly",
    description: "Taunt.",
    taunt: true,
    mana: 3,
    attack: 3,
    health: 3,
    type: "Beast",
    imageUrl: "src/assets/Ironfur_Grizzly.jpg",
    effects: [damage("attack")],
    onPlace: [],

    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  charge: {
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
    effects: [damage("attack")],
    onPlace: [],

    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "frostwolf-grunt": {
    title: "Frostwolf Grunt",
    description: "Taunt.",
    taunt: true,
    attack: 2,
    health: 2,
    mana: 2,
    type: "Orc",
    imageUrl: "src/assets/Frostwolf_Grunt.jpg",
    effects: [damage("attack")],
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
    effects: [damage("attack")],
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
    effects: [damage("attack")],
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
    effects: [damage("attack")],
    onPlace: [summon("boar")],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  boar: {
    title: "Boar",
    description: "A wild boar.",
    attack: 1,
    health: 1,
    mana: 1,
    type: "Beast",
    imageUrl: "src/assets/Boar.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "dragonling-mechanic": {
    title: "Dragonling Mechanic",
    description: "Battlecry: Summons a 2/1 Mechanical Dragonling.",
    attack: 2,
    health: 4,
    mana: 4,
    type: "Mechanical",
    imageUrl: "src/assets/Dragonling_Mechanic.jpg",
    effects: [damage("attack")],
    onPlace: [summon("mechanical-dragonling")],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "mechanical-dragonling": {
    title: "Mechanical Dragonling",
    description: "A mechanical dragonling.",
    attack: 2,
    health: 1,
    mana: 2,
    type: "Mechanical",
    imageUrl: "src/assets/Mechanical_Dragonling.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "senjin-shieldmasta": {
    title: "Sen'jin Shieldmasta",
    description: "Taunt.",
    taunt: true,
    attack: 3,
    health: 5,
    mana: 4,
    type: "Troll",
    imageUrl: "src/assets/Senjin_Shieldmasta.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  innervate: {
    title: "Innervate",
    description: "Gain 2 Mana Crystal this turn only.",
    mana: 0,
    type: "Spell",
    imageUrl: "src/assets/Innervate.jpg",
    effects: [mana(2)],
    onPlace: [],
    isSpell: true,
    targets: [],
    isMinnion: false,
    hasAttacked: false,
  },
  "mark-of-the-wild": {
    title: "Mark of the Wild",
    description: "Give a minion +2/+3 and Taunt.",
    mana: 2,
    type: "Spell",
    imageUrl: "src/assets/Mark_of_the_Wild.jpg",
    effects: [
      incrementValue("attack", 2),
      incrementValue("health", 3),
      changeKey("taunt", true),
    ],
    onPlace: [],
    isSpell: true,
    targets: ["card-friendly"],
    isMinnion: false,
    hasAttacked: false,
  },
  "healing-touch": {
    title: "Healing Touch",
    description: "Restore 8 Health.",
    mana: 3,
    type: "Spell",
    imageUrl: "src/assets/Healing_Touch.jpg",
    effects: [heal(8)],
    onPlace: [],
    isSpell: true,
    targets: ["card-friendly", "player-friendly"],
    isMinnion: false,
    hasAttacked: false,
  },
  "darkscale-healer": {
    title: "Darkscale Healer",
    description: "Battlecry: Restore 2 Health.",
    attack: 3,
    health: 4,
    mana: 3,
    type: "Naga",
    imageUrl: "src/assets/Darkscale_Healer.jpg",
    effects: [damage("attack")],
    onPlace: [heal(2)],
    targets: ["lane-friendly", "card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  nightblade: {
    title: "Nightblade",
    description: "Deal 3 damage to the enemy hero.",
    attack: 4,
    health: 4,
    mana: 5,
    type: "Human",
    imageUrl: "src/assets/Nightblade.jpg",
    effects: [damage("attack")],
    onPlace: [damage(3, "enemy-hero")],
    targets: ["player-opponent", "card-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "elven-archer": {
    title: "Elven Archer",
    description: "Battlecry: Deal 1 damage.",
    attack: 1,
    health: 1,
    mana: 1,
    type: "Elf",
    imageUrl: "src/assets/Elven_Archer.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "core-hound": {
    title: "Core Hound",
    description: "A big, fiery dog.",
    attack: 9,
    health: 7,
    mana: 7,
    type: "Beast",
    imageUrl: "src/assets/Core_Hound.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
  "silverback-patriarch": {
    title: "Silverback Patriarch",
    description: "Taunt.",
    taunt: true,
    attack: 1,
    health: 4,
    mana: 3,
    type: "Beast",
    imageUrl: "src/assets/Silverback_Patriarch.jpg",
    effects: [damage("attack")],
    onPlace: [],
    targets: ["card-opponent", "player-opponent"],
    isMinnion: true,
    hasAttacked: false,
  },
} as const;
