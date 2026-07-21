import type {
  ApplyModifierEffect,
  ArmorEffect,
  BaseBoolEffect,
  Card,
  DamageEffect,
  DynamicValue,
  EffectTypes,
  SFXInstance,
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
  opts?: Pick<
    ApplyModifierEffect,
    "conditions" | "min" | "max" | "mult" | "stackable"
  >,
): ApplyModifierEffect => {
  return {
    type: "applyModifier",
    stat: stat,
    value: value,
    target: target,
    duration: duration,
    override: override,
    ...opts,
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
// const stealth = createBoolEffectUtil("stealth");
const charge = createBoolEffectUtil("charge");
// const rush = createBoolEffectUtil("rush");

const destroy = (
  target: "user-select" | "self" | "enemy-board" | "board",
): EffectTypes => {
  return {
    type: "destroy",
    target: target,
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
): EffectTypes => {
  return {
    type: "heal",
    value: value,
    target: target,
  };
};

const draw = (
  value: number | DynamicValue,
  target: "self" | "enemy" = "self",
): EffectTypes => {
  return {
    type: "draw",
    value: value,
    target: target,
  };
};

// const changeKey = (
//   key: keyof Card,
//   value: DynamicValue,
//   target: "user-select" | "self" = "self",
// ): EffectTypes => {
//   return {
//     type: "changeKey",
//     key: key,
//     value: value,
//     target: target,
//   };
// };

const discard = (
  count: number | DynamicValue,
  strategy: "random" | "highest-cost" | "lowest-cost" | "all" = "random",
  target: "self" | "enemy" = "self",
): EffectTypes => {
  return {
    type: "discard",
    value: count,
    strategy: strategy,
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

// Add to hand utility - for generating/discovering cards
/* const addToHand = (
  cardID: string | string[],
  count: number | DynamicValue = 1,
  modifiers?: ApplyModifierEffect[],
): EffectTypes => {
  return {
    type: "addToHand",
    source: "global",
    cardID: cardID,
    value: count,
    modifiers: modifiers,
  };
}; */

// Add from deck - removes cards from deck
/*
const addFromDeck = (
  conditions: import("../types").TargetCondition[],
  count: number | DynamicValue = 1,
  random: boolean = false,
  fallback?: { cardID: string; value: number },
): EffectTypes => {
  return {
    type: "addToHand",
    source: "deck",
    removeFromSource: true,
    conditions: conditions,
    value: count,
    rand: random ? { n: typeof count === "number" ? count : 1 } : undefined,
    fallback: fallback,
  };
};
 */
// Add copy from deck - creates copy, keeps original in deck
/*
const addCopyFromDeck = (
  conditions: import("../types").TargetCondition[],
  count: number | DynamicValue = 1,
  random: boolean = false,
): EffectTypes => {
  return {
    type: "addToHand",
    source: "deck",
    removeFromSource: false,
    conditions: conditions,
    value: count,
    rand: random ? { n: typeof count === "number" ? count : 1 } : undefined,
  };
}; */

export const combo = (combo: EffectTypes[]): EffectTypes => {
  return {
    type: "conditional",
    conditions: [
      {
        type: "numeric",
        key: {
          type: "combo-count",
        },
        operator: ">",
        value: 0,
      },
    ],
    then: combo,
  };
};

const comboOr = (
  combo: EffectTypes[],
  notCombo: EffectTypes[],
): EffectTypes => {
  return {
    type: "conditional",
    conditions: [
      {
        type: "numeric",
        key: {
          type: "combo-count",
        },
        operator: ">",
        value: 0,
      },
    ],
    then: combo,
    else: notCombo,
  };
};

// Add random card from global pool
const addRandomCard = (
  conditions: import("../types").TargetCondition[],
  count: number | DynamicValue = 1,
  modifiers?: ApplyModifierEffect[],
  fallback?:
    | {
        cardID: string;
        value: number;
      }
    | undefined,
): EffectTypes => {
  return {
    type: "addToHand",
    source: "global",
    conditions: conditions,
    value: count,
    rand: { n: typeof count === "number" ? count : 1 },
    modifiers: modifiers,
    fallback: fallback,
  };
};

// Return minion to hand
const returnToHand = (
  target: "user-select" | "friendly-board" | "enemy-board" | "board",
  conditions?: import("../types").TargetCondition[],
  randomCount?: number,
  modifiers?: ApplyModifierEffect[],
): EffectTypes => {
  return {
    type: "returnToHand",
    target: target,
    conditions: conditions,
    rand: randomCount ? { n: randomCount } : undefined,
    modifiers: modifiers,
  };
};

const sfxShortener = (sfx: string) => `/cards/${sfx}`;

const sfx = (
  play: (string | SFXInstance)[],
  attack?: (string | SFXInstance)[],
  death?: (string | SFXInstance)[],
): {
  death?: SFXInstance[] | undefined;
  play?: SFXInstance[];
  attack?: SFXInstance[];
} => {
  return {
    death: death?.map((soundId) =>
      typeof soundId === "string"
        ? { soundId: sfxShortener(soundId) }
        : soundId,
    ),
    play: play?.map((soundId) =>
      typeof soundId === "string"
        ? { soundId: sfxShortener(soundId) }
        : soundId,
    ),
    attack: attack?.map((soundId) =>
      typeof soundId === "string"
        ? { soundId: sfxShortener(soundId) }
        : soundId,
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_319_Play_01.ogg"],
      ["VO_EX1_319_Attack_02.ogg"],
      ["VO_EX1_319_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_182_ChillwindYeti_EnterPlay1.ogg"],
      ["CS2_182_ChillwindYeti_Attack1.ogg"],
      ["CS2_182_ChillwindYeti_Death4.ogg"],
    ),
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
    sfx: {
      play: [
        {
          soundId: "/cards/fireball/FX_FireballEvent03_SpellCast_01.ogg",
        },
        {
          soundId: "/cards/fireball/FX_FireballEvent04_SpellImpact_01.ogg",
          delay: 200,
        },
      ],
    },
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],

    sfx: sfx(["Mage_ArcaneIntellect_Cast_1.ogg"]),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_200_Play_01.ogg"],
      ["VO_CS2_200_Attack_02.ogg"],
      ["VO_CS2_200_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_124_Play_01.ogg", "SFX_CS2_124_Wolf_EnterPlay_00.ogg"],
      ["VO_CS2_124_Attack_02.ogg", "SFX_CS2_124_Wolf_Attack_00.ogg"],
      ["VO_CS2_124_Death_03.ogg", "SFX_CS2_124_Wolf_Death_00.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx([
      "Shared_Frost_Cast_1.ogg",
      {
        soundId: sfxShortener("FrostBoltHit1.ogg"),
        delay: 200,
      },
    ]),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_172_StranglethornRaptor_EnterPlay.ogg"],
      ["CS2_172_StranglethornRaptor_Attack.ogg"],
      ["CS2_172_StranglethornRaptor_Death.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_120_EnterPlay.ogg"],
      ["SFX_CS2_120_Attack.ogg"],
      ["SFX_CS2_120_Death.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_125_Ironfur_Grizzly_EnterPlay1.ogg"],
      ["CS2_125_Ironfur_Grizzly_Attack3.ogg"],
      ["CS2_125_Ironfur_Grizzly_Death1.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_168_Murloc_Raider_EnterPlay1.ogg"],
      ["CS2_168_Murloc_Raider_Attack1.ogg"],
      ["CS2_168_Murloc_Raider_Death2.ogg"],
    ),
  },
  "silver-hand-recruit": {
    title: "Silver Hand Recruit",
    description: "",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    imageUrl: "assets/cards/Silver_Hand_Recruit.jpg",
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
    class: "Paladin",
    isUncollectible: true,
    set: [],
    sfx: sfx(
      ["VO_CS2_101t_Play_01.ogg"],
      ["VO_CS2_101t_Attack_02.ogg"],
      ["VO_CS2_101t_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_121_Play_01.ogg"],
      ["VO_CS2_121_Attack_02.ogg"],
      ["VO_CS2_121_Death_03.ogg"],
    ),
  },
  "murloc-tidehunter": {
    title: "Murloc Tidehunter",
    description: "Battlecry: Summons a 1/1 Murloc Scout.",
    baseAttack: 2,
    baseHealth: 1,
    baseMana: 2,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Tidehunter.jpg",
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
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_506_Murloc_Scout_EnterPlay1.ogg"],
      ["EX1_506_Murloc_Scout_Attack2.ogg"],
      ["EX1_506_Murloc_Scout_Death2.ogg"],
    ),
  },
  "murloc-scout": {
    title: "Murloc Scout",
    description: "",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Scout.jpg",
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
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_506a_Murloc_Tidehunter_EnterPlay1.ogg"],
      ["EX1_506a_Murloc_Tidehunter_Attack1.ogg"],
      ["EX1_506a_Murloc_Tidehunter_Death1.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_196_Play_01.ogg"],
      ["VO_CS2_196_Attack_02.ogg"],
      ["VO_CS2_196_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_boar_EnterPlay.ogg"],
      ["SFX_CS2_boar_Attack.ogg"],
      ["SFX_CS2_boar_Death.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_025_Play_01.ogg"],
      ["VO_EX1_025_Attack_02.ogg"],
      ["VO_EX1_025_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_025t_EnterPlay.ogg"],
      ["SFX_EX1_025t_Attack.ogg"],
      ["SFX_EX1_025t_Death.ogg"],
    ),
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
    sfx: sfx(
      ["VO_CS2_179_Play_01.ogg"],
      ["VO_CS2_179_Attack_02.ogg"],
      ["VO_CS2_179_Death_03.ogg"],
    ),
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_162_Play_01.ogg"],
      ["VO_CS2_162_Attack_02.ogg"],
      ["VO_CS2_162_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_131_Play_01.ogg"],
      ["VO_CS2_131_Attack_02.ogg"],
      ["VO_CS2_131_Death_03.ogg"],
    ),
  },
  innervate: {
    title: "Innervate",
    description: "Gain 1 Mana Crystal this turn only.",
    baseMana: 0,
    type: ["Nature"],
    imageUrl: "assets/cards/Innervate.jpg",
    effects: [mana(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Druid",
    set: ["Legacy"],
  },
  "mark-of-the-wild": {
    title: "Mark of the Wild",
    description: "Give a minion +2/+3 and Taunt.",
    baseMana: 2,
    type: ["Nature"],
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
    set: ["Legacy"],
  },
  "healing-touch": {
    title: "Healing Touch",
    description: "Restore 8 Health.",
    baseMana: 3,
    type: [],
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
    set: ["Legacy"],
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
    onPlace: [heal(2, "friendly-all")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_DS1_055_Play_01.ogg"],
      ["VO_DS1_055_Attack_02.ogg"],
      ["VO_DS1_055_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_593_Play_01.ogg"],
      ["VO_EX1_593_Attack_02.ogg"],
      ["VO_EX1_593_Death_03.ogg"],
    ),
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    }, // Can target any character for battlecry damage
    tags: ["Battlecry"],
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_189_Play_01.ogg"],
      ["VO_CS2_189_Attack_02.ogg"],
      ["VO_CS2_189_Death_03.ogg"],
    ),
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    isMinion: true,
    tags: ["Battlecry"],
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_141_Play_01.ogg"],
      ["VO_CS2_141_Attack_02.ogg"],
      ["VO_CS2_141_Death_03.ogg"],
    ),
  },
  "core-hound": {
    title: "Core Hound",
    baseAttack: 9,
    baseHealth: 5,
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_201_Core_Hound_EnterPlay1.ogg"],
      ["CS2_201_Core_Hound_Attack2.ogg"],
      ["CS2_201_Core_Hound_Death1.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_127_Silverback_Patriarch_EnterPlay1.ogg"],
      ["CS2_127_Silverback_Patriarch_Attack3.ogg"],
      ["CS2_127_Silverback_Patriarch_Death1.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_118_EnterPlay.ogg"],
      ["SFX_CS2_118_Attack.ogg"],
      ["SFX_CS2_118_Death.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_119_Oasis_Snapjaw_EnterPlay2.ogg"],
      ["CS2_119_Oasis_Snapjaw_Attack1.ogg"],
      ["CS2_119_Oasis_Snapjaw_Death2.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_151_Play_01.ogg"],
      ["VO_CS2_151_Attack_02.ogg"],
      ["VO_CS2_151_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_152_Play_01.ogg"],
      ["VO_CS2_152_Attack_02.ogg"],
      ["VO_CS2_152_Death_03.ogg"],
    ),
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_011_Play_01.ogg"],
      ["VO_EX1_011_Attack_02.ogg"],
      ["VO_EX1_011_Death_03.ogg"],
    ),
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
    sfx: sfx(
      ["VO_EX1_015_Play_01.ogg"],
      ["VO_EX1_015_Attack_02.ogg"],
      ["VO_EX1_015_Death_03.ogg"],
    ),
    set: ["Legacy"],
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    }, // Can target any character for battlecry damage
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_150_Play_01.ogg"],
      ["VO_CS2_150_Attack_02.ogg"],
      ["VO_CS2_150_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_147_Play_01.ogg"],
      ["VO_CS2_147_Attack_02.ogg"],
      ["VO_CS2_147_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    sfx: sfx(
      ["VO_CS1_042_Play_01.ogg"],
      ["VO_CS1_042_Attack_02.ogg"],
      ["VO_CS1_042_Death_03.ogg"],
    ),
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_187_Play_01.ogg"],
      ["VO_CS2_187_Attack_02.ogg"],
      ["VO_CS2_187_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_213_Play_01.ogg"],
      ["VO_CS2_213_Attack_02.ogg"],
      ["VO_CS2_213_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_173_Bluegill_Warrior_EnterPlay1.ogg"],
      ["CS2_173_Bluegill_Warrior_Attack3.ogg"],
      ["CS2_173_Bluegill_Warrior_Death1.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_029_Play_01.ogg"],
      ["VO_EX1_029_Attack_02.ogg"],
      ["VO_EX1_029_Death_03.ogg"],
    ),
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
    sfx: sfx(
      ["VO_EX1_096_Play_01.ogg"],
      ["VO_EX1_096_Attack_02.ogg"],
      ["VO_EX1_096_Death_03.ogg"],
    ),
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_008_Play_01.ogg"],
      ["VO_EX1_008_Attack_02.ogg"],
      ["VO_EX1_008_Death_03.ogg"],
    ),
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
    set: ["Goblins vs Gnomes"],
    sfx: sfx(
      ["CleanMechSmall_Play_Underlay.ogg", "VO_GVG_058_Play_01.ogg"],
      ["VO_GVG_058_Attack_02.ogg", "CleanMechSmall_Attack_Underlay.ogg"],
      ["VO_GVG_058_Death_03.ogg", "CleanMechSmall_Death_Underlay.ogg"],
    ),
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
    deathrattle: [
      {
        type: "equip",
        cardID: "ashbringer",
        target: "self",
      },
    ],
    rarity: "Legendary",
    onPlace: [],
    sfx: {
      attack: [
        {
          soundId: "/cards/Tirion/VO_EX1_383_Attack_02.ogg",
        },
      ],
      death: [
        {
          soundId: "/cards/Tirion/VO_EX1_383_Death_03.ogg",
        },
      ],
      play: [
        {
          soundId: "/cards/Tirion/VO_EX1_383_Play_01.ogg",
        },
        {
          soundId: "/cards/Pegasus_Stinger_Alliance.ogg",
        },
      ],
    },
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_032_Play_01.ogg"],
      ["VO_EX1_032_Attack_02.ogg"],
      ["VO_EX1_032_Death_03.ogg"],
    ),
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_362_Play_01.ogg"],
      ["VO_EX1_362_Attack_02.ogg"],
      ["VO_EX1_362_Death_03.ogg"],
    ),
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
      conditions: [
        {
          type: "boolean",
          key: "divineShield",
          value: false,
        },
      ],
    },
    isMinion: false,
    class: "Paladin",
    set: ["Legacy"],
  },
  "force-of-nature": {
    title: "Force of Nature",
    description: "Summon three 2/2 Treants with Charge.",
    baseMana: 5,
    type: ["Nature"],
    imageUrl: "assets/cards/Force_of_Nature.jpg",
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_158tTreant_EnterPlay1.ogg"],
      ["EX1_158tTreant_Attack2.ogg"],
      ["EX1_158tTreant_Death2.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_232_Ironbark_Protector_EnterPlay2.ogg"],
      ["CS2_232_Ironbark_Protector_Attack4.ogg"],
      ["CS2_232_Ironbark_Protector_Death5.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(["Shared_Arcane_Start_1.ogg"]),
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
    set: ["Legacy"],
    sfx: sfx(["Mage_FrostNova_Cast_1.ogg"]),
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
    set: ["Legacy"],
  },
  whirlwind: {
    title: "Whirlwind",
    description: "Deal 1 damage to ALL minions.",
    baseMana: 1,
    baseAttack: undefined,
    baseHealth: undefined,
    imageUrl: "assets/cards/Whirlwind.jpg",
    effects: [damage(1, "board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    },
    isMinion: false,
    class: "Warrior",
    set: ["Legacy"],
  },
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_011_Play_01.ogg"],
      ["VO_NEW1_011_Attack_02.ogg"],
      ["VO_NEW1_011_Death_03.ogg"],
    ),
  },
  "lay-on-hands": {
    title: "Lay on Hands",
    description: "Restore 8 Health. Draw 3 cards.",
    baseMana: 6,
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
    set: ["Legacy"],
  },
  "guardian-of-kings": {
    title: "Guardian of Kings",
    description: "Taunt. Battlecry: Restore 6 Health to your hero.",
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
    onPlace: [heal(6, "friendly-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_088_Play_01.ogg"],
      ["VO_CS2_088_Attack_02.ogg"],
      ["VO_CS2_088_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS3_030_Female_Orc_Play_01.ogg"],
      ["VO_CS3_030_Female_Orc_Attack_01.ogg"],
      ["VO_CS3_030_Female_Orc_Death_01.ogg"],
    ),
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
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Warrior",
    rarity: "Common",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_603_Play_01.ogg"],
      ["VO_EX1_603_Attack_02.ogg"],
      ["VO_EX1_603_Death_03.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["The Grand Tournament"],
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
    set: ["Across the Timeways"],
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
    set: ["Across the Timeways"],
    sfx: sfx(
      ["TIME_873t_ColosseumCrocolisk_Play.ogg"],
      ["TIME_873t_ColosseumCrocolisk_Attack.ogg"],
      ["TIME_873t_ColosseumCrocolisk_Death.ogg"],
    ),
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx([
      "Shared_Arcane_Start_1.ogg",
      {
        soundId: sfxShortener("Mage_ArcaneMissiles_Impact_1.ogg"),
        delay: 200,
      },
    ]),
  },
  "ice-lance": {
    title: "Ice Lance",
    description:
      "Freeze a character. If they were already Frozen, deal 4 damage instead.",
    baseMana: 1,
    imageUrl: "assets/cards/Ice_Lance.jpg",
    class: "Mage",
    type: ["Frost"],
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
    set: ["Legacy"],
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_033_Play_WaterElemental.ogg"],
      ["CS2_033_Attack_WaterElemental.ogg"],
      ["CS2_033_Death_WaterElemental.ogg"],
    ),
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
      side: "enemy",
      type: ["card", "player"],
    },
    effects: [freeze(), summon("water-elemental", "self", 2)],
    onPlace: [],
    rarity: "Rare",
    set: ["Ashes of Outland"],
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
      type: ["card"],
    },
    effects: [
      damage(2),
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
      },
    ],
    rarity: "Epic",
    onPlace: [],
    set: ["Legacy"],
  },
  "mortal-coil": {
    title: "Mortal Coil",
    description: "Deal 1 damage to a minion. If it dies, draw a card.",
    baseMana: 1,
    type: ["Shadow"],
    imageUrl: "assets/cards/Mortal_Coil.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    effects: [
      damage(1),
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: {
              type: "card-stat",
              stat: "health",
            },
            value: 1,
            operator: "<",
          },
        ],
        then: [draw(1)],
      },
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  voidwalker: {
    title: "Voidwalker",
    description: "Taunt.",
    taunt: true,
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 3,
    type: ["Demon"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Voidwalker.jpg",
    class: "Warlock",
    isMinion: true,
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
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_065_Play_01.ogg"],
      ["VO_CS2_065_Attack_02.ogg"],
      ["VO_CS2_065_Death_03.ogg"],
    ),
  },
  demonfire: {
    title: "Demonfire",
    description:
      "Deal 2 damage to a minion. If it's a friendly Demon, give it +2/+2 instead.",
    baseMana: 2,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Fel"],
    imageUrl: "assets/cards/Demonfire.jpg",
    class: "Warlock",
    rarity: "Common",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"], // Strictly restricts targeting to minions on the board, bypassing heroes
    },
    effects: [
      {
        type: "conditional",
        conditions: [
          {
            type: "tags-include",
            value: "Demon",
          },
          {
            type: "boolean",
            key: "isMinion", // Ensures it's a valid minion card entity
            value: true,
          },
          {
            type: "is-friendly",
          },
        ],

        then: [
          applyModifier("attack", 2, "user-select"),
          applyModifier("health", 2, "user-select"),
        ],
        // Otherwise, deal the baseline 2 damage to it
        else: [damage(2, "user-select")],
      },
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  "drain-life": {
    title: "Drain Life",
    description: "Deal 2 damage. Restore 2 Health to your hero.",
    baseMana: 3,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Shadow"],
    imageUrl: "assets/cards/Drain_Life.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card", "player"], // Can target any minion or hero on the board
    },
    effects: [
      // Step 1: Deal 2 damage to the selected target
      damage(2),
      // Step 2: Restore 2 health specifically targeting the user's hero
      heal(2, "friendly-hero"),
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  hellfire: {
    title: "Hellfire",
    description: "Deal 3 damage to ALL characters.",
    baseMana: 3,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Fire"],
    imageUrl: "assets/cards/Hellfire.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"], // Board-wide spell targeting matching your AoE framework layout
    },
    effects: [
      // 1. Deal 3 damage to all minions on the entire board (friendly and enemy)
      damage(3, "board"),
      // 2. Deal 3 damage to the friendly hero
      damage(3, "friendly-hero"),
      // 3. Deal 3 damage to the enemy hero
      damage(3, "enemy-hero"),
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  "siphon-soul": {
    title: "Siphon Soul",
    description: "Destroy a minion. Restore 3 Health to your hero.",
    baseMana: 4,
    type: ["Shadow"],
    imageUrl: "assets/cards/Siphon_Soul.jpg",
    class: "Warlock",
    rarity: "Rare",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"], // Restricts targeting strictly to minions on the board, bypassing heroes
    },
    effects: [
      // Step 1: Instantly destroy the selected minion target
      destroy("user-select"),
      // Step 2: Restore 3 health to the casting player's hero
      heal(3, "friendly-hero"),
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  "shadow-bolt": {
    title: "Shadow Bolt",
    description: "Deal 4 damage to a minion.",
    baseMana: 3,
    type: ["Shadow"],
    imageUrl: "assets/cards/Shadow_Bolt.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"], // Restricts targeting strictly to minions on the board, bypassing heroes
    },
    effects: [
      // Deal 4 damage to the selected minion target
      damage(4, "user-select"),
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  "pit-lord": {
    title: "Pit Lord",
    description: "Battlecry: Deal 5 damage to your hero.",
    baseMana: 4,
    baseAttack: 5,
    baseHealth: 6,
    type: ["Demon"],
    imageUrl: "assets/cards/Pit_Lord.jpg",
    class: "Warlock",
    rarity: "Epic",
    isMinion: true,
    effects: [
      // Standard minion combat architecture mapping to your base stats logic
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // Battlecry logic triggers when the minion hits the board
    onPlace: [damage(5, "friendly-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_313_Play_01.ogg"],
      ["VO_EX1_313_Attack_02.ogg"],
      ["VO_EX1_313_Death_03.ogg"],
    ),
  },
  "dread-infernal": {
    title: "Dread Infernal",
    description: "Battlecry: Deal 1 damage to ALL other characters.",
    baseMana: 6,
    baseAttack: 6,
    baseHealth: 6,
    type: ["Demon"],
    imageUrl: "assets/cards/Dread_Infernal.jpg",
    class: "Warlock",
    isMinion: true,
    effects: [
      // Handles standard minion attacking behaviors
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // Triggers upon hitting the board
    onPlace: [
      {
        type: "damage",
        value: 1,
        target: "board",
        conditions: [
          {
            type: "exclude-self",
          },
        ],
      },
      // 2. Deal 1 damage to both hero players
      damage(1, "friendly-hero"),
      damage(1, "enemy-hero"),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_064_EnterPlay.ogg"],
      ["SFX_CS2_064_Attack.ogg"],
      ["SFX_CS2_064_Death.ogg"],
    ),
  },
  "twisting-nether": {
    title: "Twisting Nether",
    description: "Destroy all minions and locations.",
    baseMana: 8,

    type: ["Shadow"],
    imageUrl: "assets/cards/Twisting_Nether.jpg",
    class: "Warlock",
    rarity: "Epic",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"], // Indicates a board-wide, non-targeted spell alignment
    },
    effects: [
      // Clears everything sitting on the battlefield space
      destroy("board"),
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  "drain-soul": {
    title: "Drain Soul",
    description: "Lifesteal. Deal 3 damage to a minion.",
    baseMana: 2,
    baseAttack: undefined,
    baseHealth: undefined,
    type: ["Shadow"],
    imageUrl: "assets/cards/Drain_Soul.jpg",
    class: "Warlock",
    rarity: "Common",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"], // Restricts targeting strictly to minions on the board, bypassing heroes
    },
    effects: [
      // Deal 3 damage with the lifesteal flag to trigger your engine's healing wrapper
      damage(3, "user-select"),
      heal(3, "friendly-hero"),
    ],
    onPlace: [],
    set: ["Knights of the Frozen Throne"],
  },
  "vulgar-homunculus": {
    title: "Vulgar Homunculus",
    description: "Taunt. Battlecry: Deal 2 damage to your hero.",
    taunt: true,
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 4,
    type: ["Demon"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Vulgar_Homunculus.jpg",
    class: "Warlock",
    rarity: "Common",
    isMinion: true,
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(2, "friendly-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Kobolds & Catacombs"],
    sfx: sfx(
      ["VO_LOOT_013_Male_Demon_Play_02.ogg"],
      ["VO_LOOT_013_Male_Demon_Attack_02.ogg"],
      ["VO_LOOT_013_Male_Demon_Death_01.ogg"],
    ),
  },
  "demonic-assault": {
    title: "Demonic Assault",
    description: "Deal 3 damage. Summon two 1/3 Voidwalkers with Taunt.",
    baseMana: 4,

    type: ["Fel"],
    imageUrl: "assets/cards/Demonic_Assault.jpg",
    class: "Warlock",
    rarity: "Common",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    effects: [damage(3, "user-select"), summon("voidwalker", "self", 2)],
    onPlace: [],
    set: ["United in Stormwind"],
  },
  "sense-demons": {
    title: "Sense Demons",
    description: "Draw 2 Demons from your deck.",
    baseMana: 3,

    type: ["Shadow"],
    imageUrl: "assets/cards/Sense_Demons.jpg",
    class: "Warlock",
    rarity: "Common",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card", "lane"],
    },
    effects: [
      {
        type: "addToHand",
        source: "deck",
        removeFromSource: true, // ← KEY DIFFERENCE
        conditions: [{ type: "tags-include", value: "Demon" }],
        value: 2,
        rand: { n: 2 },
        fallback: { cardID: "worthless_imp" },
      },
    ],
    onPlace: [],
    set: ["Legacy"],
  },
  worthless_imp: {
    title: "Worthless Imp",
    description: "You are out of demons! At least there are always imps...",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Demon"],
    imageUrl: "assets/cards/Worthless_Imp.jpg",
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
    class: "Warlock",
    set: ["Legacy"],
    sfx: sfx(
      ["WoW_EX1_317t_Worthless_Imp_EnterPlay.ogg"],
      ["WoW_EX1_317t_Worthless_Imp_Attack.ogg"],
      ["WoW_EX1_317t_Worthless_Imp_Death.ogg"],
    ),
  },
  riftcleaver: {
    title: "Riftcleaver",
    description:
      "Battlecry: Destroy a minion. Your hero takes damage equal to its Health.",
    baseMana: 6,
    baseAttack: 7,
    baseHealth: 5,
    type: ["Demon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Riftcleaver.jpg",
    class: "Warlock",
    rarity: "Epic",
    isMinion: true,
    effects: [
      // Standard minion combat architecture mapping to your base stats logic
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // Battlecry execution that requires a target selection upon playing
    onPlace: [
      {
        type: "storeVar",
        target: "user-select",
        value: { type: "card-stat", stat: "health" },
      },
      {
        type: "damage",
        value: { type: "temp" },
        target: "friendly-hero",
      },
      destroy("user-select"),
    ],
    battlecryQuery: {
      side: "all",
      type: ["card"], // The Battlecry requires selecting a minion on the board
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Saviors of Uldum"],
    sfx: sfx(
      ["VO_ULD_165_Male_Demon_Play_01.ogg"],
      ["VO_ULD_165_Male_Demon_Attack_01.ogg"],
      ["VO_ULD_165_Male_Demon_Death_01.ogg"],
    ),
  },
  voidlord: {
    title: "Voidlord",
    description: "Taunt. Deathrattle: Summon three 1/3 Demons with Taunt.",
    taunt: true,
    baseMana: 9,
    baseAttack: 3,
    baseHealth: 9,
    type: ["Demon"],
    tags: ["Taunt", "Deathrattle"],
    imageUrl: "assets/cards/Voidlord.jpg",
    class: "Warlock",
    rarity: "Epic",
    isMinion: true,
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [summon("voidwalker", "self", 3)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Kobolds & Catacombs"],
    sfx: sfx(
      ["VO_LOOT_368_Male_Demon_Play_01.ogg"],
      ["VO_LOOT_368_Male_Demon_Attack_01.ogg"],
      ["VO_LOOT_368_Male_Demon_Death_01.ogg"],
    ),
  },
  backstab: {
    title: "Backstab",
    description: "Deal 2 damage to an undamaged minion.",
    baseMana: 0,
    imageUrl: "assets/cards/Backstab.jpg",
    class: "Rogue",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        {
          type: "state-match",
          condition: "isUndamaged",
        },
      ],
    },
    effects: [damage(2, "user-select")],
    onPlace: [],
    set: ["Legacy"],
  },
  eviscerate: {
    title: "Eviscerate",
    description: "Deal 2 damage. Combo: Deal 4 damage instead.",
    baseMana: 2,
    imageUrl: "assets/cards/Eviscerate.jpg",
    class: "Rogue",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    effects: [comboOr([damage(4, "user-select")], [damage(2, "user-select")])],
    onPlace: [],
    set: ["Legacy"],
  },
  "sinister-strike": {
    title: "Sinister Strike",
    description: "Deal 3 damage to the enemy hero.",
    baseMana: 1,
    imageUrl: "assets/cards/Sinister_Strike.jpg",
    class: "Rogue",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    effects: [damage(3, "enemy-hero")],
    onPlace: [],
    set: ["Legacy"],
  },
  "fan-of-knives": {
    title: "Fan of Knives",
    description: "Deal 1 damage to all enemy minions. Draw a card.",
    baseMana: 2,
    imageUrl: "assets/cards/Fan_of_Knives.jpg",
    effects: [damage(1, "enemy-board"), draw(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane", "card"],
    }, // Can target any minion or hero on the board
    isMinion: false,
    class: "Rogue",
    set: ["Legacy"],
  },
  shadowstep: {
    title: "Shadowstep",
    description: "Return a friendly minion to your hand. It costs (2) less.",
    baseMana: 0,
    rarity: "Common",
    imageUrl: "assets/cards/Shadowstep.jpg",
    effects: [
      {
        type: "returnToHand",
        target: "user-select",
        modifiers: [applyModifier("mana", -2, "self")],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card"],
    }, // Can target any minion or hero on the board
    isMinion: false,
    class: "Rogue",
    set: ["Legacy"],
  },
  sap: {
    title: "Sap",
    description: "Return an enemy minion to your opponent's hand.",
    baseMana: 2,
    imageUrl: "assets/cards/Sap.jpg",
    class: "Rogue",
    isSpell: true,
    isMinion: false,
    effects: [returnToHand("user-select")],
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card"], // Strictly restricts targeting to enemy minions on the board
    },
    set: ["Legacy"],
  },
  shiv: {
    title: "Shiv",
    description: "Deal 1 damage. Draw a card.",
    baseMana: 2,
    imageUrl: "assets/cards/Shiv.jpg",
    class: "Rogue",
    isSpell: true,
    isMinion: false,
    effects: [damage(1), draw(1)],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["card", "player"], // Allows targeting any minion or hero on the board
    },
    set: ["Legacy"],
  },
  "call-of-the-void": {
    title: "Call of the Void",
    description: "Add a random Demon to your hand.",
    baseMana: 1,
    type: ["Shadow"],
    imageUrl: "assets/cards/Call_of_the_Void.jpg",
    class: "Warlock",
    rarity: "Common",
    isSpell: true,
    isMinion: false,
    effects: [addRandomCard([{ type: "tags-include", value: "Demon" }], 1, [])],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"], // Board-wide non-targeted spell alignment
    },
    set: ["Legacy"],
  },
  soulfire: {
    title: "Soulfire",
    description: "Deal 4 damage. Discard a random card.",
    baseMana: 1,
    type: ["Fire"],
    imageUrl: "assets/cards/Soulfire.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    effects: [damage(4, "user-select"), discard(1, "random")],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["card", "player"], // Allows targeting any minion or hero on the board
    },
    set: ["Legacy"],
  },
  "sacrificial-pact": {
    title: "Sacrificial Pact",
    description: "Destroy a friendly Demon. Restore 5 Health to your hero.",
    baseMana: 0,
    type: ["Shadow"],
    imageUrl: "assets/cards/Sacrificial_Pact.jpg",
    class: "Warlock",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [
        {
          type: "tags-include",
          value: "Demon",
        },
      ],
    },
    effects: [destroy("user-select"), heal(5, "friendly-hero")],
    onPlace: [],
    set: ["Legacy"],
  },
  felstalker: {
    title: "Felstalker",
    description: "Battlecry: Discard a random card.",
    baseMana: 2,
    baseAttack: 4,
    baseHealth: 3,
    type: ["Demon"],
    imageUrl: "assets/cards/Felstalker.jpg",
    class: "Warlock",
    isMinion: true,
    isSpell: false,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    onPlace: [discard(1, "random")],
    set: ["Legacy"],
    sfx: sfx(
      ["Felstalker_EX1_306_Play.ogg"],
      ["Felstalker_EX1_306_Attack.ogg"],
      ["Felstalker_EX1_306_Death.ogg"],
    ),
  },
  doomguard: {
    title: "Doomguard",
    description: "Charge. Battlecry: Discard two random cards.",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 7,
    type: ["Demon"],
    imageUrl: "assets/cards/Doomguard.jpg",
    class: "Warlock",
    rarity: "Rare",
    isMinion: true,
    isSpell: false,
    charge: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    onPlace: [discard(2, "random")],
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_310_Play_01.ogg"],
      ["VO_EX1_310_Attack_02.ogg"],
      ["VO_EX1_310_Death_03.ogg"],
    ),
  },
  "abusive-sargent": {
    title: "Abusive Sergeant",
    description: "Battlecry: Give a minion +2 Attack this turn.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    imageUrl: "assets/cards/Abusive_Sergeant.jpg",
    class: "Neutral",
    rarity: "Common",
    isMinion: true,
    isSpell: false,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    onPlace: [
      applyModifier("attack", 2, "user-select", false, {
        expiryOwner: "BUFF_CASTER",
        expiryTrigger: "END_OF_TURN",
        turnsRemaining: 1,
      }),
    ],
    battlecryQuery: {
      side: "all",
      type: ["card"],
    },
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_188_Play_01.ogg"],
      ["VO_CS2_188_Attack_02.ogg"],
      ["VO_CS2_188_Death_03.ogg"],
    ),
  },
  "fiery-war-axe": {
    title: "Fiery War Axe",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 2,
    baseAttack: 3,
    baseDurability: 2,
    imageUrl: "assets/cards/Fiery_War_Axe.jpg",
    class: "Warrior",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "wicked-knife": {
    title: "Wicked Knife",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 1,
    baseAttack: 1,
    baseDurability: 2,
    imageUrl: "assets/cards/Wicked_Knife.jpg",
    class: "Rogue",
    effects: [],
    onPlace: [],
    isUncollectible: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  ashbringer: {
    title: "Ashbringer",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 5,
    baseAttack: 5,
    baseDurability: 3,
    imageUrl: "assets/cards/Ashbringer.jpg",
    class: "Paladin",
    effects: [],
    onPlace: [],
    isUncollectible: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "the-coin": {
    title: "The Coin",
    description: "Gain 1 Mana Crystal this turn only.",
    baseMana: 0,
    imageUrl: "assets/cards/The_Coin.jpg",
    class: "Neutral",
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    effects: [mana(1)],
    onPlace: [],
    isUncollectible: true,
    set: ["Legacy"],
  },
  "edwin-vancleef": {
    title: "Edwin VanCleef",
    description:
      "Combo: Gain +2/+2 for each other card you've played this turn.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 2,
    imageUrl: "assets/cards/Edwin_VanCleef.jpg",
    class: "Rogue",
    rarity: "Legendary",
    isMinion: true,
    isSpell: false,
    charge: false,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    onPlace: [
      {
        type: "applyModifier",
        target: "self",
        value: 2,
        mult: {
          type: "combo-count",
        },
        override: false,
        stat: "attack",
      },
      {
        type: "applyModifier",
        target: "self",
        value: 2,
        mult: {
          type: "combo-count",
        },
        override: false,
        stat: "health",
      },
    ],
    set: ["Legacy"],

    sfx: sfx(
      ["Pegasus_Stinger_Lesser_Villain.ogg", "VO_EX1_613_Play_01.ogg"],
      ["VO_EX1_613_Attack_02.ogg"],
      ["VO_EX1_613_Death_03.ogg"],
    ),
  },
  "stormwind-champion": {
    title: "Stormwind Champion",
    description: "Your other minions have +1/+1.",
    baseMana: 7,
    baseAttack: 7,
    baseHealth: 7,
    imageUrl: "assets/cards/Stormwind_Champion.jpg",
    class: "Neutral",
    isMinion: true,
    tags: ["Aura"],
    rarity: "Common",
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier("attack", 1, "friendly-board", false, undefined, {
        conditions: [{ type: "exclude-self" }],
      }),
      applyModifier("health", 1, "friendly-board", false, undefined, {
        conditions: [{ type: "exclude-self" }],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["VO_CS2_222_Play_01.ogg"],
      ["VO_CS2_222_Attack_02.ogg"],
      ["VO_CS2_222_Death_03.ogg"],
    ),
  },
  "murloc-warleader": {
    title: "Murloc Warleader",
    description: "Your other Murlocs have +2/+1.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Warleader.jpg",
    class: "Neutral",
    rarity: "Epic",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier("attack", 2, "friendly-board", false, undefined, {
        conditions: [
          { type: "tags-include", value: "Murloc" },
          { type: "exclude-self" },
        ],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["EX1_507_Murloc_Warleader_EnterPlay1.ogg"],
      ["EX1_507_Murloc_Warleader_Attack1.ogg"],
      ["EX1_507_Murloc_Warleader_Death1.ogg"],
    ),
  },
  "dire-wolf-alpha": {
    title: "Dire Wolf Alpha",
    description: "Adjacent minions have +1 Attack.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    type: ["Beast"],
    imageUrl: "assets/cards/Dire_Wolf_Alpha.jpg",
    class: "Neutral",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    aura: [applyModifier("attack", 1, "adjacent")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    sfx: sfx(
      ["SFX_EX1_162_EnterPlay.ogg"],
      ["SFX_EX1_162_Attack.ogg"],
      ["SFX_EX1_162_Death.ogg"],
    ),
    set: ["Legacy"],
  },
  "sorcerers-apprentice": {
    title: "Sorcerer's Apprentice",
    description: "Your spells cost (1) less (but not less than 1).",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    imageUrl: "assets/cards/Sorcerers_Apprentice.jpg",
    class: "Mage",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier("mana", -1, "friendly-hand", false, undefined, {
        conditions: [{ type: "boolean", key: "isSpell", value: true }],
        min: 1,
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["VO_EX1_608_Play_01.ogg"],
      ["VO_EX1_608_Attack_02.ogg"],
      ["VO_EX1_608_Death_03.ogg"],
    ),
  },
  "amani-berserker": {
    title: "Amani Berserker",
    description: "Has +3 Attack while damaged.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    imageUrl: "assets/cards/Amani_Berserker.jpg",
    class: "Neutral",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    enrage: [applyModifier("attack", 3, "self")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["VO_EX1_393_Play_01.ogg"],
      ["VO_EX1_393_Attack_02.ogg"],
      ["VO_EX1_393_Death_03.ogg"],
    ),
  },
  "molten-giant": {
    title: "Molten Giant",
    description: "Costs (1) less for each Health your hero is missing.",
    baseMana: 20,
    baseAttack: 8,
    baseHealth: 8,
    imageUrl: "assets/cards/Molten_Giant.jpg",
    class: "Neutral",
    rarity: "Epic",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    inHand: [
      applyModifier("mana", -1, "self", false, undefined, {
        mult: { type: "player-missing-health", player: "friendly" },
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["EX1_620_Molten_Giant_EnterPlay2.ogg"],
      ["EX1_620_Molten_Giant_Attack1.ogg"],
      ["EX1_620_Molten_Giant_Death1.ogg"],
    ),
  },
  "grommash-hellscream": {
    title: "Grommash Hellscream",
    description: "Charge. Has +6 Attack while damaged.",
    baseMana: 8,
    baseAttack: 4,
    baseHealth: 9,
    imageUrl: "assets/cards/Grommash_Hellscream.jpg",
    class: "Warrior",
    charge: true,
    rarity: "Legendary",
    isMinion: true,
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    enrage: [applyModifier("attack", 6, "self")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],

    sfx: sfx(
      ["Pegasus_Stinger_Horde1.ogg", "VO_EX1_414_Play_01.ogg"],
      ["VO_EX1_414_Attack_02.ogg"],
      ["VO_EX1_414_Death_03.ogg"],
    ),
  },
  "raid-leader": {
    title: "Raid Leader",
    description: "Your other minions have +1 attack.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    imageUrl: "assets/cards/Raid_Leader.jpg",
    class: "Neutral",
    isMinion: true,
    tags: ["Aura"],
    rarity: "Common",
    effects: [
      damage({
        type: "card-stat",
        stat: "attack",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier("attack", 1, "friendly-board", false, undefined, {
        conditions: [{ type: "exclude-self" }],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_122_Play_01.ogg"],
      ["VO_CS2_122_Attack_02.ogg"],
      ["VO_CS2_122_Death_03.ogg"],
    ),
  },
  "shattered-sun-cleric": {
    title: "Shattered Sun Cleric",
    description: "Battlecry: Give a friendly minion +1/+1.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 2,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Shattered_Sun_Cleric.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier("attack", 1), applyModifier("health", 1)],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_019_Play_01.ogg"],
      ["VO_EX1_019_Attack_02.ogg"],
      ["VO_EX1_019_Death_03.ogg"],
    ),
  },
  "war-golem": {
    title: "War Golem",
    description: "",
    baseMana: 7,
    baseAttack: 7,
    baseHealth: 7,
    imageUrl: "assets/cards/War_Golem.jpg",
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_186_War_Golem_EnterPlay1.ogg"],
      ["CS2_186_War_Golem_Attack3.ogg"],
      ["CS2_186_War_Golem_Death3.ogg"],
    ),
  },
  wisp: {
    title: "Wisp",
    description: "",
    baseMana: 0,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Undead"],
    imageUrl: "assets/cards/Wisp.jpg",
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
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_231_Wisp_EnterPlay1.ogg"],
      ["CS2_231_Wisp_Attack2.ogg"],
      ["CS2_231_Wisp_Death1.ogg"],
    ),
  },
  claw: {
    title: "Claw",
    description: "Give your hero +2 Attack this turn. Gain 2 Armor.",
    baseMana: 1,
    imageUrl: "assets/cards/Claw.jpg",
    effects: [
      applyModifier("attack", 2, "friendly-hero", false, {
        expiryOwner: "BUFF_CASTER",
        expiryTrigger: "END_OF_TURN",
        turnsRemaining: 1,
      }),
      armor(2),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Druid_Claw_Cast_1.ogg"]),
  },
  "savage-roar": {
    title: "Savage Roar",
    description: "Give your characters +2 Attack this turn.",
    baseMana: 3,
    imageUrl: "assets/cards/Savage_Roar.jpg",
    effects: [
      applyModifier("attack", 2, "friendly-all", false, {
        expiryOwner: "BUFF_CASTER",
        expiryTrigger: "END_OF_TURN",
        turnsRemaining: 1,
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Druid_SavageRoar_Cast_1.ogg"]),
  },
  moonfire: {
    title: "Moonfire",
    description: "Deal 1 damage.",
    baseMana: 0,
    type: ["Arcane"],
    imageUrl: "assets/cards/Moonfire.jpg",
    effects: [damage(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Shared_Arcane_Start_1.ogg"]),
  },
  naturalize: {
    title: "Naturalize",
    description: "Destroy a minion. Your opponent draws 2 cards.",
    baseMana: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Naturalize.jpg",
    effects: [destroy("user-select"), draw(2, "enemy")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Druid_Naturalize_Cast_1.ogg"]),
  },
  "gift-of-the-wild": {
    title: "Gift of the Wild",
    description: "Give your minions +2/+2 and Taunt.",
    baseMana: 8,
    type: ["Nature"],
    imageUrl: "assets/cards/Gift_of_the_Wild.jpg",
    effects: [
      applyModifier("attack", 2, "friendly-board"),
      applyModifier("health", 2, "friendly-board"),
      taunt("friendly-board"),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Druid_GiftoftheWild_Cast_1.ogg"]),
  },
  bite: {
    title: "Bite",
    description: "Give your hero +4 Attack this turn. Gain 4 Armor.",
    baseMana: 4,
    imageUrl: "assets/cards/Bite.jpg",
    effects: [
      applyModifier("attack", 4, "friendly-hero", false, {
        expiryOwner: "BUFF_CASTER",
        expiryTrigger: "END_OF_TURN",
        turnsRemaining: 1,
      }),
      armor(4),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Druid",
    set: ["Legacy"],
    sfx: sfx(["Druid_Bite_Cast_1.ogg"]),
  },
  "holy-smite": {
    title: "Holy Smite",
    description: "Deal 3 damage to a minion.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Holy_Smite.jpg",
    effects: [damage(3)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_HolySmite_Cast_1.ogg"]),
  },
  radiance: {
    title: "Radiance",
    description: "Restore 5 Health to your hero.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Radiance.jpg",
    effects: [heal(5, "friendly-hero")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_Radiance_Cast_1.ogg"]),
  },
  "power-word-shield": {
    title: "Power Word: Shield",
    description: "Give a minion +2 Health. Draw a card.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Power_Word_Shield.jpg",
    effects: [applyModifier("health", 2), draw(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_PowerWordShield_Cast_1.ogg"]),
  },
  "shadow-word-death": {
    title: "Shadow Word: Death",
    description: "Destroy a minion with 5 or more Attack.",
    baseMana: 2,
    type: ["Shadow"],
    imageUrl: "assets/cards/Shadow_Word_Death.jpg",
    effects: [destroy("user-select")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        {
          type: "numeric",
          key: { type: "card-stat", stat: "attack" },
          operator: ">=",
          value: 5,
        },
      ],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_ShadowWordDeath_Cast_1.ogg"]),
  },
  "shadow-word-pain": {
    title: "Shadow Word: Pain",
    description: "Destroy a minion with 3 or less Attack.",
    baseMana: 2,
    type: ["Shadow"],
    imageUrl: "assets/cards/Shadow_Word_Pain.jpg",
    effects: [destroy("user-select")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        {
          type: "numeric",
          key: { type: "card-stat", stat: "attack" },
          operator: "<=",
          value: 3,
        },
      ],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_ShadowWordPain_Cast_1.ogg"]),
  },
  "holy-nova": {
    title: "Holy Nova",
    description:
      "Deal 2 damage to all enemy minions. Restore 2 Health to all friendly characters.",
    baseMana: 3,
    type: ["Holy"],
    imageUrl: "assets/cards/Holy_Nova.jpg",
    effects: [damage(2, "enemy-board"), heal(2, "friendly-all")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_HolyNova_Cast_1.ogg"]),
  },
  "power-infusion": {
    title: "Power Infusion",
    description: "Give a minion +2/+6.",
    baseMana: 4,
    type: ["Holy"],
    imageUrl: "assets/cards/Power_Infusion.jpg",
    effects: [applyModifier("attack", 2), applyModifier("health", 6)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_PowerInfusion_Cast_1.ogg"]),
  },
  "circle-of-healing": {
    title: "Circle of Healing",
    description: "Restore 4 Health to ALL minions.",
    baseMana: 0,
    type: ["Holy"],
    imageUrl: "assets/cards/Circle_of_Healing.jpg",
    effects: [{ type: "heal", value: 4, target: "board" }],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_CircleofHealing_Cast_1.ogg"]),
  },
  "mind-blast": {
    title: "Mind Blast",
    description: "Deal 5 damage to the enemy hero.",
    baseMana: 2,
    type: ["Shadow"],
    imageUrl: "assets/cards/Mind_Blast.jpg",
    effects: [damage(5, "enemy-hero")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_MindBlast_Cast_1.ogg"]),
  },
  "shadowed-spirit": {
    title: "Shadowed Spirit",
    description: "Deathrattle: Deal 3 damage to the enemy hero.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 3,
    type: ["Undead"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Shadowed_Spirit.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [damage(3, "enemy-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS3_013_Male_Shade_Play_01.ogg"],
      ["VO_CS3_013_Male_Shade_Attack_01.ogg"],
      ["VO_CS3_013_Male_Shade_Death_01.ogg"],
    ),
  },
  "temple-enforcer": {
    title: "Temple Enforcer",
    description: "Battlecry: Give a friendly minion +3 Health.",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 6,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Temple_Enforcer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier("health", 3)],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_623_Temple_Enforcer_EnterPlay_1.ogg"],
      ["EX1_623_Temple_Enforcer_Attack_2.ogg"],
      ["EX1_623_Temple_Enforcer_Death_4.ogg"],
    ),
  },
  "scarlet-subjugator": {
    title: "Scarlet Subjugator",
    description:
      "Battlecry: Give an enemy minion -2 Attack until your next turn.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Scarlet_Subjugator.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier("attack", -2, "user-select", false, {
        expiryOwner: "BUFF_CASTER",
        expiryTrigger: "START_OF_TURN",
        turnsRemaining: 1,
      }),
    ],
    battlecryQuery: {
      side: "enemy",
      type: ["card"],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_196_Male_Human_Play_01.ogg"],
      ["VO_EX1_196_Male_Human_Attack_01.ogg"],
      ["VO_EX1_196_Male_Human_Death_01.ogg"],
    ),
  },
  "kul-tiran-chaplain": {
    title: "Kul Tiran Chaplain",
    description: "Battlecry: Give a friendly minion +2 Health.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Kul_Tiran_Chaplain.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier("health", 2)],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_195_Male_KulTiranHuman_Play_01.ogg"],
      ["VO_EX1_195_Male_KulTiranHuman_Attack_01.ogg"],
      ["VO_EX1_195_Male_KulTiranHuman_Death_01.ogg"],
    ),
  },
  "holy-fire": {
    title: "Holy Fire",
    description: "Deal 5 damage. Restore 5 Health to your hero.",
    baseMana: 6,
    type: ["Holy"],
    imageUrl: "assets/cards/Holy_Fire.jpg",
    effects: [damage(5), heal(5, "friendly-hero")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_HolyFire_Cast_1.ogg"]),
  },
  "shadow-word-ruin": {
    title: "Shadow Word: Ruin",
    description: "Destroy all minions with 5 or more Attack.",
    baseMana: 4,
    type: ["Shadow"],
    imageUrl: "assets/cards/Shadow_Word_Ruin.jpg",
    effects: [
      {
        type: "destroy",
        target: "board",
        conditions: [
          {
            type: "numeric",
            key: { type: "card-stat", stat: "attack" },
            operator: ">=",
            value: 5,
          },
        ],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Epic",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(["Priest_ShadowWordRuin_Cast_1.ogg"]),
  },
  "natalie-seline": {
    title: "Natalie Seline",
    description: "Battlecry: Destroy a minion and gain its Health.",
    baseMana: 7,
    baseAttack: 7,
    baseHealth: 1,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Natalie_Seline.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      {
        type: "sequence",
        steps: [
          {
            type: "storeVar",
            target: "user-select",
            value: { type: "card-stat", stat: "maxHealth" },
          },
          destroy("user-select"),
          applyModifier("health", { type: "temp" }, "self"),
        ],
      },
    ],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        {
          type: "exclude-self",
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["NatalieSeline_Play_Stinger.ogg", "VO_EX1_198_Female_Human_Play_02.ogg"],
      ["VO_EX1_198_Female_Human_Attack_01.ogg"],
      ["VO_EX1_198_Female_Human_Death_01.ogg"],
    ),
  },
  "timber-wolf": {
    title: "Timber Wolf",
    description: "Your other Beasts have +1 Attack.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Beast"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Timber_Wolf.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier("attack", 1, "friendly-board", false, undefined, {
        conditions: [
          { type: "exclude-self" },
          { type: "tags-include", value: "Beast" },
        ],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_DS1_175_EnterPlay.ogg"],
      ["SFX_DS1_175_Attack.ogg"],
      ["SFX_DS1_175_Death.ogg"],
    ),
  },
  "multi-shot": {
    title: "Multi-Shot",
    description: "Deal 3 damage to two random enemy minions.",
    baseMana: 4,
    imageUrl: "assets/cards/Multi_Shot.jpg",
    effects: [
      {
        type: "damage",
        value: 3,
        target: "enemy-board",
        rand: { split: false, n: 2 },
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(["Hunter_MultiShot_Cast_1.ogg"]),
  },
  houndmaster: {
    title: "Houndmaster",
    description: "Battlecry: Give a friendly Beast +2/+2 and Taunt.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Houndmaster.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier("attack", 2), applyModifier("health", 2), taunt()],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "tags-include", value: "Beast" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_DS1_070_Play_01.ogg"],
      ["VO_DS1_070_Attack_02.ogg"],
      ["VO_DS1_070_Death_03.ogg"],
    ),
  },
  "deadly-shot": {
    title: "Deadly Shot",
    description: "Destroy a random enemy minion.",
    baseMana: 3,
    imageUrl: "assets/cards/Deadly_Shot.jpg",
    effects: [
      {
        type: "destroy",
        target: "enemy-board",
        rand: { split: false, n: 1 },
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(["Hunter_DeadlyShot_Cast_1.ogg"]),
  },
  "explosive-shot": {
    title: "Explosive Shot",
    description: "Deal 5 damage to a minion and 2 damage to adjacent ones.",
    baseMana: 5,
    type: ["Fire"],
    imageUrl: "assets/cards/Explosive_Shot.jpg",
    effects: [damage(5), damage(2, "adjacent-target")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(["Hunter_ExplosiveShot_Cast_1.ogg"]),
  },
  "savannah-highmane": {
    title: "Savannah Highmane",
    description: "Deathrattle: Summon two 2/2 Hyenas.",
    baseMana: 6,
    baseAttack: 7,
    baseHealth: 5,
    type: ["Beast"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Savannah_Highmane.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [summon("hyena", "self", 2)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_534_EnterPlay.ogg"],
      ["SFX_EX1_534_Attack.ogg"],
      ["SFX_EX1_534_Death.ogg"],
    ),
  },
  hyena: {
    title: "Hyena",
    description: "",
    baseAttack: 2,
    baseHealth: 2,
    baseMana: 2,
    type: ["Beast"],
    imageUrl: "assets/cards/Hyena.jpg",
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
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_531_EnterPlay.ogg"],
      ["SFX_EX1_531_Attack.ogg"],
      ["SFX_EX1_531_Death.ogg"],
    ),
  },
  "king-krush": {
    title: "King Krush",
    description: "Charge.",
    baseMana: 9,
    baseAttack: 8,
    baseHealth: 8,
    type: ["Beast"],
    tags: ["Charge"],
    charge: true,
    imageUrl: "assets/cards/King_Krush.jpg",
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
    rarity: "Legendary",
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_543_EnterPlay.ogg", "Pegasus_Stinger_Beast_Villain.ogg"],
      ["SFX_EX1_543_Attack.ogg"],
      ["SFX_EX1_543_Death.ogg"],
    ),
  },
} satisfies Record<
  string,
  Omit<Card, "id" | "originalID" | "damageTaken" | "attacksLeft">
>;

// 1. Automatically extracts: "flame-imp" | "chillwind-yeti" | ...
export type CardTemplateKey = keyof typeof cardTemplates;

// 2. An actual type-safe Record mapping your exact keys to cards
export type CardTemplateRecord = typeof cardTemplates;
