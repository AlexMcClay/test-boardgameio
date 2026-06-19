import type {
  ApplyModifierEffect,
  ArmorEffect,
  BaseBoolEffect,
  Card,
  DamageEffect,
  DynamicValue,
  EffectTypes,
} from "../types";

const damage = (
  value: number | DynamicValue,
  target: DamageEffect["target"] = "user-select",
  battlecry: boolean = false,
): EffectTypes => {
  return {
    type: "damage",
    value: value,
    target: target,
    battlecry: battlecry,
  };
};

const applyModifier = (
  stat: ApplyModifierEffect["stat"],
  value: ApplyModifierEffect["value"],
  target: ApplyModifierEffect["target"] = "user-select",
  override: boolean = false,
  duration?: ApplyModifierEffect["duration"],
): ApplyModifierEffect => {
  return {
    type: "applyModifier",
    stat: stat,
    value: value,
    target: target,
    duration: duration,
    override: override,
  };
};

// 1. The Generic Factory Function
const createBoolEffectUtil = (type: EffectTypes["type"]) => {
  return (
    target: BaseBoolEffect["target"] = "user-select",
    battlecry: boolean = false,
  ): EffectTypes =>
    ({
      type,
      target,
      battlecry,
    }) as EffectTypes; // Typecast ensures TypeScript maps it back to the exact union member
};

// 2. Generate all your utility helpers instantly
const freeze = createBoolEffectUtil("freeze");
const divineShield = createBoolEffectUtil("divineShield");
const taunt = createBoolEffectUtil("taunt");
const stealth = createBoolEffectUtil("stealth");
const charge = createBoolEffectUtil("charge");
const rush = createBoolEffectUtil("rush");

const destroy = (
  target: "user-select" | "self" | "enemy-board" | "board",
  battlecry: boolean = false,
): EffectTypes => {
  return {
    type: "destroy",
    target: target,
    battlecry: battlecry,
  };
};

const mana = (value: number): EffectTypes => {
  return { type: "mana", value: value };
};

const heal = (
  value: number | DynamicValue,
  target:
    | "user-select"
    | "friendly-hero"
    | "friendly-all"
    | "friendly-board" = "user-select",
  battlecry: boolean = false,
): EffectTypes => {
  return {
    type: "heal",
    value: value,
    target: target,
    battlecry: battlecry,
  };
};

const draw = (value: number | DynamicValue): EffectTypes => {
  return {
    type: "draw",
    value: value,
  };
};

const changeKey = (
  key: keyof Card,
  value: DynamicValue,
  target: "user-select" | "self" = "self",
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
  target: "self" | "enemy" = "self",
  count: number = 1,
): EffectTypes => {
  return {
    type: "summon",
    cardID: cardID,
    target: target,
    value: count,
  };
};

const armor = (
  value: number,
  target: "self" | "enemy" = "self",
): ArmorEffect => {
  return {
    type: "armor",
    value: value,
    target: target,
  };
};

