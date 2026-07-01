import type { Hero, HeroPower } from "../types";

// Hero Power Definitions
const armorUp: HeroPower = {
  name: "Armor Up!",
  description: "Gain 2 Armor.",
  imageUrl: "assets/hero_powers/Armor_Up!.jpg",
  manaCost: 2,
  effects: [
    {
      type: "armor",
      value: 2,
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const fireblast: HeroPower = {
  name: "Fireblast",
  description: "Deal 1 damage.",
  imageUrl: "assets/hero_powers/Fireblast.jpg",
  manaCost: 2,
  effects: [
    {
      type: "damage",
      value: 1,
      target: "user-select",
    },
  ],
  targetQuery: {
    side: "all",
    type: ["card", "player"],
  },
};

const lesserHeal: HeroPower = {
  name: "Lesser Heal",
  description: "Restore 2 Health.",
  imageUrl: "assets/hero_powers/Lesser_Heal.jpg",
  manaCost: 2,
  effects: [
    {
      type: "heal",
      value: 2,
      target: "user-select",
    },
  ],
  targetQuery: {
    side: "all",
    type: ["card", "player"],
  },
};

const lifeTap: HeroPower = {
  name: "Life Tap",
  description: "Draw a card and take 2 damage.",
  imageUrl: "assets/hero_powers/Life_Tap.jpg",
  manaCost: 2,
  effects: [
    {
      type: "draw",
      value: 1,
    },
    {
      type: "damage",
      value: 2,
      target: "friendly-hero",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const reinforce: HeroPower = {
  name: "Reinforce",
  description: "Summon a 1/1 Silver Hand Recruit.",
  imageUrl: "assets/hero_powers/Reinforce.jpg",
  manaCost: 2,
  effects: [
    {
      type: "summon",
      cardID: "silver-hand-recruit",
      target: "self",
      value: 1,
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const shapeshift: HeroPower = {
  name: "Shapeshift",
  description: "+1 Attack this turn. +1 Armor.",
  imageUrl: "assets/hero_powers/Shapeshift.jpg",
  manaCost: 2,
  effects: [
    {
      type: "applyModifier",
      stat: "attack",
      value: 1,
      target: "friendly-hero",
      duration: {
        expiryTrigger: "END_OF_TURN",
        expiryOwner: "BUFF_CASTER",
      },
      override: false,
    },
    {
      type: "armor",
      value: 1,
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const steadyShot: HeroPower = {
  name: "Steady Shot",
  description: "Deal 2 damage to the enemy hero.",
  imageUrl: "assets/hero_powers/Steady_Shot.jpg",
  manaCost: 2,
  effects: [
    {
      type: "damage",
      value: 2,
      target: "enemy-hero",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

// Placeholder hero power for heroes not yet implemented
const placeholderPower: HeroPower = {
  name: "Placeholder",
  description: "Not yet implemented.",
  manaCost: 2,
  effects: [],
  imageUrl: "assets/hero_powers/Placeholder.jpg",
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

// individual hero definitions
export const warriorHero: Hero = {
  name: "Warrior",
  portrait: "assets/heros/Garrosh.jpg",
  class: "Warrior",
  heroName: "Garrosh Hellscream",
  heroPower: armorUp,
};

export const shamanHero: Hero = {
  name: "Shaman",
  portrait: "assets/heros/Thrall.jpg",
  class: "Shaman",
  heroName: "Thrall",
};

export const rogueHero: Hero = {
  name: "Rogue",
  portrait: "assets/heros/Valeera.jpg",
  class: "Rogue",
  heroPower: placeholderPower,
  heroName: "Valeera Sanguinar",
};

export const paladinHero: Hero = {
  name: "Paladin",
  portrait: "assets/heros/Uther.jpg",
  heroPower: reinforce,
  class: "Paladin",
  heroName: "Uther Lightbringer",
};

export const hunterHero: Hero = {
  name: "Hunter",
  heroPower: steadyShot,
  portrait: "assets/heros/Rexxar.jpg",
  class: "Hunter",
  heroName: "Rexxar",
};

export const druidHero: Hero = {
  heroPower: shapeshift,
  name: "Druid",
  portrait: "assets/heros/Malfurion.jpg",
  class: "Druid",
  heroName: "Malfurion Stormrage",
};

export const warlockHero: Hero = {
  name: "Warlock",
  portrait: "assets/heros/Guldan.jpg",
  class: "Warlock",
  heroName: "Gul'dan",
  heroPower: lifeTap,
};

export const mageHero: Hero = {
  name: "Mage",
  portrait: "assets/heros/Jaina.jpg",
  class: "Mage",
  heroName: "Jaina Proudmoore",
  heroPower: fireblast,
};

export const priestHero: Hero = {
  name: "Priest",
  portrait: "assets/heros/Anduin.jpg",
  class: "Priest",
  heroName: "Anduin Wrynn",
  heroPower: lesserHeal,
};

// Bonus: Later additions to Hearthstone included in your folder
export const demonHunterHero: Hero = {
  name: "Demon Hunter",
  portrait: "assets/heros/Illidan_Stormrage.jpg",
  class: "Demon Hunter",
  heroPower: placeholderPower,
  heroName: "Illidan Stormrage",
};

export const deathKnightHero: Hero = {
  name: "Death Knight",
  portrait: "assets/heros/Arthas.jpg",
  heroPower: placeholderPower,
  class: "Death Knight",
  heroName: "Arthas Menethil",
};

// Exported array containing all heroes
export const heros: Hero[] = [
  warriorHero,
  shamanHero,
  rogueHero,
  paladinHero,
  hunterHero,
  druidHero,
  warlockHero,
  mageHero,
  priestHero,
  demonHunterHero,
  deathKnightHero,
];
