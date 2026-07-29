import type { Hero, HeroPower, SFXInstance } from "../types";

/**
 * Announcer voice lines, keyed by filename under `assets/audio/sfx/announcer/`.
 *
 * Same shape as the per-card lines in cards.ts: a leading "/" marks the id as a
 * path relative to the sfx root, so the frontend's `resolveSfxPath` resolves it
 * directly and none of these need an entry in SFX_MANIFEST.
 */
const announcer = (file: string): SFXInstance[] => [
  { soundId: `/announcer/${file}` },
];

/**
 * A hero's own voice lines, under `assets/audio/sfx/classHeroes/<Class>/`.
 * Same leading-slash convention as `announcer` above.
 */
const heroLine = (folder: string, file: string): SFXInstance[] => [
  { soundId: `/classHeroes/${folder}/${file}` },
];

// Hero Power Definitions
const armorUp: HeroPower = {
  name: "Armor Up!",
  description: "Gain 2 Armor.",
  imageUrl: "assets/hero_powers/Armor_Up.jpg",
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
      stats: { attack: 1 },
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

const daggerMastery: HeroPower = {
  name: "Dagger Mastery",
  description: "Equip a 1/2 Dagger.",
  imageUrl: "assets/hero_powers/Dagger_Mastery.jpg",
  manaCost: 2,
  effects: [
    {
      type: "equip",
      cardID: "wicked-knife",
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const totemicCall: HeroPower = {
  name: "Totemic Call",
  description: "Summon a random basic Totem.",
  imageUrl: "assets/hero_powers/Totemic_Call.jpg",
  manaCost: 2,
  effects: [
    {
      type: "summon",
      // Random one of the basic Totems (Healing Totem omitted: its end-of-turn
      // "restore 1 Health to friendly minions" trigger isn't supported yet).
      cardID: ["searing-totem", "stoneclaw-totem", "wrath-of-air-totem"],
      target: "self",
      value: 1,
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
  sfx: {
    announcer: announcer("VO_ANNOUNCER_GARROSH_10.ogg"),
    start: heroLine("Warrior", "VO_HERO_01_Start_09.ogg"),
  },
};

export const shamanHero: Hero = {
  name: "Shaman",
  portrait: "assets/heros/Thrall.jpg",
  class: "Shaman",
  heroName: "Thrall",
  heroPower: totemicCall,
  sfx: {
    announcer: announcer("VO_ANNOUNCER_THRALL_12.ogg"),
    // Note the lowercase "Hero" — only the Shaman folder is named this way.
    start: heroLine("Shaman", "VO_Hero_02_Start_09.ogg"),
  },
};

export const rogueHero: Hero = {
  name: "Rogue",
  portrait: "assets/heros/Valeera.jpg",
  class: "Rogue",
  heroPower: daggerMastery,
  heroName: "Valeera Sanguinar",
  sfx: {
    announcer: announcer("VO_ANNOUNCER_VALEERA_08.ogg"),
    start: heroLine("Rogue", "VO_HERO_03_Start_09.ogg"),
  },
};

export const paladinHero: Hero = {
  name: "Paladin",
  portrait: "assets/heros/Uther.jpg",
  heroPower: reinforce,
  class: "Paladin",
  heroName: "Uther Lightbringer",
  sfx: {
    announcer: announcer("VO_ANNOUNCER_UTHER_11.ogg"),
    start: heroLine("Paladin", "VO_HERO_04_Start_09.ogg"),
  },
};

export const hunterHero: Hero = {
  name: "Hunter",
  heroPower: steadyShot,
  portrait: "assets/heros/Rexxar.jpg",
  class: "Hunter",
  heroName: "Rexxar",
  sfx: {
    announcer: announcer("VO_ANNOUNCER_REXXAR_09.ogg"),
    start: heroLine("Hunter", "VO_HERO_05_Start_09.ogg"),
  },
};

export const druidHero: Hero = {
  heroPower: shapeshift,
  name: "Druid",
  portrait: "assets/heros/Malfurion.jpg",
  class: "Druid",
  heroName: "Malfurion Stormrage",
  sfx: {
    announcer: announcer("VO_ANNOUNCER_MALFURION_15.ogg"),
    start: heroLine("Druid", "VO_HERO_06_Start_09.ogg"),
  },
};

export const warlockHero: Hero = {
  name: "Warlock",
  portrait: "assets/heros/Guldan.jpg",
  class: "Warlock",
  heroName: "Gul'dan",
  heroPower: lifeTap,
  // The apostrophe is literal in the filename; it's a legal URL path character,
  // so it needs no escaping here.
  sfx: {
    announcer: announcer("VO_ANNOUNCER_GUL'DAN_13.ogg"),
    start: heroLine("Warlock", "VO_HERO_07_Start_09.ogg"),
  },
};

export const mageHero: Hero = {
  name: "Mage",
  portrait: "assets/heros/Jaina.jpg",
  class: "Mage",
  heroName: "Jaina Proudmoore",
  heroPower: fireblast,
  sfx: {
    announcer: announcer("VO_ANNOUNCER_JAINA_07.ogg"),
    // The Mage clips use a different numbering run; hers is _64, not _09.
    start: heroLine("Mage", "VO_HERO_08_Start_64.ogg"),
  },
};

export const priestHero: Hero = {
  name: "Priest",
  portrait: "assets/heros/Anduin.jpg",
  class: "Priest",
  heroName: "Anduin Wrynn",
  heroPower: lesserHeal,
  sfx: {
    announcer: announcer("VO_ANNOUNCER_ANDUIN_13.ogg"),
    start: heroLine("Priest", "VO_HERO_09_Start_09.ogg"),
  },
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
  // demonHunterHero,
  // deathKnightHero,
];