// cardTemplates.ts
export const cardTemplates = {
  "flame-imp": {
    title: "Flame Imp",
    description: "Deal 3 damage to your hero.",
    baseMana: 1,
    baseAttack: 3,
    baseHealth: 2,
    type: ["Demon"],
    imageUrl: "assets/cards/Flame_Imp.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(3, "friendly-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Warlock",
  },
  "chillwind-yeti": {
    title: "Chillwind Yeti",
    description: "",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 5,
    type: ["Beast"],
    imageUrl: "assets/cards/Chillwind_Yeti.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  fireball: {
    title: "Fireball",
    description: "Deal 6 damage.",
    baseMana: 4,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Fire"],
    imageUrl: "assets/cards/fireball.jpg",
    effects: [damage(6)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },

    isMinion: false,
    class: "Mage",
  },
  "mirror-image-spell": {
    title: "Mirror Image",
    description: "Summon two 0/2 minions with Taunt.",
    baseMana: 1,
    baseAttack: undefined,
    baseHealth: undefined,
    imageUrl: "assets/cards/Mirror_Image.jpg",
    // We add the summon effect twice to push two distinct instances onto the board side
    effects: [summon("mirror-image-token"), summon("mirror-image-token")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Mage",
  },

  "mirror-image-token": {
    title: "Mirror Image",
    description: "Taunt.",
    taunt: true, // Forces enemies to get through this barrier first
    baseAttack: 0,
    baseHealth: 2,
    baseMana: 0,
    type: ["Minion"],
    imageUrl: "assets/cards/Mirror_Image_Summon.jpg",
    effects: [], // No standard baseAttack value effect because its base baseAttack is 0
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true, // Hidden from deckbuilders like Murloc Scout
    class: "Mage",
  },
  "arcane-intellect": {
    title: "Arcane Intellect",
    description: "Draw 2 cards.",
    baseMana: 3,
    imageUrl: "assets/cards/Arcane_Intellect.jpg",
    type: ["Arcane"],
    effects: [draw(2)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Mage",
  },
  "boulderfist-ogre": {
    title: "Boulderfist Ogre",
    description: "",
    baseMana: 6,
    baseAttack: 6,
    baseHealth: 7,
    imageUrl: "assets/cards/Boulderfist_Ogre_full.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
  },
  wolfrider: {
    title: "Wolfrider",
    description: "Charge.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 1,
    type: ["Beast"],
    imageUrl: "assets/cards/Wolfrider.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    charge: true,
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  frostbolt: {
    title: "Frostbolt",
    description: "Deal 3 damage and Freeze.",
    baseMana: 2,
    type: ["Frost"],
    imageUrl: "assets/cards/Frostbolt.jpg",
    effects: [damage(3), freeze()],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Mage",
  },
  "bloodfen-raptor": {
    title: "Bloodfen Raptor",
    description: "",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    type: ["Beast"],
    imageUrl: "assets/cards/Bloodfen_Raptor.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "river-crocolisk": {
    title: "River Crocolisk",
    description: "",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    type: ["Beast"],
    imageUrl: "assets/cards/River_Crocolisk.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "ironfur-grizzly": {
    title: "Ironfur Grizzly",
    description: "Taunt.",
    taunt: true,
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Beast"],
    imageUrl: "assets/cards/Ironfur_Grizzly.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  charge: {
    title: "Charge",
    description: "Give a minion Charge.",
    baseMana: 1,
    imageUrl: "assets/cards/Charge.jpg",
    effects: [charge()],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [
        {
          type: "boolean",
          key: "charge",
          value: false,
        },
      ],
    },
    class: "Warrior",
  },
  "murloc-raider": {
    title: "Murloc Raider",
    description: "",
    baseAttack: 2,
    baseHealth: 1,
    baseMana: 1,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Raider.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "frostwolf-grunt": {
    title: "Frostwolf Grunt",
    description: "Taunt.",
    taunt: true,
    baseAttack: 2,
    baseHealth: 2,
    baseMana: 2,
    imageUrl: "assets/cards/Frostwolf_Grunt.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "murloc-tidehunter": {
    title: "Murloc Tidehunter",
    description: "Battlecry: Summons a 1/1 Murloc Scout.",
    baseAttack: 2,
    baseHealth: 1,
    baseMana: 2,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Raider.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("murloc-scout")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "murloc-scout": {
    title: "Murloc Scout",
    description: "A small murloc.",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Raider.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
  },
  "razorfen-hunter": {
    title: "Razorfen Hunter",
    description: "Battlecry: Summons a 1/1 Boar.",
    baseAttack: 2,
    baseHealth: 3,
    baseMana: 3,
    imageUrl: "assets/cards/Razorfen_Hunter.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("boar")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  boar: {
    title: "Boar",
    description: "A wild boar.",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    type: ["Beast"],
    imageUrl: "assets/cards/Boar.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
  },
  "dragonling-mechanic": {
    title: "Dragonling Mechanic",
    description: "Battlecry: Summons a 2/1 Mechanical Dragonling.",
    baseAttack: 2,
    baseHealth: 4,
    baseMana: 4,
    imageUrl: "assets/cards/Dragonling_Mechanic.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("mechanical-dragonling")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "mechanical-dragonling": {
    title: "Mechanical Dragonling",
    description: "A mechanical dragonling.",
    baseAttack: 2,
    baseHealth: 1,
    baseMana: 2,
    type: ["Mechanical"],
    imageUrl: "assets/cards/Mechanical_Dragonling.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
  },
  "senjin-shieldmasta": {
    title: "Sen'jin Shieldmasta",
    description: "Taunt.",
    taunt: true,
    baseAttack: 3,
    baseHealth: 5,
    baseMana: 4,
    imageUrl: "assets/cards/Senjin_Shieldmasta.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "lord-of-the-arena": {
    title: "Lord of the Arena",
    description: "Taunt.",
    taunt: true,
    baseAttack: 6,
    baseHealth: 5,
    baseMana: 6,
    imageUrl: "assets/cards/Lord_of_the_Arena.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "stormwind-knight": {
    title: "Stormwind Knight",
    description: "Charge.",
    taunt: false,
    baseAttack: 2,
    baseHealth: 5,
    baseMana: 4,
    charge: true,
    imageUrl: "assets/cards/Stormwind_Knight.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  innervate: {
    title: "Innervate",
    description: "Gain 2 baseMana Crystal this turn only.",
    baseMana: 0,
    type: ["Spell"],
    imageUrl: "assets/cards/Innervate.jpg",
    effects: [mana(2)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Druid",
  },
  "mark-of-the-wild": {
    title: "Mark of the Wild",
    description: "Give a minion +2/+3 and Taunt.",
    baseMana: 2,
    type: ["Spell"],
    imageUrl: "assets/cards/Mark_of_the_Wild.jpg",
    effects: [applyModifier("attack", 2), applyModifier("health", 3), taunt()],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card"],
    },
    isMinion: false,
    class: "Druid",
  },
  "healing-touch": {
    title: "Healing Touch",
    description: "Restore 8 Health.",
    baseMana: 3,
    type: ["Spell"],
    imageUrl: "assets/cards/Healing_Touch.jpg",
    effects: [heal(8)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Druid",
  },
  "darkscale-healer": {
    title: "Darkscale Healer",
    description: "Battlecry: Restore 2 health to all friendly characters.",
    baseAttack: 4,
    baseHealth: 5,
    baseMana: 5,
    type: ["Naga"],
    imageUrl: "assets/cards/Darkscale_Healer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [heal(2, "friendly-all", true)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  nightblade: {
    title: "Nightblade",
    description: "Deal 3 damage to the enemy hero.",
    baseAttack: 4,
    baseHealth: 4,
    baseMana: 5,
    type: ["Human"],
    imageUrl: "assets/cards/Nightblade.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(3, "enemy-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "elven-archer": {
    title: "Elven Archer",
    description: "Battlecry: Deal 1 damage.",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    imageUrl: "assets/cards/Elven_Archer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(1, "user-select", true)], // Battlecry damage that can target any character, bypassing taunt
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    battlecryQuery: {
      side: "enemy",
      type: ["card", "player"],
    }, // Can target any character for battlecry damage
    tags: ["Battlecry"],
    isMinion: true,
    class: "Neutral",
  },
  "ironforge-rifleman": {
    title: "Ironforge Rifleman",
    description: "Battlecry: Deal 1 damage.",
    baseAttack: 2,
    baseHealth: 2,
    baseMana: 3,
    imageUrl: "assets/cards/Ironforge_Rifleman.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(1, "user-select", true)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    battlecryQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    tags: ["Battlecry"],
    class: "Neutral",
  },
  "core-hound": {
    title: "Core Hound",
    baseAttack: 9,
    baseHealth: 7,
    baseMana: 7,
    type: ["Elemental", "Beast"],
    description: "",
    imageUrl: "assets/cards/Core_Hound.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "silverback-patriarch": {
    title: "Silverback Patriarch",
    description: "Taunt.",
    taunt: true,
    baseAttack: 1,
    baseHealth: 4,
    baseMana: 3,
    type: ["Beast"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Silverback_Patriarch.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "magma-rager": {
    title: "Magma Rager",
    description: "",
    baseMana: 3,
    baseAttack: 5,
    baseHealth: 1,
    type: ["Elemental"],
    imageUrl: "assets/cards/Magma_Rager.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "oasis-snapjaw": {
    title: "Oasis Snapjaw",
    description: "",
    baseMana: 4,
    baseAttack: 2,
    baseHealth: 7,
    type: ["Beast"],
    imageUrl: "assets/cards/Oasis_Snapjaw.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "silver-hand-knight": {
    title: "Silver Hand Knight",
    description: "Battlecry: Summon a 2/2 Squire.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 4,
    type: ["Human"],
    imageUrl: "assets/cards/Silver_Hand_Knight.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("squire")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
  },
  squire: {
    title: "Squire",
    description: "Ready for battle.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 2,
    type: ["Human"],
    imageUrl: "assets/cards/Squire.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
  },
  "voodoo-doctor": {
    title: "Voodoo Doctor",
    description: "Battlecry: Restore 2 baseHealth.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    imageUrl: "assets/cards/Voodoo_Doctor.jpg",
    tags: ["Battlecry"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [heal(2)], // Reuses your healing-touch payload architecture on a targeted entity
    battlecryQuery: {
      side: "friendly",
      type: ["card", "player"],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "novice-engineer": {
    title: "Novice Engineer",
    description: "Battlecry: Draw a card.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 1,
    imageUrl: "assets/cards/Novice_Engineer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [draw(1)], // Draw a card when placed
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "stormpike-commando": {
    title: "Stormpike Commando",
    description: "Battlecry: Deal 2 damage.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 2,
    imageUrl: "assets/cards/Stormpike_Commando.jpg",
    tags: ["Battlecry"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(2, "user-select", true)], // Uses elven archer battlecry logic scaled to 2
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    battlecryQuery: {
      side: "enemy",
      type: ["card", "player"],
    }, // Can target any character for battlecry damage
    isMinion: true,
    class: "Neutral",
  },
  "gnomish-inventor": {
    title: "Gnomish Inventor",
    description: "Battlecry: Draw a card.",
    baseMana: 4,
    baseAttack: 2,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Gnomish_Inventor.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [draw(1)], // Draw a card when placed
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "arcane-shot": {
    title: "Arcane Shot",
    description: "Deal 2 damage.",
    baseMana: 1,
    effects: [damage(2)],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isSpell: true,
    isMinion: false,
    imageUrl: "assets/cards/Arcane_Shot.jpg",
    class: "Hunter",
  },
  assassinate: {
    title: "Assassinate",
    description: "Destroy an enemy minion.",
    baseMana: 4,
    effects: [destroy("user-select")], // Targeted destroy effect that can target any minion, bypassing taunt
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card"],
    },
    isSpell: true,
    isMinion: false,
    imageUrl: "assets/cards/Assassinate.jpg",
    class: "Rogue",
  },
  "blessing-of-kings": {
    title: "Blessing of Kings",
    description: "Give a minion +4/+4.",
    baseMana: 4,
    type: ["Holy"],
    imageUrl: "assets/cards/Blessing_of_Kings.jpg",
    effects: [applyModifier("attack", 4), applyModifier("health", 4)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Paladin",
  },
  "goldshire-footman": {
    title: "Goldshire Footman",
    description: "Taunt.",
    taunt: true,
    baseAttack: 1,
    baseHealth: 2,
    baseMana: 1,
    imageUrl: "assets/cards/Goldshire_Footman.jpg",
    tags: ["Taunt"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "booty-bay-bodyguard": {
    title: "Booty Bay Bodyguard",
    description: "Taunt.",
    taunt: true,
    baseAttack: 5,
    baseHealth: 4,
    baseMana: 5,
    imageUrl: "assets/cards/Booty_Bay_Bodyguard.jpg",
    tags: ["Taunt"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "reckless-rocketeer": {
    title: "Reckless Rocketeer",
    description: "Charge.",
    baseMana: 6,
    baseAttack: 5,
    baseHealth: 2,
    imageUrl: "assets/cards/Reckless_Rocketeer.jpg",
    tags: ["Charge"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    charge: true,
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  "inner-rage": {
    title: "Inner Rage",
    imageUrl: "assets/cards/Inner_Rage.jpg",
    description: "Deal 1 damage to a minion and give it +2 attack.",
    baseMana: 0,
    effects: [damage(1), applyModifier("attack", 2)],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isSpell: true,
    isMinion: false,
    rarity: "Common",
    class: "Warrior",
  },
  "bluegill-warrior": {
    title: "Bluegill Warrior",
    description: "Charge.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 1,
    type: ["Murloc"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Bluegill_Warrior.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    charge: true,
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
  },
  flamestrike: {
    title: "Flamestrike",
    imageUrl: "assets/cards/Flamestrike.jpg",
    description: "Deal 5 damage to all enemy minions.",
    baseMana: 7,
    effects: [damage(5, "enemy-board")],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isSpell: true,
    isMinion: false,
    class: "Mage",
    type: ["Fire"],
  },
  arcane_explosion: {
    title: "Arcane Explosion",
    imageUrl: "assets/cards/Arcane_Explosion.jpg",
    description: "Deal 1 damage to all enemy minions.",
    baseMana: 2,
    effects: [damage(1, "enemy-board")],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isSpell: true,
    isMinion: false,
    class: "Mage",
    type: ["Arcane"],
  },
  "leper-gnome": {
    title: "Leper Gnome",
    imageUrl: "assets/cards/Leper_Gnome.jpg",
    description: "Deathrattle: Deal 2 damage to the enemy hero.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    tags: ["Deathrattle"],
    isMinion: true,
    class: "Neutral",
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    rarity: "Common",
    deathrattle: [damage(2, "enemy-hero")],
  },
  "loot-hoarder": {
    title: "Loot Hoarder",
    imageUrl: "assets/cards/Loot_Hoarder.jpg",
    description: "Deathrattle: Draw a card.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 1,
    isMinion: true,
    tags: ["Deathrattle"],
    class: "Neutral",
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    rarity: "Common",
    deathrattle: [draw(1)],
  },
  "argent-squire": {
    title: "Argent Squire",
    imageUrl: "assets/cards/Argent_Squire.jpg",
    description: "Divine Shield.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,

    isMinion: true,
    divineShield: true, // Spawns with the effect active
    class: "Neutral",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    rarity: "Common",

    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
  },
  shielded_minibot: {
    title: "Shielded Minibot",
    description: "Divine Shield",
    imageUrl: "assets/cards/Shielded_Minibot.jpg",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    type: ["Mech"],
    tags: ["Divine Shield"],
    isMinion: true,
    divineShield: true,
    class: "Paladin",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    rarity: "Common",
  },
  "tirion-fordring": {
    title: "Tirion Fordring",
    imageUrl: "assets/cards/Tirion_Fordring.jpg",
    description: "Divine Shield, Taunt, Deathrattle: Equip a 5/3 Ashbringer.",
    baseMana: 8,
    baseAttack: 8,
    baseHealth: 8,
    isMinion: true,
    taunt: true,
    divineShield: true,
    tags: ["Divine Shield", "Taunt", "Deathrattle"],
    class: "Paladin",
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    rarity: "Legendary",
    onPlace: [],
  },
  sunwalker: {
    title: "Sunwalker",
    description: "Taunt. Divine Shield.",
    imageUrl: "assets/cards/Sunwalker.jpg",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 5,
    isMinion: true,
    tags: ["Divine Shield", "Taunt"],
    taunt: true,
    divineShield: true,
    class: "Neutral",
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    rarity: "Rare",
    onPlace: [],
  },
  "argent-protector": {
    title: "Argent Protector",
    description: "Battlecry: give a friendly minion Divine Shield.",
    imageUrl: "assets/cards/Argent_Protector.jpg",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    isMinion: true,
    taunt: false,
    divineShield: false,
    tags: ["Divine Shield", "Battlecry"],
    class: "Paladin",
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    rarity: "Common",
    onPlace: [divineShield("user-select", true)],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
    },
  },
  "hand-of-protection": {
    title: "Hand of Protection",
    description: "Give a minion Divine Shield.",
    baseMana: 1,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Spell"],
    imageUrl: "assets/cards/Hand_of_Protection.jpg",
    effects: [divineShield("user-select")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Paladin",
  },
  // Add these to your cardTemplates object in cards.ts

  "force-of-nature": {
    title: "Force of Nature",
    description: "Summon three 2/2 Treants with Charge.",
    baseMana: 5,

    type: ["Nature"],
    imageUrl: "assets/cards/Force_of_Nature.jpg",
    // Spawns three distinct Treant instances onto the board side
    effects: [
      summon("treant-token"),
      summon("treant-token"),
      summon("treant-token"),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Druid",
    rarity: "Epic",
  },
  "treant-token": {
    title: "Treant",
    description: "Charge.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    charge: true,
    imageUrl: "assets/cards/Treant.jpg",
    tags: ["Charge"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true, // Hidden from deckbuilders, matching your rule constraints
    class: "Druid",
  },
  "ironbark-protector": {
    title: "Ironbark Protector",
    description: "Taunt.",
    taunt: true,
    baseMana: 8,
    baseAttack: 8,
    baseHealth: 8,
    tags: ["Taunt"],
    imageUrl: "assets/cards/Ironbark_Protector.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Druid",
  },
  starfire: {
    title: "Starfire",
    description: "Deal 5 damage. Draw a card.",
    baseMana: 6,
    type: ["Arcane"],
    imageUrl: "assets/cards/Starfire.jpg",
    effects: [damage(5), draw(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    }, // Can target any minion or hero on the board
    isMinion: false,
    class: "Druid",
  },
  "frost-nova": {
    title: "Frost Nova",
    description: "Freeze all enemy minions.",
    baseMana: 3,
    type: ["Frost"],
    imageUrl: "assets/cards/Frost_Nova.jpg",
    effects: [freeze("enemy-board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    class: "Mage",
  },
  blizzard: {
    title: "Blizzard",
    description: "Deal 2 damage to all enemy minions and Freeze them.",
    baseMana: 6,
    type: ["Frost"],
    tags: ["Freeze"],
    imageUrl: "assets/cards/Blizzard.jpg",
    effects: [damage(2, "enemy-board"), freeze("enemy-board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Mage",
    rarity: "Rare",
  },
  whirlwind: {
    title: "Whirlwind",
    description: "Deal 1 damage to ALL minions.",
    baseMana: 1,
    baseAttack: undefined,
    baseHealth: undefined,
    imageUrl: "assets/cards/Whirlwind.jpg",
    // Applies 1 damage to every minion on the entire board (friendly and enemy)
    effects: [damage(1, "board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    class: "Warrior",
  },
  // Add this to your cardTemplates object in cards.ts

  "korkron-elite": {
    title: "Kor'kron Elite",
    description: "Charge.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 3,
    tags: ["Charge"],
    imageUrl: "assets/cards/Korkron_Elite.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    charge: true,
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Warrior",
  },
  // Add this to your cardTemplates object in cards.ts

  "lay-on-hands": {
    title: "Lay on Hands",
    description: "Restore 8 Health. Draw 3 cards.",
    baseMana: 8,
    type: ["Holy"],
    tags: ["Heal"],
    imageUrl: "assets/cards/Lay_on_Hands.jpg",
    effects: [heal(8), draw(3)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Paladin",
    rarity: "Epic",
  },
  "guardian-of-kings": {
    title: "Guardian of Kings",
    description: "Battlecry: Restore 6 baseHealth to your hero.",
    baseMana: 7,
    baseAttack: 5,
    baseHealth: 7,
    taunt: true,
    tags: ["Taunt", "Battlecry"],
    imageUrl: "assets/cards/Guardian_of_Kings.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [heal(6, "friendly-hero", true)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Paladin",
  },
  "warsong-outrider": {
    title: "Warsong Outrider",
    description: "Rush",
    baseMana: 4,
    baseAttack: 5,
    baseHealth: 4,
    rush: true,
    tags: ["Rush"],
    imageUrl: "assets/cards/Warsong_Outrider.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Warrior",
    rarity: "Common",
  },
  "cruel-taskmaster": {
    title: "Cruel Taskmaster",
    description: "Battlecry: Deal 1 damage to a minion and give it +2 attack.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    imageUrl: "assets/cards/Cruel_Taskmaster.jpg",
    tags: ["Battlecry"],
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(1, "user-select", true), applyModifier("attack", 2)],
    battlecryQuery: {
      side: "all",
      type: ["card"],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Warrior",
    rarity: "Common",
  },
  "shield-block": {
    title: "Shield Block",
    description: "Gain 5 Armor. Draw a card.",
    baseMana: 3,
    imageUrl: "assets/cards/Shield_Block.jpg",
    effects: [armor(5), draw(1)],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    class: "Warrior",
  },
  bash: {
    title: "Bash",
    description: "Deal 3 damage. Gain 3 Armor.",
    baseMana: 3,
    imageUrl: "assets/cards/Bash.jpg",
    effects: [damage(3), armor(3)],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    class: "Warrior",
    rarity: "Common",
  },
  "unleash-the-crocolisks": {
    title: "Unleash the Crocolisks",
    description: "Gain 10 Armor. Summon two 2/3 Beasts for your opponent.",
    baseMana: 2,
    imageUrl: "assets/cards/Unleash_the_Crocolisks.jpg",
    effects: [
      armor(10),
      summon("coliseum-crocolisk", "enemy"),
      summon("coliseum-crocolisk", "enemy"),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    class: "Warrior",
    rarity: "Common",
  },

  "coliseum-crocolisk": {
    title: "Coliseum Crocolisk",
    description: "",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    type: ["Beast"],
    imageUrl: "assets/cards/Coliseum_Crocolisk.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true, // Generated by the parent spell
    class: "Warrior",
  },
  execute: {
    title: "Execute",
    description: "Destroy a damaged enemy minion.",
    baseMana: 1,
    imageUrl: "assets/cards/Execute.jpg",
    effects: [destroy("user-select")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "enemy",
      type: ["card"],
      conditions: [
        {
          type: "state-match",
          condition: "isDamaged",
        },
      ],
    },
    isMinion: false,
    class: "Warrior",
  },
  "mortal-strike": {
    title: "Mortal Strike",
    description:
      "Deal 4 damage. If you have 12 or less Health, deal 6 instead.",
    baseMana: 4,
    imageUrl: "assets/cards/Mortal_Strike.jpg",
    effects: [
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: { type: "player-health", player: "friendly" },
            operator: "<=",
            value: 12,
          },
        ],
        then: [{ type: "damage", value: 6, target: "user-select" }],
        else: [{ type: "damage", value: 4, target: "user-select" }],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Warrior",
    rarity: "Rare",
  },
  shadowflame: {
    title: "Shadowflame",
    description:
      "Destroy a friendly minion and deal its Attack damage to all enemy minions.",
    baseMana: 4,
    imageUrl: "assets/cards/Shadowflame.jpg",
    effects: [
      {
        type: "sequence",
        steps: [
          {
            type: "storeVar",
            target: "user-select",
            value: { type: "card-stat", stat: "attack" },
          },
          {
            type: "damage",
            value: { type: "temp" }, // inspects the user-selected friendly minion
            target: "enemy-board",
          },
          { type: "destroy", target: "user-select" },
        ],
      },
    ],
    onPlace: [],
    type: ["Shadow"],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card"],
    },
    isMinion: false,
    class: "Warlock",
    rarity: "Rare",
  },
  rampage: {
    title: "Rampage",
    description: "Give a damaged minion +3/+3.",
    baseMana: 2,
    imageUrl: "assets/cards/Rampage.jpg",
    effects: [
      applyModifier("health", 3, "user-select"),
      applyModifier("attack", 3, "user-select"),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        {
          type: "state-match",
          condition: "isDamaged",
        },
      ],
    },
    isMinion: false,
    class: "Warrior",
    rarity: "Common",
  },
  righteousness: {
    title: "Righteousness",
    description: "Give your minions Divine Shield.",
    baseMana: 5,
    type: ["Holy"],
    tags: ["Divine Shield"],
    imageUrl: "assets/cards/Righteousness.jpg",
    effects: [divineShield("friendly-board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Paladin",
  },
  "arcane-missiles": {
    title: "Arcane Missiles",
    description: "Deal 3 damage randomly split among all enemies.",
    baseMana: 1,
    imageUrl: "assets/cards/Arcane_Missiles.jpg",
    type: ["Arcane"],
    effects: [
      {
        type: "damage",
        value: 3,
        target: "enemy-all", // Routes to enemy hero + enemy board pool
        rand: {
          split: true,
          n: 0, // 0 for targeting all potential candidates in the pool
        },
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    class: "Mage",
  },
  "ice-lance": {
    title: "Ice Lance",
    description:
      "Freeze a character. If they were already Frozen, deal 4 damage instead.",
    baseMana: 1,
    imageUrl: "assets/cards/Ice_Lance.jpg",
    class: "Mage",
    tags: ["Freeze"],
    rarity: "Common",
    isMinion: false,
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    effects: [
      {
        type: "conditional",
        conditions: [
          {
            type: "boolean",
            key: "frozen",
            value: true,
          },
        ],
        // If already frozen: deal 4 damage, then re-apply freeze (maintains frozen flag state)
        then: [
          { type: "damage", value: 4, target: "user-select" },
          { type: "freeze", target: "user-select" },
        ],
        // If NOT frozen: just freeze them!
        else: [{ type: "freeze", target: "user-select" }],
      },
    ],
    onPlace: [],
  },
  "water-elemental": {
    title: "Water Elemental",
    description: "Freeze any character damaged by this minion.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 6,
    type: ["Elemental"],
    tags: ["Freeze"],
    imageUrl: "assets/cards/Water_Elemental.jpg",
    class: "Mage",
    isMinion: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
      freeze(),
    ],
    onPlace: [],
  },
  "deep-freeze": {
    title: "Deep Freeze",
    description: "Freeze a enemy. Summon two 3/6 Water Elementals.",
    baseMana: 7,
    imageUrl: "assets/cards/Deep_Freeze.jpg",
    class: "Mage",
    type: ["Frost"],
    tags: ["Freeze"],
    isMinion: false,
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"], // Strictly targets a minion on the board
    },
    effects: [freeze(), summon("water-elemental", "self", 2)],
    onPlace: [],
    rarity: "Rare",
  },
  icicle: {
    title: "Icicle",
    description: "Deal 2 damage to a minion. If it's Frozen, draw a card.",
    baseMana: 2,
    imageUrl: "assets/cards/Icicle.jpg",
    class: "Mage",
    type: ["Frost"],
    tags: ["Freeze"],
    isMinion: false,
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"], // Strictly restricts targeting to minions on board, bypassing heroes
    },
    effects: [
      // Step 1: Fire the baseline 2 damage at the selected target
      damage(2),
      // Step 2: Check if that target is frozen to trigger the draw effect
      {
        type: "conditional",
        conditions: [
          {
            type: "boolean",
            key: "frozen",
            value: true,
          },
        ],
        then: [draw(1)],
        // No 'else' needed here since nothing happens if it isn't frozen
      },
    ],
    rarity: "Epic",
    onPlace: [],
  },
} satisfies Record<string, Omit<Card, "id" | "originalID" | "damageTaken">>;

// 1. Automatically extracts: "flame-imp" | "chillwind-yeti" | ...
export type CardTemplateKey = keyof typeof cardTemplates;

// 2. An actual type-safe Record mapping your exact keys to cards
export type CardTemplateRecord = typeof cardTemplates;
