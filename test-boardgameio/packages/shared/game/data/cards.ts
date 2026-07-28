import type {
  ApplyModifierEffect,
  ArmorEffect,
  BaseBoolEffect,
  BaseEffectSelection,
  Card,
  DamageEffect,
  DynamicValue,
  EffectTypes,
  SFXInstance,
  TargetCondition,
  TriggerDef,
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

/**
 * Builds one grouped ENCHANTMENT effect: all stat changes and keyword grants
 * of a buff live in a single modifier ("+2/+2 and Taunt" is ONE entry on the
 * card's modifier list, shown as one item on hover).
 */
const applyModifier = (
  opts: Pick<
    ApplyModifierEffect,
    | "stats"
    | "keys"
    | "name"
    | "description"
    | "override"
    | "duration"
    | "conditions"
    | "min"
    | "max"
    | "mult"
    | "stackable"
    // "…a random friendly minion" (Young Priestess, Master Swordsmith)
    | "rand"
  > & { target?: ApplyModifierEffect["target"] },
): ApplyModifierEffect => {
  const { target, ...rest } = opts;
  return {
    type: "applyModifier",
    target: target ?? "user-select",
    ...rest,
  };
};

// Spell Damage +N source aura: continuously grants +N spell damage to the
// caster's spell cards in hand (mirrors Sorcerer's Apprentice's cost aura).
const spellDamageAura = (n: number): ApplyModifierEffect =>
  applyModifier({
    name: `Spell Damage +${n}`,
    stats: { spellDamage: n },
    target: "friendly-hand",
    conditions: [{ type: "boolean", key: "isSpell", value: true }],
  });

// 1. The Generic Factory Function — generic over the keyword so the return
// type narrows to that exact union member instead of the whole union.
type BoolEffectType = Extract<EffectTypes, BaseBoolEffect>["type"];

const createBoolEffectUtil = <T extends BoolEffectType>(type: T) => {
  return (
    target: BaseBoolEffect["target"] = "user-select",
    battlecry: boolean = false,
  ): Extract<EffectTypes, { type: T }> =>
    ({
      type,
      target,
      battlecry,
    }) as Extract<EffectTypes, { type: T }>;
};

// 2. Generate all your utility helpers instantly
const freeze = createBoolEffectUtil("freeze");
const divineShield = createBoolEffectUtil("divineShield");
export const taunt = createBoolEffectUtil("taunt");
// const stealth = createBoolEffectUtil("stealth");
const charge = createBoolEffectUtil("charge");
const windfury = createBoolEffectUtil("windfury");
export const poisonous = createBoolEffectUtil("poisonous");
export const immune = createBoolEffectUtil("immune");
// const rush = createBoolEffectUtil("rush");

const destroy = (
  target: "user-select" | "self" | "enemy-board" | "board",
): EffectTypes => {
  return {
    type: "destroy",
    target: target,
  };
};

/** Wipes a minion's text, keywords and its own enchantments. Never kills. */
const silence = (
  target: BaseEffectSelection["target"] = "user-select",
  conditions?: TargetCondition[],
): EffectTypes => {
  return { type: "silence", target, ...(conditions ? { conditions } : {}) };
};

/**
 * Swaps a board minion for another template in place (Polymorph / Hex).
 * Pass a list to pick one at random per target (Tinkmaster).
 */
const transform = (
  cardID: string | string[],
  target: BaseEffectSelection["target"] = "user-select",
  conditions?: TargetCondition[],
  rand?: { split: boolean; n: number },
): EffectTypes => {
  return {
    type: "transform",
    cardID,
    target,
    ...(conditions ? { conditions } : {}),
    ...(rand ? { rand } : {}),
  };
};

/**
 * One "whenever X happens, do Y" clause. `player` scopes the event to the
 * card's own side / the opponent / both; `self` narrows it to (or away from)
 * the card itself. Inside `effects`, `target: "user-select"` means whatever
 * the window happened TO, and {type:"damage-dealt"} is how much.
 */
const trigger = (
  on: TriggerDef["on"],
  player: TriggerDef["player"],
  effects: EffectTypes[],
  opts: Omit<TriggerDef, "on" | "player" | "effects"> = {},
): TriggerDef => ({ on, player, effects, ...opts });

/** Shorthand for the very common "buff myself" trigger payload. */
const buffSelf = (
  stats: { attack?: number; health?: number },
  duration?: ApplyModifierEffect["duration"],
): EffectTypes =>
  applyModifier({
    target: "self",
    stats,
    stackable: true,
    ...(duration ? { duration } : {}),
  });

/** Moves an enemy minion onto your board. No-ops when your board is full. */
const takeControl = (
  target: BaseEffectSelection["target"] = "user-select",
  conditions?: TargetCondition[],
  rand?: { split: boolean; n: number },
): EffectTypes => {
  return {
    type: "takeControl",
    target,
    ...(conditions ? { conditions } : {}),
    ...(rand ? { rand } : {}),
  };
};

/** Temporary Mana Crystals for this turn only — The Coin, Innervate. */
const mana = (value: number): EffectTypes => {
  return { type: "mana", value: value };
};

/**
 * Permanent Mana Crystals. Empty by default (Wild Growth, Nourish — the mana
 * isn't usable until next turn); pass filled to also fill them.
 */
const manaCrystal = (
  count: number = 1,
  filled: boolean = false,
  target: "self" | "enemy" = "self",
): EffectTypes => {
  return {
    type: "mana",
    value: count,
    mode: filled ? "crystal-filled" : "crystal-empty",
    target,
  };
};

/** Felguard: destroys permanent crystals, empty ones first. */
const destroyManaCrystal = (
  count: number = 1,
  target: "self" | "enemy" = "self",
): EffectTypes => {
  return { type: "mana", value: count, mode: "destroy", target };
};

/**
 * Changes a weapon's CURRENT durability: positive repairs (clamped at max),
 * negative chips it and can break it. For MAXIMUM durability use
 * `applyModifier({ stats: { durability: n }, target: "friendly-weapon" })`.
 */
export const durability = (
  value: number | DynamicValue,
  target:
    | "friendly-weapon"
    | "enemy-weapon"
    | "user-select" = "friendly-weapon",
): EffectTypes => {
  return { type: "durability", value, target };
};

/** Lava Shock: unlock and refill Overloaded crystals. */
export const unlockOverloadEffect = (
  scope: "locked" | "pending" | "both" = "locked",
): EffectTypes => {
  return { type: "mana", value: 0, mode: "unlock-overload", scope };
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
  cardID?: string | string[], // specific card, or a list to pick from at random; omit to summon from all minions
  target: "self" | "enemy" = "self",
  count: number | DynamicValue = 1,
  conditions?: TargetCondition[], // filter candidates (e.g. summon a random Demon)
): EffectTypes => {
  return {
    type: "summon",
    ...(cardID !== undefined ? { cardID } : {}),
    ...(conditions ? { conditions } : {}),
    target,
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
export const addToHand = (
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
};

// Add from deck - removes cards from deck

export const addFromDeck = (
  conditions: TargetCondition[],
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

// Add copy from deck - creates copy, keeps original in deck

export const addCopyFromDeck = (
  conditions: TargetCondition[],
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
};

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
  conditions: TargetCondition[],
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
  conditions?: TargetCondition[],
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

type SFXTHING = string | SFXInstance | [string, number];

const sfx = (
  play: SFXTHING[],
  attack?: SFXTHING[],
  death?: SFXTHING[],
  // SFXTHING, not SFXInstance — the other buckets accept a bare filename
  // string (or a [file, delay] pair), and that's how the scraper emits them.
  trigger?: SFXTHING[],
): {
  death?: SFXInstance[];
  play?: SFXInstance[];
  attack?: SFXInstance[];
  trigger?: SFXInstance[];
} => {
  const parser = (soundId: SFXTHING): SFXInstance =>
    typeof soundId === "string"
      ? { soundId: sfxShortener(soundId) }
      : Array.isArray(soundId)
        ? {
            soundId: sfxShortener(soundId[0]),
            delay: soundId[1],
          }
        : soundId;
  return {
    death: death?.map(parser),
    play: play?.map(parser),
    attack: attack?.map(parser),
    trigger: trigger?.map(parser),
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
    sfx: sfx([
      "FX_FireballEvent03_SpellCast_01.ogg",
      ["FX_FireballEvent04_SpellImpact_01.ogg", 400],
    ]),
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
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ], // No standard baseAttack value effect because its base baseAttack is 0
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
  "searing-totem": {
    title: "Searing Totem",
    description: "",
    baseAttack: 1,
    baseHealth: 1,
    baseMana: 1,
    type: ["Totem"],
    imageUrl: "assets/cards/Searing_Totem.jpg",
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
    isUncollectible: true, // Token, hidden from deckbuilders
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_051_Play_StoneclawTotem.ogg"],
      ["SFX_CS2_050_Attack_00.ogg"],
      ["CS2_050_Death_SearingTotem.ogg"],
    ),
  },
  "stoneclaw-totem": {
    title: "Stoneclaw Totem",
    description: "Taunt.",
    taunt: true,
    baseAttack: 0,
    baseHealth: 2,
    baseMana: 1,
    type: ["Totem"],
    imageUrl: "assets/cards/Stoneclaw_Totem.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ], // 0 attack, no attack effect (mirrors mirror-image-token)
    onPlace: [],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true, // Token, hidden from deckbuilders
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_051_Play_StoneclawTotem.ogg"],
      ["SFX_CS2_050_Attack_00.ogg"],
      ["CS2_050_Death_SearingTotem.ogg"],
    ),
  },
  "wrath-of-air-totem": {
    title: "Wrath of Air Totem",
    description: "Spell Damage +1",
    baseAttack: 0,
    baseHealth: 2,
    baseMana: 1,
    type: ["Totem"],
    imageUrl: "assets/cards/Wrath_of_Air_Totem.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ], // 0 attack, no attack effect
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true, // shows purple sparkles instead of the yellow aura glow
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true, // Token, hidden from deckbuilders
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_051_Play_StoneclawTotem.ogg"],
      ["SFX_CS2_052_Attack_00.ogg"],
      ["CS2_052_Death_WrathofAirTotem.ogg"],
    ),
  },
  "kobold-geomancer": {
    title: "Kobold Geomancer",
    description: "Spell Damage +1",
    baseAttack: 2,
    baseHealth: 2,
    baseMana: 2,
    type: ["Minion"],
    imageUrl: "assets/cards/Kobold_Geomancer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true, // shows purple sparkles instead of the yellow aura glow
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_142_Play_01.ogg"],
      ["VO_CS2_142_Attack_02.ogg"],
      ["VO_CS2_142_Death_03.ogg"],
    ),
  },
  "ogre-magi": {
    title: "Ogre Magi",
    description: "Spell Damage +1",
    baseAttack: 4,
    baseHealth: 4,
    baseMana: 4,
    type: ["Minion"],
    imageUrl: "assets/cards/Ogre_Magi.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true, // shows purple sparkles instead of the yellow aura glow
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_197_Play_01_MIX.ogg"],
      ["VO_CS2_197_Attack_02_MIX.ogg"],
      ["VO_CS2_197_Death_03_MIX.ogg"],
    ),
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
        delay: 400,
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
    effects: [
      applyModifier({ stats: { attack: 2, health: 3 }, keys: { taunt: true } }),
    ],
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
    effects: [applyModifier({ stats: { attack: 4, health: 4 } })],
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
    effects: [damage(1), applyModifier({ stats: { attack: 2 } })],
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
    type: ["Holy"],
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
    onPlace: [
      damage(1, "user-select", true),
      applyModifier({ stats: { attack: 2 } }),
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
    effects: [applyModifier({ stats: { attack: 3, health: 3 } })],
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
        delay: 500,
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

        then: [applyModifier({ stats: { attack: 2, health: 2 } })],
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
        modifiers: [applyModifier({ stats: { mana: -2 }, target: "self" })],
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
      applyModifier({
        stats: { attack: 2 },
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
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
      applyModifier({
        stats: { attack: 2, health: 2 },
        target: "self",
        mult: { type: "combo-count" },
      }),
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
      applyModifier({
        stats: { attack: 1, health: 1 },
        target: "friendly-board",
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
      applyModifier({
        stats: { attack: 2 },
        target: "friendly-board",
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
    aura: [applyModifier({ stats: { attack: 1 }, target: "adjacent" })],
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
      applyModifier({
        stats: { mana: -1 },
        target: "friendly-hand",
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
    enrage: [applyModifier({ stats: { attack: 3 }, target: "self" })],
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
      applyModifier({
        stats: { mana: -1 },
        target: "self",
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
    enrage: [applyModifier({ stats: { attack: 6 }, target: "self" })],
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
      applyModifier({
        stats: { attack: 1 },
        target: "friendly-board",
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
    onPlace: [applyModifier({ stats: { attack: 1, health: 1 } })],
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
      applyModifier({
        stats: { attack: 2 },
        target: "friendly-hero",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
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
      applyModifier({
        stats: { attack: 2 },
        target: "friendly-all",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
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
      applyModifier({
        stats: { attack: 2, health: 2 },
        keys: { taunt: true },
        target: "friendly-board",
      }),
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
      applyModifier({
        stats: { attack: 4 },
        target: "friendly-hero",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
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
    effects: [applyModifier({ stats: { health: 2 } }), draw(1)],
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
    effects: [applyModifier({ stats: { attack: 2, health: 6 } })],
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
    onPlace: [applyModifier({ stats: { health: 3 } })],
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
      applyModifier({
        stats: { attack: -2 },
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "START_OF_TURN",
          turnsRemaining: 1,
        },
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
    onPlace: [applyModifier({ stats: { health: 2 } })],
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
            value: { type: "card-stat", stat: "health" },
          },
          destroy("user-select"),
          applyModifier({
            stats: { health: { type: "temp" } },
            target: "self",
          }),
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
      applyModifier({
        stats: { attack: 1 },
        target: "friendly-board",
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
    onPlace: [
      applyModifier({ stats: { attack: 2, health: 2 }, keys: { taunt: true } }),
    ],
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
  "lights-justice": {
    title: "Light's Justice",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 1,
    baseAttack: 1,
    baseDurability: 4,
    imageUrl: "assets/cards/Lights_Justice.jpg",
    class: "Paladin",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "holy-light": {
    title: "Holy Light",
    description: "Restore 8 Health to your hero.",
    baseMana: 2,
    type: ["Holy"],
    imageUrl: "assets/cards/Holy_Light.jpg",
    effects: [heal(8, "friendly-hero")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(["Paladin_HolyLight_Cast_1.ogg"]),
  },
  consecration: {
    title: "Consecration",
    description: "Deal 2 damage to all enemies.",
    baseMana: 3,
    type: ["Holy"],
    imageUrl: "assets/cards/Consecration.jpg",
    effects: [damage(2, "enemy-all")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(["Paladin_Consecration_Cast_1.ogg"]),
  },
  "hammer-of-wrath": {
    title: "Hammer of Wrath",
    description: "Deal 3 damage. Draw a card.",
    baseMana: 3,
    type: ["Holy"],
    imageUrl: "assets/cards/Hammer_of_Wrath.jpg",
    effects: [damage(3), draw(1)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(["Paladin_HammerofWrath_Cast_1.ogg"]),
  },
  "truesilver-champion": {
    title: "Truesilver Champion",
    description: "Whenever your hero attacks, restore 3 Health to it.",
    isWeapon: true,
    isMinion: false,
    baseMana: 4,
    baseAttack: 4,
    baseDurability: 2,
    imageUrl: "assets/cards/Truesilver_Champion.jpg",
    class: "Paladin",
    effects: [heal(3, "friendly-hero")],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "avenging-wrath": {
    title: "Avenging Wrath",
    description: "Deal 8 damage randomly split among all enemies.",
    baseMana: 6,
    type: ["Holy"],
    imageUrl: "assets/cards/Avenging_Wrath.jpg",
    effects: [
      {
        type: "damage",
        value: 8,
        target: "enemy-all",
        rand: { split: true, n: 0 },
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
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(["Paladin_AvengingWrath_Cast_1.ogg"]),
  },
  "ancestral-healing": {
    title: "Ancestral Healing",
    description: "Restore a minion to full Health and give it Taunt.",
    baseMana: 0,
    type: ["Nature"],
    imageUrl: "assets/cards/Ancestral_Healing.jpg",
    // heal caps at maxHealth (helpers.healCard), so a large value = "to full"
    effects: [
      {
        type: "storeVar",
        target: "user-select",
        value: { type: "card-stat", stat: "damageTaken" },
      },
      heal({
        type: "temp",
      }),
      applyModifier({ keys: { taunt: true } }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  "totemic-might": {
    title: "Totemic Might",
    description: "Give your Totems +2 Health.",
    baseMana: 0,
    imageUrl: "assets/cards/Totemic_Might.jpg",
    effects: [
      applyModifier({
        stats: { health: 2 },
        target: "friendly-board",
        conditions: [{ type: "tags-include", value: "Totem" }],
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  "rockbiter-weapon": {
    title: "Rockbiter Weapon",
    description: "Give a friendly character +3 Attack this turn.",
    baseMana: 2,
    type: ["Nature"],
    imageUrl: "assets/cards/Rockbiter_Weapon.jpg",
    effects: [
      applyModifier({
        stats: { attack: 3 },
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "friendly",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  windfury: {
    title: "Windfury",
    description: "Give a minion Windfury.",
    baseMana: 2,
    type: ["Nature"],
    imageUrl: "assets/cards/Windfury.jpg",
    effects: [windfury()],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  bloodlust: {
    title: "Bloodlust",
    description: "Give your minions +3 Attack this turn.",
    baseMana: 5,
    imageUrl: "assets/cards/Bloodlust.jpg",
    effects: [
      applyModifier({
        stats: { attack: 3 },
        target: "friendly-board",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  "forked-lightning": {
    title: "Forked Lightning",
    description: "Deal 2 damage to 2 random enemy minions. Overload: (2)",
    baseMana: 1,
    overload: 2,
    type: ["Nature"],
    imageUrl: "assets/cards/Forked_Lightning.jpg",
    effects: [
      {
        type: "damage",
        value: 2,
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
    rarity: "Common",
    class: "Shaman",
    set: ["Legacy"],
  },
  "lightning-bolt": {
    title: "Lightning Bolt",
    description: "Deal 3 damage. Overload: (1)",
    baseMana: 1,
    overload: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Lightning_Bolt.jpg",
    effects: [damage(3)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Shaman",
    set: ["Legacy"],
  },
  "stormforged-axe": {
    title: "Stormforged Axe",
    description: "Overload: (1)",
    isWeapon: true,
    isMinion: false,
    baseMana: 2,
    baseAttack: 2,
    baseDurability: 3,
    overload: 1,
    imageUrl: "assets/cards/Stormforged_Axe.jpg",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Common",
    class: "Shaman",
    set: ["Legacy"],
  },
  "lava-burst": {
    title: "Lava Burst",
    description: "Deal 5 damage. Overload: (2)",
    baseMana: 3,
    overload: 2,
    type: ["Fire"],
    imageUrl: "assets/cards/Lava_Burst.jpg",
    effects: [damage(5)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Shaman",
    set: ["Legacy"],
  },
  "lightning-storm": {
    title: "Lightning Storm",
    description: "Deal 3 damage to all enemy minions. Overload: (1)",
    baseMana: 3,
    overload: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Lightning_Storm.jpg",
    effects: [damage(3, "enemy-board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Shaman",
    set: ["Legacy"],
  },
  doomhammer: {
    title: "Doomhammer",
    description: "Windfury, Overload: (2)",
    isWeapon: true,
    isMinion: false,
    baseMana: 5,
    baseAttack: 2,
    baseDurability: 8,
    overload: 2,
    windfury: true,
    imageUrl: "assets/cards/Doomhammer.jpg",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Epic",
    class: "Shaman",
    set: ["Legacy"],
  },
  "dust-devil": {
    title: "Dust Devil",
    description: "Windfury. Overload: (2)",
    baseMana: 1,
    baseAttack: 3,
    baseHealth: 1,
    overload: 2,
    windfury: true,
    type: ["Elemental"],
    tags: ["Windfury", "Overload"],
    imageUrl: "assets/cards/Dust_Devil.jpg",
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
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_243_Dust_Devil_EnterPlay1.ogg"],
      ["EX1_243_Dust_Devil_Attack3.ogg"],
      ["EX1_243_Dust_Devil_Death3.ogg"],
    ),
  },
  "earth-elemental": {
    title: "Earth Elemental",
    description: "Taunt. Overload: (2)",
    baseMana: 5,
    baseAttack: 7,
    baseHealth: 9,
    overload: 2,
    taunt: true,
    type: ["Elemental"],
    tags: ["Taunt", "Overload"],
    imageUrl: "assets/cards/Earth_Elemental.jpg",
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
    rarity: "Epic",
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_250_Earth_Elemental_EnterPlay2.ogg"],
      ["EX1_250_Earth_Elemental_Attack3.ogg"],
      ["EX1_250_Earth_Elemental_Death2.ogg"],
    ),
  },
  "fire-elemental": {
    title: "Fire Elemental",
    description: "Battlecry: Deal 4 damage.",
    baseMana: 6,
    baseAttack: 6,
    baseHealth: 5,
    type: ["Elemental"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Fire_Elemental.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(4, "user-select", true)],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["CS2_042_Play_FireElemental.ogg"],
      ["CS2_042_Attack_FireElemental.ogg"],
      ["CS2_042_Death_FireElemental.ogg"],
    ),
  },
  windspeaker: {
    title: "Windspeaker",
    description: "Battlecry: Give a friendly minion Windfury.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Draenei"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Windspeaker.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [windfury()],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_587_Play_01.ogg"],
      ["VO_EX1_587_Attack_02.ogg"],
      ["VO_EX1_587_Death_03.ogg"],
    ),
  },
  "alakir-the-windlord": {
    title: "Al'Akir the Windlord",
    description: "Charge, Divine Shield, Taunt, Windfury",
    baseMana: 8,
    baseAttack: 3,
    baseHealth: 6,
    type: ["Elemental"],
    tags: ["Charge", "Divine Shield", "Taunt", "Windfury"],
    charge: true,
    divineShield: true,
    taunt: true,
    windfury: true,
    imageUrl: "assets/cards/AlAkir_the_Windlord.jpg",
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
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["Pegasus_Stinger_Elemental_Villain.ogg", "VO_NEW1_010_Play_01.ogg"],
      ["VO_NEW1_010_Attack_02.ogg"],
      ["VO_NEW1_010_Death_03.ogg"],
    ),
  },
  "shield-slam": {
    title: "Shield Slam",
    description: "Deal 1 damage to a minion for each Armor you have.",
    baseMana: 1,
    imageUrl: "assets/cards/Shield_Slam.jpg",
    effects: [damage({ type: "player-armor", player: "friendly" })],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Epic",
    class: "Warrior",
    set: ["Legacy"],
  },
  cleave: {
    title: "Cleave",
    description: "Deal 2 damage to two random enemy minions.",
    baseMana: 2,
    imageUrl: "assets/cards/Cleave.jpg",
    effects: [
      {
        type: "damage",
        value: 2,
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
    class: "Warrior",
    set: ["Legacy"],
  },
  "heroic-strike": {
    title: "Heroic Strike",
    description: "Give your hero +4 Attack this turn.",
    baseMana: 2,
    imageUrl: "assets/cards/Heroic_Strike.jpg",
    effects: [
      applyModifier({
        stats: { attack: 4 },
        target: "friendly-hero",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Warrior",
    set: ["Legacy"],
  },
  slam: {
    title: "Slam",
    description: "Deal 2 damage to a minion. If it survives, draw a card.",
    baseMana: 1,
    imageUrl: "assets/cards/Slam.jpg",
    // After the hit, the still-on-board target reads health > 0 only if it lived
    // (death resolution is deferred until the effect chain completes).
    effects: [
      damage(2),
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: { type: "card-stat", stat: "health" },
            operator: ">",
            value: 0,
          },
        ],
        then: [draw(1)],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Warrior",
    set: ["Legacy"],
  },
  vanish: {
    title: "Vanish",
    description: "Return all minions to their owner's hand.",
    baseMana: 6,
    imageUrl: "assets/cards/Vanish.jpg",
    effects: [returnToHand("board")],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Rogue",
    set: ["Legacy"],
  },
  betrayal: {
    title: "Betrayal",
    description:
      "Force an enemy minion to deal its damage to the minions next to it.",
    baseMana: 2,
    imageUrl: "assets/cards/Betrayal.jpg",
    // Stash the selected minion's Attack, then splash it onto its neighbours.
    effects: [
      {
        type: "sequence",
        steps: [
          {
            type: "storeVar",
            target: "user-select",
            value: { type: "card-stat", stat: "attack" },
          },
          damage({ type: "temp" }, "adjacent-target"),
        ],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "enemy",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Rogue",
    set: ["Legacy"],
  },
  conceal: {
    title: "Conceal",
    description: "Give your minions Stealth until your next turn.",
    baseMana: 1,
    type: ["Shadow"],
    imageUrl: "assets/cards/Conceal.jpg",
    effects: [
      applyModifier({
        keys: { stealth: true },
        target: "friendly-board",
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "START_OF_TURN",
          turnsRemaining: 1,
        },
      }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Rogue",
    set: ["Legacy"],
  },
  "cold-blood": {
    title: "Cold Blood",
    description: "Give a minion +2 Attack. Combo: +4 Attack instead.",
    baseMana: 1,
    imageUrl: "assets/cards/Cold_Blood.jpg",
    effects: [
      comboOr(
        [applyModifier({ stats: { attack: 4 } })],
        [applyModifier({ stats: { attack: 2 } })],
      ),
    ],
    onPlace: [],
    isSpell: true,
    tags: ["Combo"],
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Rogue",
    set: ["Legacy"],
  },
  sprint: {
    title: "Sprint",
    description: "Draw 4 cards.",
    baseMana: 5,
    imageUrl: "assets/cards/Sprint.jpg",
    effects: [draw(4)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Rogue",
    set: ["Legacy"],
  },
  "deadly-poison": {
    title: "Deadly Poison",
    description: "Give your weapon +2 Attack.",
    baseMana: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Deadly_Poison.jpg",
    effects: [
      applyModifier({ stats: { attack: 2 }, target: "friendly-weapon" }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Rogue",
    set: ["Legacy"],
  },
  "assassins-blade": {
    title: "Assassin's Blade",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 4,
    baseAttack: 2,
    baseDurability: 5,
    imageUrl: "assets/cards/Assassins_Blade.jpg",
    class: "Rogue",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "perditions-blade": {
    title: "Perdition's Blade",
    description: "Battlecry: Deal 1 damage. Combo: Deal 2 instead.",
    isWeapon: true,
    isMinion: false,
    baseMana: 3,
    baseAttack: 2,
    baseDurability: 2,
    imageUrl: "assets/cards/Perditions_Blade.jpg",
    class: "Rogue",
    tags: ["Battlecry", "Combo"],
    effects: [],
    onPlace: [
      comboOr(
        [damage(2, "user-select", true)],
        [damage(1, "user-select", true)],
      ),
    ],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Rare",
    set: ["Legacy"],
  },
  "arcanite-reaper": {
    title: "Arcanite Reaper",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 5,
    baseAttack: 5,
    baseDurability: 2,
    imageUrl: "assets/cards/Arcanite_Reaper.jpg",
    class: "Warrior",
    effects: [],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  siegebreaker: {
    title: "Siegebreaker",
    description: "Taunt. Your other Demons have +1 Attack.",
    baseMana: 7,
    baseAttack: 5,
    baseHealth: 8,
    taunt: true,
    type: ["Demon"],
    tags: ["Taunt", "Aura"],
    imageUrl: "assets/cards/Siegebreaker.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { attack: 1 },
        target: "friendly-board",
        conditions: [
          { type: "exclude-self" },
          { type: "tags-include", value: "Demon" },
        ],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Warlock",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_185_Male_Pitlord_Play_01.ogg"],
      ["VO_EX1_185_Male_Pitlord_Attack_01.ogg"],
      ["VO_EX1_185_Male_Pitlord_Death_01.ogg"],
    ),
  },
  "feral-spirit": {
    title: "Feral Spirit",
    description: "Summon two 2/3 Spirit Wolves with Taunt. Overload: (1)",
    baseMana: 3,
    overload: 1,
    type: ["Nature"],
    tags: ["Overload"],
    imageUrl: "assets/cards/Feral_Spirit.jpg",
    effects: [summon("spirit-wolf", "self", 2)],
    onPlace: [],
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    isSpell: true,
    rarity: "Rare",
    class: "Shaman",
    set: ["Legacy"],
  },
  "spirit-wolf": {
    title: "Spirit Wolf",
    description: "Taunt.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    taunt: true,
    type: ["Undead", "Beast"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Spirit_Wolf.jpg",
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
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_tk11_EnterPlay.ogg"],
      ["SFX_EX1_tk11_Attack.ogg"],
      ["SFX_EX1_tk11_Death.ogg"],
    ),
  },
  // --- Mana Crystal cards ---
  "wild-growth": {
    title: "Wild Growth",
    description: "Gain an empty Mana Crystal.",
    baseMana: 2,
    type: ["Nature"],
    imageUrl: "assets/cards/Wild_Growth.jpg",
    // At full crystals the grant would be wasted, so it draws instead.
    effects: [
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: { type: "player-max-mana", player: "friendly" },
            operator: ">=",
            value: { type: "player-mana-cap", player: "friendly" },
          },
        ],
        then: [addToHand("excess-mana")],
        else: [manaCrystal(1)],
      },
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
  },
  "excess-mana": {
    title: "Excess Mana",
    description: "Draw 4 cards.",
    baseMana: 0,
    type: ["Nature"],
    imageUrl: "assets/cards/Excess_Mana.jpg",
    effects: [draw(4)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    isUncollectible: true,
    class: "Druid",
    set: ["Legacy"],
  },
  felguard: {
    title: "Felguard",
    description: "Taunt. Battlecry: Destroy one of your Mana Crystals.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 5,
    taunt: true,
    type: ["Demon"],
    tags: ["Taunt", "Battlecry"],
    imageUrl: "assets/cards/Felguard.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [destroyManaCrystal(1)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Warlock",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_301_Play_01.ogg"],
      ["VO_EX1_301_Attack_02.ogg"],
      ["VO_EX1_301_Death_03.ogg"],
    ),
  },

  // ------------------------------------------------------------------ //
  // Legacy set fill-in (no secrets / discover / choose-one / triggers) //
  // ------------------------------------------------------------------ //

  // --- Mage ---
  pyroblast: {
    title: "Pyroblast",
    description: "Deal 10 damage.",
    baseMana: 10,
    type: ["Fire"],
    imageUrl: "assets/cards/Pyroblast.jpg",
    effects: [damage(10)],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    rarity: "Epic",
    class: "Mage",
    set: ["Legacy"],
  },
  "cone-of-cold": {
    title: "Cone of Cold",
    description:
      "Freeze a minion and the minions next to it, and deal 1 damage to them.",
    baseMana: 3,
    type: ["Frost"],
    tags: ["Freeze"],
    imageUrl: "assets/cards/Cone_of_Cold.jpg",
    effects: [
      damage(1),
      freeze(),
      damage(1, "adjacent-target"),
      freeze("adjacent-target"),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Mage",
    set: ["Legacy"],
  },

  // --- Druid ---
  swipe: {
    title: "Swipe",
    description: "Deal 4 damage to an enemy and 1 damage to all other enemies.",
    baseMana: 3,
    type: ["Nature"],
    imageUrl: "assets/cards/Swipe.jpg",
    effects: [
      damage(4),
      {
        type: "damage",
        value: 1,
        target: "enemy-all",
        conditions: [{ type: "exclude-target" }],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Druid",
    set: ["Legacy"],
  },

  // --- Hunter ---
  "hunters-mark": {
    title: "Hunter's Mark",
    description: "Change a minion's Health to 1.",
    baseMana: 1,
    imageUrl: "assets/cards/Hunter's_Mark.jpg",
    effects: [applyModifier({ stats: { health: 1 }, override: true })],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    class: "Hunter",
    set: ["Legacy"],
  },
  "animal-companion": {
    title: "Animal Companion",
    description: "Summon a random Beast Companion.",
    baseMana: 3,
    imageUrl: "assets/cards/Animal_Companion.jpg",
    effects: [summon(["huffer", "leokk", "misha"])],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    class: "Hunter",
    set: ["Legacy"],
  },
  "kill-command": {
    title: "Kill Command",
    description:
      "Deal 3 damage. If you control a Beast, deal 5 damage instead.",
    baseMana: 3,
    imageUrl: "assets/cards/Kill_Command.jpg",
    effects: [
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: {
              type: "minion-count",
              side: "friendly",
              conditions: [{ type: "tags-include", value: "Beast" }],
            },
            operator: ">",
            value: 0,
          },
        ],
        then: [damage(5, "user-select")],
        else: [damage(3, "user-select")],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Hunter",
    set: ["Legacy"],
  },
  "unleash-the-hounds": {
    title: "Unleash the Hounds",
    description: "For each enemy minion, summon a 1/1 Hound with Charge.",
    baseMana: 3,
    imageUrl: "assets/cards/Unleash_the_Hounds.jpg",
    effects: [summon("hound", "self", { type: "minion-count", side: "enemy" })],
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
  },
  "tundra-rhino": {
    title: "Tundra Rhino",
    description: "Your Beasts have Charge.",
    baseMana: 5,
    baseAttack: 2,
    baseHealth: 5,
    charge: true,
    type: ["Beast"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Tundra_Rhino.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        keys: { charge: true },
        target: "friendly-board",
        conditions: [{ type: "tags-include", value: "Beast" }],
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
      ["SFX_DS1_178_EnterPlay.ogg"],
      ["SFX_DS1_178_Attack.ogg"],
      ["SFX_DS1_178_Death.ogg"],
    ),
  },
  huffer: {
    title: "Huffer",
    description: "Charge.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 2,
    charge: true,
    type: ["Beast"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Huffer.jpg",
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
      ["SFX_NEW1_034_EnterPlay.ogg"],
      ["SFX_NEW1_034_Attack.ogg"],
      ["SFX_NEW1_034_Death.ogg"],
    ),
  },
  leokk: {
    title: "Leokk",
    description: "Your other minions have +1 Attack.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 4,
    type: ["Beast"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Leokk.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { attack: 1 },
        target: "friendly-board",
        conditions: [{ type: "exclude-self" }],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    isUncollectible: true,
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_NEW1_033_EnterPlay.ogg"],
      ["SFX_NEW1_033_Attack.ogg"],
      ["SFX_NEW1_033_Death.ogg"],
    ),
  },
  misha: {
    title: "Misha",
    description: "Taunt.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 4,
    taunt: true,
    type: ["Beast"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Misha.jpg",
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
      ["SFX_NEW1_032_EnterPlay.ogg"],
      ["SFX_NEW1_032_Attack.ogg"],
      ["SFX_NEW1_032_Death.ogg"],
    ),
  },
  hound: {
    title: "Hound",
    description: "Charge.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    charge: true,
    type: ["Beast"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Unleash_the_Hounds.jpg",
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
      ["SFX_EX1_538t_EnterPlay.ogg"],
      ["SFX_EX1_538t_Attack.ogg"],
      ["SFX_EX1_538t_Death.ogg"],
    ),
  },

  // --- Paladin ---
  "blessing-of-might": {
    title: "Blessing of Might",
    description: "Give a minion +3 Attack.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Blessing_of_Might.jpg",
    effects: [applyModifier({ stats: { attack: 3 } })],
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
  humility: {
    title: "Humility",
    description: "Change a minion's Attack to 1.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Humility.jpg",
    effects: [applyModifier({ stats: { attack: 1 }, override: true })],
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
  equality: {
    title: "Equality",
    description: "Change the Health of ALL minions to 1.",
    baseMana: 2,
    type: ["Holy"],
    imageUrl: "assets/cards/Equality.jpg",
    effects: [
      applyModifier({ stats: { health: 1 }, override: true, target: "board" }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Paladin",
    set: ["Legacy"],
  },
  "aldor-peacekeeper": {
    title: "Aldor Peacekeeper",
    description: "Battlecry: Change an enemy minion's Attack to 1.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Draenei"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Aldor_Peacekeeper.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier({ stats: { attack: 1 }, override: true })],
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
    class: "Paladin",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_382_Play_01.ogg"],
      ["VO_EX1_382_Attack_02.ogg"],
      ["VO_EX1_382_Death_03-01.ogg"],
    ),
  },
  "blessed-champion": {
    title: "Blessed Champion",
    description: "Double a minion's Attack.",
    baseMana: 5,
    type: ["Holy"],
    imageUrl: "assets/cards/Blessed_Champion.jpg",
    effects: [
      {
        type: "storeVar",
        target: "user-select",
        value: { type: "card-stat", stat: "attack" },
      },
      applyModifier({ stats: { attack: { type: "temp" } } }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Rare",
    class: "Paladin",
    set: ["Legacy"],
  },

  // --- Priest ---
  "divine-spirit": {
    title: "Divine Spirit",
    description: "Double a minion's Health.",
    baseMana: 2,
    type: ["Holy"],
    imageUrl: "assets/cards/Divine_Spirit.jpg",
    effects: [
      {
        type: "storeVar",
        target: "user-select",
        value: { type: "card-stat", stat: "health" },
      },
      applyModifier({ stats: { health: { type: "temp" } } }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
  },
  "inner-fire": {
    title: "Inner Fire",
    description: "Change a minion's Attack to be equal to its Health.",
    baseMana: 1,
    imageUrl: "assets/cards/Inner_Fire.jpg",
    effects: [
      {
        type: "storeVar",
        target: "user-select",
        value: { type: "card-stat", stat: "health" },
      },
      applyModifier({ stats: { attack: { type: "temp" } }, override: true }),
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
  },

  // --- Rogue ---
  "defias-ringleader": {
    title: "Defias Ringleader",
    description: "Combo: Summon a 2/1 Defias Bandit.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    tags: ["Combo"],
    imageUrl: "assets/cards/Defias_Ringleader.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [combo([summon("defias-bandit")])],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_131_Play_01.ogg"],
      ["VO_EX1_131_Attack_02.ogg"],
      ["VO_EX1_131_Death_03.ogg"],
    ),
  },
  "defias-bandit": {
    title: "Defias Bandit",
    description: "",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    imageUrl: "assets/cards/Defias_Bandit.jpg",
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
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_131t_Play_01.ogg"],
      ["VO_EX1_131t_Attack_02.ogg"],
      ["VO_EX1_131t_Death_03.ogg"],
    ),
  },
  "si-7-agent": {
    title: "SI:7 Agent",
    description: "Combo: Deal 3 damage.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    tags: ["Combo"],
    imageUrl: "assets/cards/SI7_Agent.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [combo([damage(3, "user-select", true)])],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_134_Play_01.ogg"],
      ["VO_EX1_134_Attack_02.ogg"],
      ["VO_EX1_134_Death_03.ogg"],
    ),
  },
  "master-of-disguise": {
    title: "Master of Disguise",
    description:
      "Battlecry: Give a friendly minion Stealth until your next turn.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Master_of_Disguise.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        keys: { stealth: true },
        duration: {
          expiryTrigger: "START_OF_TURN",
          expiryOwner: "BUFF_CASTER",
          turnsRemaining: 1,
        },
      }),
    ],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_014_Play_01.ogg"],
      ["VO_NEW1_014_Attack_02.ogg"],
      ["VO_NEW1_014_Death_03.ogg"],
    ),
  },
  kidnapper: {
    title: "Kidnapper",
    description: "Combo: Return a minion to its owner's hand.",
    baseMana: 6,
    baseAttack: 5,
    baseHealth: 3,
    type: ["Undead"],
    tags: ["Combo"],
    imageUrl: "assets/cards/Kidnapper.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [combo([returnToHand("user-select")])],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_005_Play_01.ogg"],
      ["VO_NEW1_005_Attack_02.ogg"],
      ["VO_NEW1_005_Death_03.ogg"],
    ),
  },

  // --- Shaman ---
  "frost-shock": {
    title: "Frost Shock",
    description: "Deal 1 damage to an enemy character and Freeze it.",
    baseMana: 1,
    type: ["Frost"],
    tags: ["Freeze"],
    imageUrl: "assets/cards/Frost_Shock.jpg",
    effects: [damage(1), freeze()],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: false,
    class: "Shaman",
    set: ["Legacy"],
  },
  "flametongue-totem": {
    title: "Flametongue Totem",
    description: "Adjacent minions have +2 Attack.",
    baseMana: 2,
    baseAttack: 0,
    baseHealth: 3,
    type: ["Totem"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Flametongue_Totem.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [applyModifier({ stats: { attack: 2 }, target: "adjacent" })],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_565_Play_FlametongueTotem.ogg"],
      ["SFX_EX1_565_Attack_00.ogg"],
      ["EX1_565_Death_FlameTongueTotem.ogg"],
    ),
  },

  // --- Warrior ---
  "arathi-weaponsmith": {
    title: "Arathi Weaponsmith",
    description: "Battlecry: Equip a 2/2 weapon.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Arathi_Weaponsmith.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      {
        type: "equip",
        cardID: "battle-axe",
        target: "self",
      },
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Warrior",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_398_Play_01.ogg"],
      ["VO_EX1_398_Attack_02.ogg"],
      ["VO_EX1_398_Death_03.ogg"],
    ),
  },
  "battle-axe": {
    title: "Battle Axe",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 1,
    baseAttack: 2,
    baseDurability: 2,
    imageUrl: "assets/cards/Battle_Axe.jpg",
    class: "Warrior",
    effects: [],
    onPlace: [],
    isUncollectible: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  brawl: {
    title: "Brawl",
    description: "Destroy all minions except one. (chosen randomly)",
    baseMana: 5,
    imageUrl: "assets/cards/Brawl.jpg",
    effects: [
      {
        type: "destroy",
        target: "board",
        rand: { split: false, n: -1 },
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
    class: "Warrior",
    set: ["Legacy"],
  },

  // --- Warlock ---
  "summoning-portal": {
    title: "Summoning Portal",
    description: "Your minions cost (2) less, but not less than (1).",
    baseMana: 4,
    baseAttack: 0,
    baseHealth: 4,
    tags: ["Aura"],
    imageUrl: "assets/cards/Summoning_Portal.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { mana: -2 },
        target: "friendly-hand",
        conditions: [{ type: "boolean", key: "isMinion", value: true }],
        min: 1,
      }),
    ],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Warlock",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_315_EnterPlay_00.ogg"],
      ["SFX_EX1_315_Attack_00.ogg"],
      ["SFX_EX1_315_Death_00.ogg"],
    ),
  },
  "bane-of-doom": {
    title: "Bane of Doom",
    description:
      "Deal 3 damage to a minion. If it dies, summon a random Demon.",
    baseMana: 5,
    type: ["Shadow"],
    imageUrl: "assets/cards/Bane_of_Doom.jpg",
    effects: [
      damage(3),
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: { type: "card-stat", stat: "health" },
            operator: "<",
            value: 1,
          },
        ],
        then: [
          summon(undefined, "self", 1, [
            { type: "tags-include", value: "Demon" },
          ]),
        ],
      },
    ],
    onPlace: [],
    isSpell: true,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    isMinion: false,
    rarity: "Epic",
    class: "Warlock",
    set: ["Legacy"],
  },

  // --- Neutral ---
  "grimscale-oracle": {
    title: "Grimscale Oracle",
    description: "Your other Murlocs have +1 Attack.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Murloc"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Grimscale_Oracle.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { attack: 1 },
        target: "friendly-board",
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
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_508_Grimscale_Oracle_EnterPlay1.ogg"],
      ["EX1_508_Grimscale_Oracle_Attack2.ogg"],
      ["EX1_508_Grimscale_Oracle_Death2.ogg"],
    ),
  },
  "stonetusk-boar": {
    title: "Stonetusk Boar",
    description: "Charge.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    charge: true,
    type: ["Beast"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Stonetusk_Boar.jpg",
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
      ["SFX_CS2_171_EnterPlay.ogg"],
      ["SFX_CS2_171_Attack.ogg"],
      ["SFX_CS2_171_Death.ogg"],
    ),
  },
  "angry-chicken": {
    title: "Angry Chicken",
    description: "Has +5 Attack while damaged.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Beast"],
    tags: ["Enrage"],
    imageUrl: "assets/cards/Angry_Chicken.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    enrage: [applyModifier({ stats: { attack: 5 }, target: "self" })],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_009_EnterPlay.ogg"],
      ["SFX_EX1_009_Attack.ogg"],
      ["SFX_EX1_009_Death.ogg"],
    ),
  },
  shieldbearer: {
    title: "Shieldbearer",
    description: "Taunt.",
    baseMana: 1,
    baseAttack: 0,
    baseHealth: 4,
    taunt: true,
    type: ["Draenei"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Shieldbearer.jpg",
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
      ["VO_EX1_405_Play_01.ogg"],
      ["VO_EX1_405_Attack_02.ogg"],
      ["VO_EX1_405_Death_03.ogg"],
    ),
  },
  "worgen-infiltrator": {
    title: "Worgen Infiltrator",
    description: "Stealth.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    stealth: true,
    tags: ["Stealth"],
    imageUrl: "assets/cards/Worgen_Infiltrator.jpg",
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
      ["VO_EX1_010_Play_01.ogg"],
      ["VO_EX1_010_Attack_02.ogg"],
      ["VO_EX1_010_Death_03.ogg"],
    ),
  },
  "young-dragonhawk": {
    title: "Young Dragonhawk",
    description: "Windfury.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    windfury: true,
    type: ["Beast"],
    tags: ["Windfury"],
    imageUrl: "assets/cards/Young_Dragonhawk.jpg",
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
      [
        "CS2_169_Young_Dragonhawk_EnterPlay1.ogg",
        "WingedMount1_Play_Underlay.ogg",
      ],
      [
        "CS2_169_Young_Dragonhawk_Attack1.ogg",
        "WingedMount1_Attack_Underlay.ogg",
      ],
      [
        "CS2_169_Young_Dragonhawk_Death1.ogg",
        "WingedMount1_Death_Underlay.ogg",
      ],
    ),
  },
  "hungry-crab": {
    title: "Hungry Crab",
    description: "Battlecry: Destroy a Murloc and gain +2/+2.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Beast"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Hungry_Crab.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      destroy("user-select"),
      applyModifier({ stats: { attack: 2, health: 2 }, target: "self" }),
    ],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [{ type: "tags-include", value: "Murloc" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["NEW1_017_Hungry_Crab_EnterPlay1.ogg"],
      ["NEW1_017_Hungry_Crab_Attack1.ogg"],
      ["NEW1_017_Hungry_Crab_Death3.ogg"],
    ),
  },
  "bloodmage-thalnos": {
    title: "Bloodmage Thalnos",
    description: "Spell Damage +1. Deathrattle: Draw a card.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Undead"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Bloodmage_Thalnos.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true,
    deathrattle: [draw(1)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_012_Play_01.ogg", "Pegasus_Stinger_Undead1.ogg"],
      ["VO_EX1_012_Attack_02.ogg"],
      ["VO_EX1_012_Death_03.ogg"],
    ),
  },
  "sunfury-protector": {
    title: "Sunfury Protector",
    description: "Battlecry: Give adjacent minions Taunt.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Sunfury_Protector.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [applyModifier({ keys: { taunt: true }, target: "adjacent" })],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_058_Play_01.ogg"],
      ["VO_EX1_058_Attack_02.ogg"],
      ["VO_EX1_058_Death_03.ogg"],
    ),
  },
  "youthful-brewmaster": {
    title: "Youthful Brewmaster",
    description:
      "Battlecry: Return a friendly minion from the battlefield to your hand.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Youthful_Brewmaster.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [returnToHand("user-select")],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_049_Play_01.ogg"],
      ["VO_EX1_049_Attack_02.ogg"],
      ["VO_EX1_049_Death_03.ogg"],
    ),
  },
  "dalaran-mage": {
    title: "Dalaran Mage",
    description: "Spell Damage +1",
    baseMana: 3,
    baseAttack: 1,
    baseHealth: 4,
    imageUrl: "assets/cards/Dalaran_Mage.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_582_Play_01.ogg"],
      ["VO_EX1_582_Attack_02.ogg"],
      ["VO_EX1_582_Death_03.ogg"],
    ),
  },
  "harvest-golem": {
    title: "Harvest Golem",
    description: "Deathrattle: Summon a 2/1 Damaged Golem.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    type: ["Mech"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Harvest_Golem.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [summon("damaged-golem")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_556_EnterPlay.ogg"],
      ["SFX_EX1_556_Attack.ogg"],
      ["SFX_EX1_556_Death.ogg"],
    ),
  },
  "damaged-golem": {
    title: "Damaged Golem",
    description: "",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    type: ["Mech"],
    imageUrl: "assets/cards/Damaged_Golem.jpg",
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
      ["SFX_skele21_EnterPlay.ogg"],
      ["SFX_skele21_Attack.ogg"],
      ["SFX_skele21_Death.ogg"],
    ),
  },
  "injured-blademaster": {
    title: "Injured Blademaster",
    description: "Battlecry: Deal 4 damage to HIMSELF.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 7,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Injured_Blademaster.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [damage(4, "self")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_181_Play_01.ogg"],
      ["VO_CS2_181_Attack_02.ogg"],
      ["VO_CS2_181_Death_03.ogg"],
    ),
  },
  "jungle-panther": {
    title: "Jungle Panther",
    description: "Stealth.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 2,
    stealth: true,
    type: ["Beast"],
    tags: ["Stealth"],
    imageUrl: "assets/cards/Jungle_Panther.jpg",
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
      ["SFX_EX1_017_EnterPlay.ogg"],
      ["SFX_EX1_017_Attack.ogg"],
      ["SFX_EX1_017_Death.ogg"],
    ),
  },
  "raging-worgen": {
    title: "Raging Worgen",
    description: "Has +1 Attack and Windfury while damaged.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    tags: ["Enrage"],
    imageUrl: "assets/cards/Raging_Worgen.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    enrage: [
      applyModifier({
        stats: { attack: 1 },
        keys: { windfury: true },
        target: "self",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_412_EnterPlay.ogg"],
      ["SFX_EX1_412_Attack.ogg"],
      ["SFX_EX1_412_Death.ogg"],
    ),
  },
  "scarlet-crusader": {
    title: "Scarlet Crusader",
    description: "Divine Shield.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 1,
    divineShield: true,
    tags: ["Divine Shield"],
    imageUrl: "assets/cards/Scarlet_Crusader.jpg",
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
      ["VO_EX1_020_Play_01.ogg"],
      ["VO_EX1_020_Attack_02.ogg"],
      ["VO_EX1_020_Death_03.ogg"],
    ),
  },
  "tauren-warrior": {
    title: "Tauren Warrior",
    description: "Taunt. Has +3 Attack while damaged.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    taunt: true,
    tags: ["Taunt", "Enrage"],
    imageUrl: "assets/cards/Tauren_Warrior.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    enrage: [applyModifier({ stats: { attack: 3 }, target: "self" })],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_390_Play_01.ogg"],
      ["VO_EX1_390_Attack_02.ogg"],
      ["VO_EX1_390_Death_03.ogg"],
    ),
  },
  "thrallmar-farseer": {
    title: "Thrallmar Farseer",
    description: "Windfury.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    windfury: true,
    tags: ["Windfury"],
    imageUrl: "assets/cards/Thrallmar_Farseer.jpg",
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
      ["VO_EX1_021_Play_01.ogg"],
      ["VO_EX1_021_Attack_02.ogg"],
      ["VO_EX1_021_Death_03.ogg"],
    ),
  },
  "ancient-brewmaster": {
    title: "Ancient Brewmaster",
    description:
      "Battlecry: Return a friendly minion from the battlefield to your hand.",
    baseMana: 4,
    baseAttack: 5,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Ancient_Brewmaster.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [returnToHand("user-select")],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_057_Play_01.ogg"],
      ["VO_EX1_057_Attack_02.ogg"],
      ["VO_EX1_057_Death_03.ogg"],
    ),
  },
  "big-game-hunter": {
    title: "Big Game Hunter",
    description: "Battlecry: Destroy a minion with 7 or more Attack.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 2,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Big_Game_Hunter.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [destroy("user-select")],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [
        { type: "exclude-self" },
        {
          type: "numeric",
          key: { type: "card-stat", stat: "attack" },
          operator: ">=",
          value: 7,
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_005_Play_01.ogg"],
      ["VO_EX1_005_Attack_02.ogg"],
      ["VO_EX1_005_Death_03.ogg"],
    ),
  },
  "coldlight-oracle": {
    title: "Coldlight Oracle",
    description: "Battlecry: Each player draws 2 cards.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 2,
    type: ["Murloc"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Coldlight_Oracle.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [draw(2), draw(2, "enemy")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_050_Coldlight_Oracle_EnterPlay1.ogg"],
      ["EX1_050_Coldlight_Oracle_Attack1.ogg"],
      ["EX1_050_Coldlight_Oracle_Death1.ogg"],
    ),
  },
  "coldlight-seer": {
    title: "Coldlight Seer",
    description: "Battlecry: Give your other Murlocs +2 Health.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    type: ["Murloc"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Coldlight_Seer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { health: 2 },
        target: "friendly-board",
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
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_103_Coldlight_Seer_EnterPlay1.ogg"],
      ["EX1_103_Coldlight_Seer_Attack2.ogg"],
      ["EX1_103_Coldlight_Seer_Death2.ogg"],
    ),
  },
  "dark-iron-dwarf": {
    title: "Dark Iron Dwarf",
    description: "Battlecry: Give a minion +2 Attack this turn.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Dark_Iron_Dwarf.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { attack: 2 },
        duration: {
          expiryOwner: "BUFF_CASTER",
          expiryTrigger: "END_OF_TURN",
          turnsRemaining: 1,
        },
      }),
    ],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_046_Play_01.ogg"],
      ["VO_EX1_046_Attack_02.ogg"],
      ["VO_EX1_046_Death_03.ogg"],
    ),
  },
  "defender-of-argus": {
    title: "Defender of Argus",
    description: "Battlecry: Give adjacent minions +1/+1 and Taunt.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Draenei"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Defender_of_Argus.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { attack: 1, health: 1 },
        keys: { taunt: true },
        target: "adjacent",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_093_Play_01.ogg"],
      ["VO_EX1_093_Attack_02.ogg"],
      ["VO_EX1_093_Death_03.ogg"],
    ),
  },
  "earthen-ring-farseer": {
    title: "Earthen Ring Farseer",
    description: "Battlecry: Restore 3 Health.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Earthen_Ring_Farseer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [heal(3)],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_117_Play_01.ogg"],
      ["VO_CS2_117_Attack_02.ogg"],
      ["VO_CS2_117_Death_03.ogg"],
    ),
  },
  "mogushan-warden": {
    title: "Mogu'shan Warden",
    description: "Taunt.",
    baseMana: 4,
    baseAttack: 1,
    baseHealth: 7,
    taunt: true,
    tags: ["Taunt"],
    imageUrl: "assets/cards/Mogu'shan_Warden.jpg",
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
      ["VO_EX1_396_Play_01.ogg"],
      ["VO_EX1_396_Attack_02.ogg"],
      ["VO_EX1_396_Death_03.ogg"],
    ),
  },
  "silvermoon-guardian": {
    title: "Silvermoon Guardian",
    description: "Divine Shield.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 3,
    divineShield: true,
    tags: ["Divine Shield"],
    imageUrl: "assets/cards/Silvermoon_Guardian.jpg",
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
      ["VO_EX1_023_Play_01.ogg"],
      ["VO_EX1_023_Attack_02.ogg"],
      ["VO_EX1_023_Death_03.ogg"],
    ),
  },
  "twilight-drake": {
    title: "Twilight Drake",
    description: "Battlecry: Gain +1 Health for each card in your hand.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 1,
    type: ["Dragon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Twilight_Drake.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { health: 1 },
        target: "self",
        mult: { type: "hand-count", side: "friendly" },
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["WoW_EX1_043_TwilightDrake_EnterPlay.ogg"],
      ["WoW_EX1_043_TwilightDrake_Attack.ogg"],
      ["WoW_EX1_043_TwilightDrake_Death.ogg"],
    ),
  },
  "azure-drake": {
    title: "Azure Drake",
    description: "Spell Damage +1. Battlecry: Draw a card.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 5,
    type: ["Dragon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Azure_Drake.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [draw(1)],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["WoW_EX1_284_AzureDrake_EnterPlay.ogg"],
      ["WoW_EX1_284_AzureDrake_Attack.ogg"],
      ["WoW_EX1_284_AzureDrake_Death.ogg"],
    ),
  },
  "fen-creeper": {
    title: "Fen Creeper",
    description: "Taunt.",
    baseMana: 5,
    baseAttack: 3,
    baseHealth: 6,
    taunt: true,
    tags: ["Taunt"],
    imageUrl: "assets/cards/Fen_Creeper.jpg",
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
      ["SFX_CS1_069_EnterPlay.ogg"],
      ["SFX_CS1_069_Attack.ogg"],
      ["SFX_CS1_069_Death.ogg"],
    ),
  },
  "frostwolf-warlord": {
    title: "Frostwolf Warlord",
    description:
      "Battlecry: Gain +1/+1 for each other friendly minion on the battlefield.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Frostwolf_Warlord.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { attack: 1, health: 1 },
        target: "self",
        mult: {
          type: "minion-count",
          side: "friendly",
          conditions: [{ type: "exclude-self" }],
        },
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_226_Play_01.ogg"],
      ["VO_CS2_226_Attack_02.ogg"],
      ["VO_CS2_226_Death_03.ogg"],
    ),
  },
  "venture-co-mercenary": {
    title: "Venture Co. Mercenary",
    description: "Your minions cost (3) more.",
    baseMana: 5,
    baseAttack: 7,
    baseHealth: 6,
    tags: ["Aura"],
    imageUrl: "assets/cards/Venture_Co._Mercenary.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { mana: 3 },
        target: "friendly-hand",
        conditions: [{ type: "boolean", key: "isMinion", value: true }],
      }),
    ],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_227_Play_01.ogg"],
      ["VO_CS2_227_Attack_02.ogg"],
      ["VO_CS2_227_Death_03.ogg"],
    ),
  },
  "mana-wraith": {
    title: "Mana Wraith",
    description: "ALL minions cost (1) more.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    tags: ["Aura"],
    imageUrl: "assets/cards/Mana_Wraith.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { mana: 1 },
        target: "friendly-hand",
        conditions: [{ type: "boolean", key: "isMinion", value: true }],
      }),
      applyModifier({
        stats: { mana: 1 },
        target: "enemy-hand",
        conditions: [{ type: "boolean", key: "isMinion", value: true }],
      }),
    ],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_616_Mana_Wraith_EnterPlay1.ogg"],
      ["EX1_616_Mana_Wraith_Attack2.ogg"],
      ["EX1_616_Mana_Wraith_Death2.ogg"],
    ),
  },
  "stranglethorn-tiger": {
    title: "Stranglethorn Tiger",
    description: "Stealth.",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 5,
    stealth: true,
    type: ["Beast"],
    tags: ["Stealth"],
    imageUrl: "assets/cards/Stranglethorn_Tiger.jpg",
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
      ["SFX_EX1_028_EnterPlay.ogg"],
      ["SFX_EX1_028_Attack.ogg"],
      ["SFX_EX1_028_Death.ogg"],
    ),
  },
  archmage: {
    title: "Archmage",
    description: "Spell Damage +1",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 7,
    imageUrl: "assets/cards/Archmage.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(1)],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_155_Play_01.ogg"],
      ["VO_CS2_155_Attack_02.ogg"],
      ["VO_CS2_155_Death_03.ogg"],
    ),
  },
  "argent-commander": {
    title: "Argent Commander",
    description: "Charge. Divine Shield.",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 2,
    charge: true,
    divineShield: true,
    tags: ["Charge", "Divine Shield"],
    imageUrl: "assets/cards/Argent_Commander.jpg",
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
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_067_Play_01.ogg"],
      ["VO_EX1_067_Attack_02.ogg"],
      ["VO_EX1_067_Death_03.ogg"],
    ),
  },
  "priestess-of-elune": {
    title: "Priestess of Elune",
    description: "Battlecry: Restore 4 Health to your hero.",
    baseMana: 6,
    baseAttack: 5,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Priestess_of_Elune.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [heal(4, "friendly-hero")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_583_Play_01.ogg"],
      ["VO_EX1_583_Attack_02.ogg"],
      ["VO_EX1_583_Death_03.ogg"],
    ),
  },
  "windfury-harpy": {
    title: "Windfury Harpy",
    description: "Windfury.",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 5,
    windfury: true,
    tags: ["Windfury"],
    imageUrl: "assets/cards/Windfury_Harpy.jpg",
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
      ["SFX_EX1_033_EnterPlay.ogg", "FrostMagic_Play_Underlay.ogg"],
      ["SFX_EX1_033_Attack.ogg", "FrostMagic_Attack_Underlay.ogg"],
      ["SFX_EX1_033_Death.ogg", "FrostMagic_Death_Underlay.ogg"],
    ),
  },
  "ravenholdt-assassin": {
    title: "Ravenholdt Assassin",
    description: "Stealth.",
    baseMana: 7,
    baseAttack: 7,
    baseHealth: 5,
    stealth: true,
    tags: ["Stealth"],
    imageUrl: "assets/cards/Ravenholdt_Assassin.jpg",
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
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_161_Play_01.ogg"],
      ["VO_CS2_161_Attack_02.ogg"],
      ["VO_CS2_161_Death_03.ogg"],
    ),
  },
  "sea-giant": {
    title: "Sea Giant",
    description: "Costs (1) less for each other minion on the battlefield.",
    baseMana: 10,
    baseAttack: 8,
    baseHealth: 8,
    imageUrl: "assets/cards/Sea_Giant.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    inHand: [
      applyModifier({
        stats: { mana: -1 },
        target: "self",
        mult: { type: "minion-count", side: "all", mult: 0.5 },
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_586_EnterPlay.ogg"],
      ["SFX_EX1_586_Attack.ogg"],
      ["SFX_EX1_586_Death.ogg"],
    ),
  },
  "mountain-giant": {
    title: "Mountain Giant",
    description: "Costs (1) less for each card in your hand.",
    baseMana: 12,
    baseAttack: 8,
    baseHealth: 8,
    type: ["Elemental"],
    imageUrl: "assets/cards/Mountain_Giant.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    inHand: [
      applyModifier({
        stats: { mana: -1 },
        target: "self",
        mult: { type: "hand-count", side: "friendly" },
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_105_Mountain_Giant_EnterPlay3.ogg"],
      ["EX1_105_Mountain_Giant_Attack1.ogg"],
      ["EX1_105_Mountain_Giant_Death1.ogg"],
    ),
  },
  deathwing: {
    title: "Deathwing",
    description: "Battlecry: Destroy all other minions and discard your hand.",
    baseMana: 10,
    baseAttack: 12,
    baseHealth: 12,
    type: ["Dragon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Deathwing.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      {
        type: "destroy",
        target: "board",
        conditions: [{ type: "exclude-self" }],
      },
      discard(10, "all"),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_030_Play_01.ogg", "Pegasus_Stinger_Deathwing3.ogg"],
      ["VO_NEW1_030_Attack_02.ogg"],
      ["VO_NEW1_030_Death_03.ogg"],
    ),
  },
  onyxia: {
    title: "Onyxia",
    description:
      "Battlecry: Summon 1/1 Whelps until your side of the battlefield is full.",
    baseMana: 9,
    baseAttack: 8,
    baseHealth: 8,
    type: ["Dragon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Onyxia.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("whelp", "self", 6)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_562_Play_01.ogg", "Pegasus_Stinger_Deathwing.ogg"],
      ["VO_EX1_562_Attack_03.ogg"],
      ["VO_EX1_562_Death_04.ogg"],
    ),
  },
  whelp: {
    title: "Whelp",
    description: "",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Dragon"],
    imageUrl: "assets/cards/Whelp.jpg",
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
      ["CS2_169_Young_Dragonhawk_EnterPlay1.ogg"],
      ["CS2_169_Young_Dragonhawk_Attack1.ogg"],
      ["CS2_169_Young_Dragonhawk_Death1.ogg"],
    ),
  },
  malygos: {
    title: "Malygos",
    description: "Spell Damage +5",
    baseMana: 9,
    baseAttack: 4,
    baseHealth: 12,
    type: ["Dragon"],
    imageUrl: "assets/cards/Malygos.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [spellDamageAura(5)],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_563_Play_01.ogg", "Pegasus_Stinger_Neutral1.ogg"],
      ["VO_EX1_563_Attack_02.ogg"],
      ["VO_EX1_563_Death_03.ogg"],
    ),
  },
  "leeroy-jenkins": {
    title: "Leeroy Jenkins",
    description: "Charge. Battlecry: Summon two 1/1 Whelps for your opponent.",
    baseMana: 5,
    baseAttack: 6,
    baseHealth: 2,
    charge: true,
    tags: ["Charge", "Battlecry"],
    imageUrl: "assets/cards/Leeroy_Jenkins.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [summon("whelp", "enemy", 2)],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_116_Play_01.ogg", "Pegasus_Stinger_Leeroy_Jenkins.ogg"],
      ["VO_EX1_116_Attack_02.ogg"],
      ["VO_EX1_116_Death_03.ogg"],
    ),
  },
  "the-black-knight": {
    title: "The Black Knight",
    description: "Battlecry: Destroy an enemy minion with Taunt.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 4,
    type: ["Undead"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/The_Black_Knight.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [destroy("user-select")],
    battlecryQuery: {
      side: "enemy",
      type: ["card"],
      conditions: [{ type: "boolean", key: "taunt", value: true }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_002_Play_01.ogg", "Pegasus_Stinger_Undead2.ogg"],
      ["VO_EX1_002_Attack_02.ogg"],
      ["VO_EX1_002_Death_03.ogg"],
    ),
  },
  "old-murk-eye": {
    title: "Old Murk-Eye",
    description:
      "Charge. Has +1 Attack for each other Murloc on the battlefield.",
    baseMana: 4,
    baseAttack: 2,
    baseHealth: 4,
    charge: true,
    type: ["Murloc"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Old_Murk-Eye.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { attack: 1 },
        target: "self",
        mult: {
          type: "minion-count",
          side: "all",
          conditions: [
            { type: "tags-include", value: "Murloc" },
            { type: "exclude-self" },
          ],
        },
      }),
    ],
    hideAuraGlow: true,
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      [
        "EX1_062_Old_Murk_Eye_EnterPlay1.ogg",
        "Pegasus_Stinger_Beast_Villain.ogg",
      ],
      ["EX1_062_Old_Murk_Eye_Attack1.ogg"],
      ["EX1_062_Old_Murk_Eye_Death1.ogg"],
    ),
  },
  "captain-greenskin": {
    title: "Captain Greenskin",
    description: "Battlecry: Give your weapon +1/+1.",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 4,
    type: ["Pirate"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Captain_Greenskin.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      applyModifier({
        stats: { attack: 1, durability: 1 },
        target: "friendly-weapon",
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_024_Play_01.ogg", "Pegasus_Stinger_Gnome.ogg"],
      ["VO_NEW1_024_Attack_02.ogg"],
      ["VO_NEW1_024_Death_03.ogg"],
    ),
  },
  "emerald-skytalon": {
    title: "Emerald Skytalon",
    description: "Rush",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    rush: true,
    type: ["Beast", "Elemental"],
    tags: ["Rush"],
    imageUrl: "assets/cards/Emerald_Skytalon.jpg",
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
      ["UNG_801_NestingRoc_Play.ogg", "WingFlapMedium_Underlay_Play.ogg"],
      ["UNG_801_NestingRoc_Attack.ogg", "WingFlapMedium_Underlay_Attack.ogg"],
      ["UNG_801_NestingRoc_Death.ogg", "WingFlapMedium_Underlay_Death.ogg"],
    ),
  },
  "bloodsail-corsair": {
    title: "Bloodsail Corsair",
    description: "Battlecry: Remove 1 Durability from your opponent's weapon.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Pirate"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Bloodsail_Corsair.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // Chips the equipped enemy weapon; the durability handler no-ops when the
    // opponent has none, and breaks the weapon if this was its last charge.
    onPlace: [durability(-1, "enemy-weapon")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_025_Play_01.ogg"],
      ["VO_NEW1_025_Attack_02.ogg"],
      ["VO_NEW1_025_Death_03.ogg"],
    ),
  },
  "acidic-swamp-ooze": {
    title: "Acidic Swamp Ooze",
    description: "Battlecry: Destroy your opponent's weapon.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Acidic_Swamp_Ooze.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // No "destroy weapon" effect exists, so drain more durability than any
    // weapon can have — getCurrentDurability drops to <= 0 and it breaks.
    onPlace: [durability(-99, "enemy-weapon")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_066_AcidicSwampOoze_EnterPlay.ogg"],
      ["EX1_066_AcidicSwampOoze_Attack.ogg"],
      ["EX1_066_AcidicSwampOoze_Death.ogg"],
    ),
  },
  "patient-assassin": {
    title: "Patient Assassin",
    description: "Stealth. Poisonous.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 1,
    stealth: true,
    poisonous: true,
    tags: ["Stealth", "Poisonous"],
    imageUrl: "assets/cards/Patient_Assassin.jpg",
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
    rarity: "Epic",
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_522_Play_01.ogg"],
      ["VO_EX1_522_Attack_02.ogg"],
      ["VO_EX1_522_Death_03.ogg"],
    ),
  },
  "arcane-golem": {
    title: "Arcane Golem",
    description: "Charge. Battlecry: Give your opponent a Mana Crystal.",
    baseMana: 3,
    baseAttack: 4,
    baseHealth: 2,
    charge: true,
    tags: ["Charge", "Battlecry"],
    imageUrl: "assets/cards/Arcane_Golem.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // An EMPTY crystal: the opponent's maximum mana grows, but it only fills
    // on their next turn (same mode Wild Growth uses).
    onPlace: [manaCrystal(1, false, "enemy")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_089_Arcane_Golem_EnterPlay2.ogg"],
      ["EX1_089_Arcane_Golem_Attack5.ogg"],
      ["EX1_089_Arcane_Golem_Death4.ogg"],
    ),
  },
  "emperor-cobra": {
    title: "Emperor Cobra",
    description: "Poisonous",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    poisonous: true,
    type: ["Beast"],
    tags: ["Poisonous"],
    imageUrl: "assets/cards/Emperor_Cobra.jpg",
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
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_170_Emperor_Cobra_EnterPlay1.ogg"],
      ["EX1_170_Emperor_Cobra_Attack1.ogg"],
      ["EX1_170_Emperor_Cobra_Death2.ogg"],
    ),
  },
  "southsea-captain": {
    title: "Southsea Captain",
    description: "Your other Pirates have +1/+1.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Pirate"],
    tags: ["Aura"],
    imageUrl: "assets/cards/Southsea_Captain.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    aura: [
      applyModifier({
        stats: { attack: 1, health: 1 },
        target: "friendly-board",
        conditions: [
          { type: "tags-include", value: "Pirate" },
          { type: "exclude-self" },
        ],
      }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_027_Play_01.ogg"],
      ["VO_NEW1_027_Attack_02.ogg"],
      ["VO_NEW1_027_Death_03.ogg"],
    ),
  },
  plaguebringer: {
    title: "Plaguebringer",
    description: "Battlecry: Give a friendly minion Poisonous.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 3,
    type: ["Undead"],
    tags: ["Battlecry", "Poisonous"],
    imageUrl: "assets/cards/Plaguebringer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [poisonous("user-select", true)],
    battlecryQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Rogue",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_191_Male_Undead_Play_01.ogg", "Potion_Underlay_Play_01.ogg"],
      ["VO_EX1_191_Male_Undead_Attack_01.ogg", "Potion_Underlay_Attack.ogg"],
      ["VO_EX1_191_Male_Undead_Death_01.ogg", "Potion_Underlay_Play_01.ogg"],
    ),
  },
  abomination: {
    title: "Abomination",
    description: "Taunt. Deathrattle: Deal 2 damage to ALL characters.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 4,
    taunt: true,
    type: ["Undead"],
    tags: ["Taunt", "Deathrattle"],
    imageUrl: "assets/cards/Abomination.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    // "ALL characters" = every minion plus both heroes. There is no single
    // target covering heroes and minions on both sides, so it's three passes.
    deathrattle: [
      damage(2, "board"),
      damage(2, "friendly-hero"),
      damage(2, "enemy-hero"),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_097_Play_01.ogg"],
      ["VO_EX1_097_Attack_02.ogg"],
      ["VO_EX1_097_Death_03.ogg"],
    ),
  },
  "stampeding-kodo": {
    title: "Stampeding Kodo",
    description:
      "Battlecry: Destroy a random enemy minion with 2 or less Attack.",
    baseMana: 5,
    baseAttack: 3,
    baseHealth: 5,
    type: ["Beast"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Stampeding_Kodo.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      {
        type: "destroy",
        target: "enemy-board",
        conditions: [
          {
            type: "numeric",
            key: { type: "card-stat", stat: "attack" },
            operator: "<=",
            value: 2,
          },
        ],
        rand: { split: false, n: 1 },
      },
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["KotoBeastReady1.ogg"],
      ["KotoBeastYes1.ogg"],
      ["KodoBeastDeath.ogg"],
    ),
  },
  "cairne-bloodhoof": {
    title: "Cairne Bloodhoof",
    description: "Deathrattle: Summon a 4/5 Baine Bloodhoof.",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 5,
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Cairne_Bloodhoof.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [summon("baine-bloodhoof")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_110_Play_01.ogg", "Pegasus_Stinger_Horde2.ogg"],
      ["VO_EX1_110_Attack_02.ogg"],
      ["VO_EX1_110_Death_03.ogg"],
    ),
  },
  "baine-bloodhoof": {
    title: "Baine Bloodhoof",
    description: "",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 5,
    imageUrl: "assets/cards/Baine_Bloodhoof.jpg",
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
      ["VO_EX1_110t_Play_01.ogg"],
      ["VO_EX1_110t_Attack_02.ogg"],
      ["VO_EX1_110t_Death_03.ogg"],
    ),
  },
  "frost-elemental": {
    title: "Frost Elemental",
    description: "Battlecry: Freeze a character.",
    baseMana: 6,
    baseAttack: 5,
    baseHealth: 5,
    type: ["Elemental"],
    tags: ["Battlecry", "Freeze"],
    imageUrl: "assets/cards/Frost_Elemental.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [freeze("user-select", true)],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_283_EnterPlay.ogg"],
      ["SFX_EX1_283_Attack.ogg"],
      ["SFX_EX1_283_Death.ogg"],
    ),
  },
  "the-beast": {
    title: "The Beast",
    description: "Deathrattle: Summon a 3/3 Pip Quickwit for your opponent.",
    baseMana: 6,
    baseAttack: 9,
    baseHealth: 7,
    type: ["Beast"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/The_Beast.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [summon("pip-quickwit", "enemy")],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_577_The_Beast_EnterPlay1.ogg", "Pegasus_Stinger_Beast_Villain.ogg"],
      ["EX1_577_The_Beast_Attack2.ogg"],
      ["EX1_577_The_Beast_Death1.ogg"],
    ),
  },
  "pip-quickwit": {
    title: "Pip Quickwit",
    description: "",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    imageUrl: "assets/cards/Pip_Quickwit.jpg",
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
      ["VO_EX1_finkle_Play_01.ogg"],
      ["VO_EX1_finkle_Attack_02.ogg"],
      ["VO_EX1_finkle_Death_03.ogg"],
    ),
  },
  "barrens-stablehand": {
    title: "Barrens Stablehand",
    description: "Battlecry: Summon a random Beast.",
    baseMana: 7,
    baseAttack: 5,
    baseHealth: 5,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Barrens_Stablehand.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // No cardID: resolveSummonCandidates falls back to every collectible
    // minion template, filtered here down to Beasts.
    onPlace: [
      summon(undefined, "self", 1, [{ type: "tags-include", value: "Beast" }]),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_188_Male_Orc_Play_02.ogg"],
      ["VO_EX1_188_Male_Orc_Attack_02.ogg"],
      ["VO_EX1_188_Male_Orc_Death_01.ogg"],
    ),
  },
  "alexstrasza-the-life-binder": {
    title: "Alexstrasza the Life-Binder",
    description:
      "Battlecry: Choose a character. If it's friendly, restore 8 Health. If it's an enemy, deal 8 damage.",
    baseMana: 9,
    baseAttack: 8,
    baseHealth: 8,
    type: ["Dragon"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Alexstrasza_the_Life-Binder.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // `is-friendly` reads the chosen target's owner, so one battlecry covers
    // both halves — heal your own characters, burn the opponent's.
    onPlace: [
      {
        type: "conditional",
        conditions: [{ type: "is-friendly" }],
        then: [heal(8, "user-select")],
        else: [damage(8, "user-select", true)],
      },
    ],
    battlecryQuery: {
      side: "all",
      type: ["card", "player"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      [
        "VO_CS3_031_Female_Dragon_Play_01.ogg",
        "HS_LegendaryStinger_Alexstrasza.ogg",
      ],
      ["VO_CS3_031_Female_Dragon_Attack_01.ogg"],
      ["VO_CS3_031_Female_Dragon_Death_01.ogg"],
    ),
  },
  "bestial-wrath": {
    title: "Bestial Wrath",
    description: "Give a friendly Beast +2 Attack and Immune this turn.",
    baseMana: 1,
    imageUrl: "assets/cards/Bestial_Wrath.jpg",
    effects: [
      applyModifier({
        stats: { attack: 2 },
        keys: { immune: true },
        duration: {
          expiryTrigger: "END_OF_TURN",
          expiryOwner: "BUFF_CASTER",
        },
      }),
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "friendly",
      type: ["card"],
      conditions: [{ type: "tags-include", value: "Beast" }],
    },
    rarity: "Epic",
    class: "Hunter",
    set: ["Legacy"],
  },
  "tome-of-intellect": {
    title: "Tome of Intellect",
    description: "Add a random Mage spell to your hand.",
    baseMana: 1,
    type: ["Arcane"],
    imageUrl: "assets/cards/Tome_of_Intellect.jpg",
    effects: [
      addRandomCard(
        [
          { type: "boolean", key: "isSpell", value: true },
          { type: "text-contains", key: "class", value: "Mage" },
        ],
        1,
      ),
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Common",
    class: "Mage",
    set: ["Legacy"],
  },
  "southsea-deckhand": {
    title: "Southsea Deckhand",
    description: "Has Charge while you have a weapon equipped.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    type: ["Pirate"],
    tags: ["Charge"],
    imageUrl: "assets/cards/Southsea_Deckhand.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    // Self-targeting aura gated on `has-weapon`: refreshOngoing re-evaluates it
    // after every state change, so Charge appears the moment a weapon is
    // equipped and vanishes when it breaks.
    aura: [
      applyModifier({
        description: "Charge",
        keys: { charge: true },
        target: "self",
        conditions: [{ type: "has-weapon", side: "friendly" }],
      }),
    ],
    hideAuraGlow: true, // buffs only itself — nothing radiates to neighbours
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_146_Play_01.ogg"],
      ["VO_CS2_146_Attack_02.ogg"],
      ["VO_CS2_146_Death_03.ogg"],
    ),
  },
  upgrade: {
    title: "Upgrade!",
    description:
      "If you have a weapon, give it +1/+1. Otherwise equip a 1/3 weapon.",
    baseMana: 1,
    imageUrl: "assets/cards/Upgrade!.jpg",
    effects: [
      {
        type: "conditional",
        conditions: [{ type: "has-weapon", side: "friendly" }],
        // `durability` as a modifier stat raises the weapon's MAXIMUM, which is
        // what "+1/+1" means here (same shape Captain Greenskin uses).
        then: [
          applyModifier({
            stats: { attack: 1, durability: 1 },
            target: "friendly-weapon",
          }),
        ],
        else: [{ type: "equip", cardID: "heavy-axe", target: "self" }],
      },
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Rare",
    class: "Warrior",
    set: ["Legacy"],
  },
  "heavy-axe": {
    title: "Heavy Axe",
    description: "",
    isWeapon: true,
    isMinion: false,
    baseMana: 1,
    baseAttack: 1,
    baseDurability: 3,
    imageUrl: "assets/cards/Heavy_Axe.jpg",
    class: "Warrior",
    effects: [],
    onPlace: [],
    isUncollectible: true,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    set: ["Legacy"],
  },
  "mind-vision": {
    title: "Mind Vision",
    description:
      "Put a copy of a random card in your opponent's hand into your hand.",
    baseMana: 1,
    type: ["Shadow"],
    imageUrl: "assets/cards/Mind_Vision.jpg",
    // source "hand" + target "enemy-hand" reads the OPPONENT's hand; with
    // removeFromSource off, findCardsInPool hands back a fresh copy so the
    // original stays put.
    effects: [
      {
        type: "addToHand",
        source: "hand",
        target: "enemy-hand",
        removeFromSource: false,
        value: 1,
        rand: { n: 1 },
      },
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    class: "Priest",
    set: ["Legacy"],
  },
  // ---------------------------------------------------------------------
  // SILENCE
  // ---------------------------------------------------------------------
  "ironbeak-owl": {
    title: "Ironbeak Owl",
    description: "Battlecry: Silence a minion.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 1,
    type: ["Beast"],
    tags: ["Battlecry", "Silence"],
    imageUrl: "assets/cards/Ironbeak_Owl.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [silence()],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_203_EnterPlay.ogg"],
      ["SFX_CS2_203_Attack.ogg"],
      ["SFX_CS2_203_Death.ogg"],
    ),
  },
  spellbreaker: {
    title: "Spellbreaker",
    description: "Battlecry: Silence a minion.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 3,
    tags: ["Battlecry", "Silence"],
    imageUrl: "assets/cards/Spellbreaker.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [silence()],
    battlecryQuery: {
      side: "all",
      type: ["card"],
      conditions: [{ type: "exclude-self" }],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_048_Play_01.ogg"],
      ["VO_EX1_048_Attack_02.ogg"],
      ["VO_EX1_048_Death_03.ogg"],
    ),
  },
  "silence-spell": {
    title: "Silence",
    description: "Silence a minion.",
    baseMana: 0,
    type: ["Shadow"],
    imageUrl: "assets/cards/Silence.jpg",
    effects: [silence()],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
  },
  "focused-will": {
    title: "Focused Will",
    description: "Silence a minion, then give it +3 Health.",
    baseMana: 1,
    type: ["Holy"],
    imageUrl: "assets/cards/Focused_Will.jpg",
    // Order matters: the silence wipes enchantments first, so the +3 survives.
    effects: [silence(), applyModifier({ stats: { health: 3 } })],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
  },
  "mass-dispel": {
    title: "Mass Dispel",
    description: "Silence all enemy minions. Draw a card.",
    baseMana: 4,
    type: ["Shadow"],
    imageUrl: "assets/cards/Mass_Dispel.jpg",
    effects: [silence("enemy-board"), draw(1)],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
  },
  "earth-shock": {
    title: "Earth Shock",
    description: "Silence a minion, then deal 1 damage to it.",
    baseMana: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Earth_Shock.jpg",
    // Silence first — that's what lets this kill a buffed 1-health minion.
    effects: [silence(), damage(1)],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    rarity: "Common",
    class: "Shaman",
    set: ["Legacy"],
  },

  // ---------------------------------------------------------------------
  // TRANSFORM
  // ---------------------------------------------------------------------
  polymorph: {
    title: "Polymorph",
    description: "Transform a minion into a 1/1 Sheep.",
    baseMana: 4,
    type: ["Arcane"],
    imageUrl: "assets/cards/Polymorph.jpg",
    effects: [transform("sheep")],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    class: "Mage",
    set: ["Legacy"],
  },
  sheep: {
    title: "Sheep",
    description: "",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Beast"],
    imageUrl: "assets/cards/Sheep.jpg",
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
      ["SFX_CS2_tk1_EnterPlay.ogg"],
      ["SFX_CS2_tk1_Attack.ogg"],
      ["SFX_CS2_tk1_Death.ogg"],
    ),
  },
  hex: {
    title: "Hex",
    description: "Transform a minion into a 0/1 Frog with Taunt.",
    baseMana: 3,
    type: ["Nature"],
    imageUrl: "assets/cards/Hex.jpg",
    effects: [transform("frog")],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    class: "Shaman",
    set: ["Legacy"],
  },
  frog: {
    title: "Frog",
    description: "Taunt.",
    baseMana: 0,
    baseAttack: 0,
    baseHealth: 1,
    taunt: true,
    type: ["Beast"],
    tags: ["Taunt"],
    imageUrl: "assets/cards/Frog.jpg",
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
      ["SFX_HexFrog_EnterPlay.ogg"],
      ["SFX_HexFrog_Attack.ogg"],
      ["SFX_HexFrog_Death.ogg"],
    ),
  },
  "tinkmaster-overspark": {
    title: "Tinkmaster Overspark",
    description:
      "Battlecry: Transform another random minion into a 5/5 Devilsaur or a 1/1 Squirrel.",
    baseMana: 3,
    baseAttack: 3,
    baseHealth: 3,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Tinkmaster_Overspark.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // "another random minion" — either side of the board, never itself. The
    // Devilsaur/Squirrel coin flip is one roll inside the transform case.
    onPlace: [
      transform(
        ["devilsaur", "squirrel"],
        "board",
        [{ type: "exclude-self" }],
        { split: false, n: 1 },
      ),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_083_Play_01.ogg", "Pegasus_Stinger_Gnome.ogg"],
      ["VO_EX1_083_Attack_02.ogg"],
      ["VO_EX1_083_Death_03.ogg"],
    ),
  },
  devilsaur: {
    title: "Devilsaur",
    description: "",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 5,
    type: ["Beast"],
    imageUrl: "assets/cards/Devilsaur.jpg",
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
      ["SFX_EX1_tk29_EnterPlay.ogg"],
      ["SFX_EX1_tk29_Attack.ogg"],
      ["SFX_EX1_tk29_Death.ogg"],
    ),
  },
  squirrel: {
    title: "Squirrel",
    description: "",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Beast"],
    imageUrl: "assets/cards/Squirrel.jpg",
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
      ["SFX_EX1_tk28_EnterPlay.ogg"],
      ["SFX_EX1_tk28_Attack.ogg"],
      ["SFX_EX1_tk28_Death.ogg"],
    ),
  },

  // ---------------------------------------------------------------------
  // TAKE CONTROL
  // ---------------------------------------------------------------------
  "mind-control": {
    title: "Mind Control",
    description: "Take control of an enemy minion.",
    baseMana: 9,
    type: ["Shadow"],
    imageUrl: "assets/cards/Mind_Control.jpg",
    effects: [takeControl()],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "enemy",
      type: ["card"],
    },
    class: "Priest",
    set: ["Legacy"],
  },
  "cabal-shadow-priest": {
    title: "Cabal Shadow Priest",
    description:
      "Battlecry: Take control of an enemy minion that has 2 or less Attack.",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 5,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Cabal_Shadow_Priest.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [takeControl()],
    battlecryQuery: {
      side: "enemy",
      type: ["card"],
      conditions: [
        {
          type: "numeric",
          key: { type: "card-stat", stat: "attack" },
          operator: "<=",
          value: 2,
        },
      ],
    },
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Epic",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_091_Play_01.ogg"],
      ["VO_EX1_091_Attack_02.ogg"],
      ["VO_EX1_091_Death_03.ogg"],
    ),
  },
  "sylvanas-windrunner": {
    title: "Sylvanas Windrunner",
    description: "Deathrattle: Take control of a random enemy minion.",
    baseMana: 6,
    baseAttack: 5,
    baseHealth: 5,
    type: ["Undead"],
    tags: ["Deathrattle"],
    imageUrl: "assets/cards/Sylvanas_Windrunner.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [],
    deathrattle: [
      takeControl("enemy-board", undefined, { split: false, n: 1 }),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_Sylvanas_01_Play_01.ogg", "Pegasus_Stinger_Dark2.ogg"],
      ["VO_Sylvanas_02_Attack_02.ogg"],
      ["VO_Sylvanas_04_Death_04.ogg"],
    ),
  },

  // ---------------------------------------------------------------------
  // DYNAMIC VALUES
  // ---------------------------------------------------------------------
  savagery: {
    title: "Savagery",
    description: "Deal damage equal to your hero's Attack to a minion.",
    baseMana: 1,
    type: ["Nature"],
    imageUrl: "assets/cards/Savagery.jpg",
    effects: [damage({ type: "player-attack", player: "friendly" })],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["card"],
    },
    rarity: "Rare",
    class: "Druid",
    set: ["Legacy"],
  },
  "battle-rage": {
    title: "Battle Rage",
    description: "Draw a card for each damaged friendly character.",
    baseMana: 2,
    imageUrl: "assets/cards/Battle_Rage.jpg",
    // "Characters" = minions AND the hero, and there is no single count for
    // both — so: one draw per damaged friendly minion, plus one more if the
    // hero itself is hurt.
    effects: [
      draw({
        type: "minion-count",
        side: "friendly",
        conditions: [{ type: "state-match", condition: "isDamaged" }],
      }),
      {
        type: "conditional",
        conditions: [
          {
            type: "numeric",
            key: { type: "player-missing-health", player: "friendly" },
            operator: ">",
            value: 0,
          },
        ],
        then: [draw(1)],
      },
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Common",
    class: "Warrior",
    set: ["Legacy"],
  },
  "divine-favor": {
    title: "Divine Favor",
    description: "Draw cards until you have as many in hand as your opponent.",
    baseMana: 3,
    type: ["Holy"],
    imageUrl: "assets/cards/Divine_Favor.jpg",
    // hand-diff clamps at 0, so this is simply a no-op when already ahead.
    effects: [draw({ type: "hand-diff", player: "friendly" })],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Rare",
    class: "Paladin",
    set: ["Legacy"],
  },
  "harrison-jones": {
    title: "Harrison Jones",
    description:
      "Battlecry: Destroy your opponent's weapon and draw cards equal to its Durability.",
    baseMana: 5,
    baseAttack: 5,
    baseHealth: 4,
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Harrison_Jones.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    // Draw BEFORE breaking it — once the weapon is gone its durability reads 0.
    onPlace: [
      draw({ type: "weapon-durability", player: "enemy" }),
      durability(-99, "enemy-weapon"),
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_558_Play_01.ogg", "PlayCardStinger_Harrison_Jones.ogg"],
      ["HarrisonJ_EX1_558_whip_attack.ogg"],
      ["VO_EX1_558_Death_02.ogg"],
    ),
  },

  // ---------------------------------------------------------------------
  // ENEMY-DECK ACCESS
  // ---------------------------------------------------------------------
  "psychic-conjurer": {
    title: "Psychic Conjurer",
    description:
      "Battlecry: Copy a card in your opponent's deck and add it to your hand.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Undead"],
    tags: ["Battlecry"],
    imageUrl: "assets/cards/Psychic_Conjurer.jpg",
    effects: [
      damage({
        stat: "attack",
        type: "card-stat",
      }),
    ],
    onPlace: [
      {
        type: "addToHand",
        source: "deck",
        target: "enemy-deck",
        removeFromSource: false, // a COPY — the original stays in their deck
        value: 1,
        rand: { n: 1 },
      },
    ],
    targetQuery: {
      side: "enemy",
      type: ["card", "player"],
    },
    isMinion: true,
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_193_Female_Forsaken_Play_01.ogg"],
      ["VO_EX1_193_Female_Forsaken_Attack_01.ogg"],
      ["VO_EX1_193_Female_Forsaken_Death_01.ogg"],
    ),
  },
  thoughtsteal: {
    title: "Thoughtsteal",
    description:
      "Copy 2 cards in your opponent's deck and add them to your hand.",
    baseMana: 3,
    type: ["Shadow"],
    imageUrl: "assets/cards/Thoughtsteal.jpg",
    effects: [
      {
        type: "addToHand",
        source: "deck",
        target: "enemy-deck",
        removeFromSource: false,
        value: 2,
        rand: { n: 2 },
      },
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    targetQuery: {
      side: "all",
      type: ["lane"],
    },
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
  },

  // ---------------------------------------------------------------------
  // ELUSIVE / CAN'T ATTACK
  // ---------------------------------------------------------------------
  "faerie-dragon": {
    title: "Faerie Dragon",
    description: "Can't be targeted by spells or Hero Powers.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    elusive: true,
    type: ["Dragon"],
    tags: ["Elusive"],
    imageUrl: "assets/cards/Faerie_Dragon.jpg",
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
      ["NEW1_023_Faerie_Dragon_EnterPlay_2.ogg"],
      ["NEW1_023_Faerie_Dragon_Attack_2.ogg"],
      ["NEW1_023_Faerie_Dragon_Death_3.ogg"],
    ),
  },
  "ancient-watcher": {
    title: "Ancient Watcher",
    description: "Can't attack.",
    baseMana: 2,
    baseAttack: 4,
    baseHealth: 5,
    cantAttack: true,
    imageUrl: "assets/cards/Ancient_Watcher.jpg",
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
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_045_EnterPlay.ogg"],
      ["SFX_EX1_045_Attack.ogg"],
      ["SFX_EX1_045_Death.ogg"],
    ),
  },
  // =====================================================================
  // TRIGGERS — "whenever X happens, do Y". See TriggerDef in types.d.ts.
  // =====================================================================

  // --- START / END OF TURN ---------------------------------------------
  doomsayer: {
    title: "Doomsayer",
    description: "At the start of your turn, destroy ALL minions.",
    baseMana: 2,
    baseAttack: 0,
    baseHealth: 7,
    imageUrl: "assets/cards/Doomsayer.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // Fires before the draw, so the board is already gone when you draw.
    triggers: [trigger("ON_START_TURN", "FRIENDLY", [destroy("board")])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Epic",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_021_Play_01.ogg"],
      ["VO_NEW1_021_Attack_02.ogg"],
      ["VO_NEW1_021_Death_03.ogg"],
    ),
  },
  "nat-pagle": {
    title: "Nat Pagle",
    description:
      "At the start of your turn, you have a 50% chance to draw an extra card.",
    baseMana: 2,
    baseAttack: 0,
    baseHealth: 4,
    imageUrl: "assets/cards/Nat_Pagle.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_START_TURN", "FRIENDLY", [draw(1)], { chance: 0.5 }),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_557_Play_01.ogg", "Pegasus_Stinger_Gnome.ogg"],
      ["VO_EX1_557_Attack_03.ogg"],
      ["VO_EX1_557_Death_04.ogg"],
      ["VO_EX1_557_Trigger_02.ogg"],
    ),
  },
  demolisher: {
    title: "Demolisher",
    description: "At the start of your turn, deal 2 damage to a random enemy.",
    baseMana: 3,
    baseAttack: 1,
    baseHealth: 4,
    type: ["Mech"],
    imageUrl: "assets/cards/Demolisher.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_START_TURN", "FRIENDLY", [
        {
          type: "damage",
          value: 2,
          target: "enemy-all",
          rand: { split: false, n: 1 },
        },
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_102_EnterPlay.ogg"],
      ["SFX_EX1_102_Attack.ogg"],
      ["SFX_EX1_102_Death.ogg"],
    ),
  },
  lightwell: {
    title: "Lightwell",
    description:
      "At the start of your turn, restore 3 Health to a damaged friendly character.",
    baseMana: 2,
    baseAttack: 0,
    baseHealth: 5,
    imageUrl: "assets/cards/Lightwell.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_START_TURN", "FRIENDLY", [
        {
          type: "heal",
          value: 3,
          target: "friendly-all",
          conditions: [{ type: "state-match", condition: "isDamaged" }],
          rand: { split: false, n: 1 },
        },
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_341_Play_Lightwell.ogg"],
      ["EX1_341_Attack_Lightwell.ogg"],
      ["EX1_341_Death_Lightwell.ogg"],
    ),
  },
  "young-priestess": {
    title: "Young Priestess",
    description:
      "At the end of your turn, give another random friendly minion +1 Health.",
    baseMana: 1,
    baseAttack: 2,
    baseHealth: 1,
    imageUrl: "assets/cards/Young_Priestess.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [
        applyModifier({
          stats: { health: 1 },
          target: "friendly-board",
          conditions: [{ type: "exclude-self" }],
          rand: { split: false, n: 1 },
          stackable: true,
        }),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(["VO_EX1_004_Play_01.ogg"], ["VO_EX1_004_Attack_02.ogg"]),
  },
  "master-swordsmith": {
    title: "Master Swordsmith",
    description:
      "At the end of your turn, give another random friendly minion +1 Attack.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 3,
    imageUrl: "assets/cards/Master_Swordsmith.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [
        applyModifier({
          stats: { attack: 1 },
          target: "friendly-board",
          conditions: [{ type: "exclude-self" }],
          rand: { split: false, n: 1 },
          stackable: true,
        }),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(["VO_NEW1_037_Play_01.ogg"]),
  },
  "imp-master": {
    title: "Imp Master",
    description:
      "At the end of your turn, deal 1 damage to this minion and summon a 1/1 Imp.",
    baseMana: 3,
    baseAttack: 1,
    baseHealth: 5,
    imageUrl: "assets/cards/Imp_Master.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [damage(1, "self"), summon("imp")]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_597_Play_01.ogg"],
      ["VO_EX1_597_Attack_02.ogg"],
      ["VO_EX1_597_Death_03.ogg"],
    ),
  },
  imp: {
    title: "Imp",
    description: "",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    type: ["Demon"],
    imageUrl: "assets/cards/Imp.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
    set: ["Legacy"],
  },
  "mana-tide-totem": {
    title: "Mana Tide Totem",
    description: "At the end of your turn, draw a card.",
    baseMana: 3,
    baseAttack: 0,
    baseHealth: 3,
    type: ["Totem"],
    imageUrl: "assets/cards/Mana_Tide_Totem.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_END_TURN", "FRIENDLY", [draw(1)])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Shaman",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_575_mana_tide_totem_EnterPlay.ogg"],
      ["SFX_EX1_575_Attack_00.ogg"],
      ["EX1_575_mana_tide_totem_Death.ogg"],
    ),
  },
  hogger: {
    title: "Hogger",
    description: "At the end of your turn, summon a 2/2 Gnoll with Taunt.",
    baseMana: 6,
    baseAttack: 4,
    baseHealth: 4,
    imageUrl: "assets/cards/Hogger.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_END_TURN", "FRIENDLY", [summon("gnoll")])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_TUTORIAL_01_HOGGER_02_02.ogg", "Pegasus_Stinger_Beast_Villain.ogg"],
      ["VO_TUTORIAL_01_HOGGER_01_01.ogg"],
    ),
  },
  gnoll: {
    title: "Gnoll",
    description: "Taunt.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    taunt: true,
    tags: ["Taunt"],
    imageUrl: "assets/cards/Gnoll.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
    set: ["Legacy"],
  },
  "baron-geddon": {
    title: "Baron Geddon",
    description:
      "At the end of your turn, deal 2 damage to ALL other characters.",
    baseMana: 7,
    baseAttack: 7,
    baseHealth: 5,
    type: ["Elemental"],
    imageUrl: "assets/cards/Baron_Geddon.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // "ALL other characters" — every minion but himself, plus both heroes.
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [
        {
          type: "damage",
          value: 2,
          target: "board",
          conditions: [{ type: "exclude-self" }],
        },
        damage(2, "friendly-hero"),
        damage(2, "enemy-hero"),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["Pegasus_Stinger_Elemental_Villain.ogg"],
      ["EX1_249_Baron_Geddon_Attack1.ogg"],
      ["EX1_249_Baron_Geddon_Death1.ogg"],
    ),
  },
  gruul: {
    title: "Gruul",
    description: "At the end of each turn, gain +1/+1.",
    baseMana: 8,
    baseAttack: 7,
    baseHealth: 7,
    imageUrl: "assets/cards/Gruul.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // "each turn" — both players', hence ANY_PLAYER.
    triggers: [
      trigger("ON_END_TURN", "ANY_PLAYER", [
        buffSelf({ attack: 1, health: 1 }),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_038_Play_01.ogg", "Pegasus_Stinger_Misc2.ogg"],
      ["VO_NEW1_038_Attack_02.ogg"],
    ),
  },
  "ragnaros-the-firelord": {
    title: "Ragnaros the Firelord",
    description:
      "Can't attack. At the end of your turn, deal 8 damage to a random enemy.",
    baseMana: 8,
    baseAttack: 8,
    baseHealth: 8,
    cantAttack: true,
    type: ["Elemental"],
    imageUrl: "assets/cards/Ragnaros_the_Firelord.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [
        {
          type: "damage",
          value: 8,
          target: "enemy-all",
          rand: { split: false, n: 1 },
        },
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_298_Play_01.ogg", "Pegasus_Stinger_Elemental_Villain.ogg"],
      ["VO_EX1_298_Attack_02.ogg"],
      ["VO_EX1_298_Death_04.ogg"],
      ["VO_EX1_298_Trigger_03.ogg"],
    ),
  },
  ysera: {
    title: "Ysera",
    description: "At the end of your turn, add a Dream Card to your hand.",
    baseMana: 9,
    baseAttack: 4,
    baseHealth: 12,
    type: ["Dragon"],
    imageUrl: "assets/cards/Ysera.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // One of the four Dream cards at random. (Nightmare is omitted — it needs
    // an enchantment that carries its own start-of-turn trigger.)
    triggers: [
      trigger("ON_END_TURN", "FRIENDLY", [
        {
          type: "addToHand",
          source: "global",
          cardID: [
            "emerald-drake",
            "laughing-sister",
            "ysera-awakens",
            "dream",
          ],
          value: 1,
          rand: { n: 1 },
        },
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_572_Play_01.ogg", "Pegasus_Stinger_Dragon_Good_New.ogg"],
      ["VO_EX1_572_Attack_02.ogg"],
    ),
  },
  "emerald-drake": {
    title: "Emerald Drake",
    description: "",
    baseMana: 4,
    baseAttack: 7,
    baseHealth: 6,
    type: ["Dragon"],
    imageUrl: "assets/cards/Emerald_Drake.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["WoW_DREAM_03_EmeraldDrake_EnterPlay.ogg"],
      ["WoW_DREAM_03_EmeraldDrake_Attack.ogg"],
      ["WoW_DREAM_03_EmeraldDrake_Death.ogg"],
    ),
  },
  "laughing-sister": {
    title: "Laughing Sister",
    description: "Can't be targeted by spells or Hero Powers.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 5,
    elusive: true,
    tags: ["Elusive"],
    imageUrl: "assets/cards/Laughing_Sister.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(["VO_DREAM_01_Play_01.ogg"], ["VO_DREAM_01_Attack_02.ogg"]),
  },
  "ysera-awakens": {
    title: "Ysera Awakens",
    description: "Deal 5 damage to all characters except Ysera.",
    baseMana: 2,
    imageUrl: "assets/cards/Ysera_Awakens.jpg",
    effects: [
      {
        type: "damage",
        value: 5,
        target: "board",
        conditions: [{ type: "text-contains", key: "title", value: "Ysera" }],
      },
      damage(5, "friendly-hero"),
      damage(5, "enemy-hero"),
    ],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    isUncollectible: true,
    targetQuery: { side: "all", type: ["lane"] },
    class: "Neutral",
    set: ["Legacy"],
  },
  dream: {
    title: "Dream",
    description: "Return a minion to its owner's hand.",
    baseMana: 0,
    imageUrl: "assets/cards/Dream.jpg",
    effects: [returnToHand("user-select")],
    onPlace: [],
    isSpell: true,
    isMinion: false,
    isUncollectible: true,
    targetQuery: { side: "all", type: ["card"] },
    class: "Neutral",
    set: ["Legacy"],
  },

  // --- DAMAGE ----------------------------------------------------------
  "acolyte-of-pain": {
    title: "Acolyte of Pain",
    description: "Whenever this minion takes damage, draw a card.",
    baseMana: 3,
    baseAttack: 1,
    baseHealth: 3,
    imageUrl: "assets/cards/Acolyte_of_Pain.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_SELF_DAMAGE", "ANY_PLAYER", [draw(1)])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_007_Play_01.ogg"],
      ["VO_EX1_007_Attack_02.ogg"],
      ["VO_EX1_007_Death_03.ogg"],
    ),
  },
  "gurubashi-berserker": {
    title: "Gurubashi Berserker",
    description: "Whenever this minion takes damage, gain +3 Attack.",
    baseMana: 5,
    baseAttack: 2,
    baseHealth: 8,
    imageUrl: "assets/cards/Gurubashi_Berserker.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_SELF_DAMAGE", "ANY_PLAYER", [buffSelf({ attack: 3 })]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_399_EnterPlay_02.ogg"],
      ["SFX_EX1_399_Attack_02.ogg"],
      ["SFX_EX1_399_Death_02.ogg"],
    ),
  },
  "frothing-berserker": {
    title: "Frothing Berserker",
    description: "Whenever a minion takes damage, gain +1 Attack.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 4,
    imageUrl: "assets/cards/Frothing_Berserker.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // One window per damage INSTANCE, so an AoE grants +1 per minion hit.
    triggers: [
      trigger("ON_MINION_DAMAGE", "ANY_PLAYER", [buffSelf({ attack: 1 })]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Warrior",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_604_Play_01.ogg"],
      ["VO_EX1_604_Attack_02.ogg"],
      ["VO_EX1_604_Death_03.ogg"],
    ),
  },
  armorsmith: {
    title: "Armorsmith",
    description: "Whenever a friendly minion takes damage, gain 1 Armor.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 4,
    imageUrl: "assets/cards/Armorsmith.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_MINION_DAMAGE", "FRIENDLY", [
        { type: "armor", target: "self", value: 1 },
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Warrior",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_402_Play_01.ogg"],
      ["VO_EX1_402_Attack_02.ogg"],
      ["VO_EX1_402_Death_03.ogg"],
    ),
  },

  // --- DEATH -----------------------------------------------------------
  "flesheating-ghoul": {
    title: "Flesheating Ghoul",
    description: "Whenever a minion dies, gain +1 Attack.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    type: ["Undead"],
    imageUrl: "assets/cards/Flesheating_Ghoul.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_MINION_DEATH", "ANY_PLAYER", [buffSelf({ attack: 1 })], {
        // His own death queues a window too, but the reaction fizzles when it
        // resolves because he's already been swept — no need to exclude here.
      }),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["Tt_004_FleshEating_Ghoul_EnterPlay1.ogg"],
      ["Tt_004_FleshEating_Ghoul_Attack1.ogg"],
      ["Tt_004_FleshEating_Ghoul_Death1.ogg"],
    ),
  },
  "cult-master": {
    title: "Cult Master",
    description: "After a friendly minion dies, draw a card.",
    baseMana: 4,
    baseAttack: 4,
    baseHealth: 2,
    type: ["Undead"],
    imageUrl: "assets/cards/Cult_Master.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_MINION_DEATH", "FRIENDLY", [draw(1)], { self: "exclude" }),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_595_Play_01.ogg"],
      ["VO_EX1_595_Attack_02.ogg"],
      ["VO_EX1_595_Death_03.ogg"],
    ),
  },
  "scavenging-hyena": {
    title: "Scavenging Hyena",
    description: "Whenever a friendly Beast dies, gain +2/+1.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 2,
    type: ["Beast"],
    imageUrl: "assets/cards/Scavenging_Hyena.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger(
        "ON_MINION_DEATH",
        "FRIENDLY",
        [buffSelf({ attack: 2, health: 1 })],
        {
          self: "exclude",
          conditions: [{ type: "tags-include", value: "Beast" }],
        },
      ),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_EX1_531_EnterPlay.ogg"],
      ["SFX_EX1_531_Attack.ogg"],
      ["SFX_EX1_531_Death.ogg"],
    ),
  },

  // --- SPELL CAST ------------------------------------------------------
  "mana-wyrm": {
    title: "Mana Wyrm",
    description: "Whenever you cast a spell, gain +1 Attack.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 3,
    imageUrl: "assets/cards/Mana_Wyrm.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_SPELL_CAST", "FRIENDLY", [buffSelf({ attack: 1 })])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Mage",
    set: ["Legacy"],
    sfx: sfx(
      ["NEW1_012_Mana_Wyrm_EnterPlay1.ogg"],
      ["NEW1_012_Mana_Wyrm_Attack2.ogg"],
      ["NEW1_012_Mana_Wyrm_Death3.ogg"],
    ),
  },
  "mana-addict": {
    title: "Mana Addict",
    description: "Whenever you cast a spell, gain +2 Attack this turn.",
    baseMana: 2,
    baseAttack: 1,
    baseHealth: 3,
    imageUrl: "assets/cards/Mana_Addict.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_SPELL_CAST", "FRIENDLY", [
        buffSelf(
          { attack: 2 },
          { expiryTrigger: "END_OF_TURN", expiryOwner: "BUFF_CASTER" },
        ),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(["VO_EX1_055_Play_01.ogg"], ["VO_EX1_055_Attack_02.ogg"]),
  },
  "wild-pyromancer": {
    title: "Wild Pyromancer",
    description: "After you cast a spell, deal 1 damage to ALL minions.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    type: ["Undead"],
    imageUrl: "assets/cards/Wild_Pyromancer.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_SPELL_CAST", "FRIENDLY", [damage(1, "board")])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_020_Play_01.ogg"],
      ["VO_NEW1_020_Attack_02.ogg"],
      ["VO_NEW1_020_Death_03.ogg"],
    ),
  },
  "violet-teacher": {
    title: "Violet Teacher",
    description: "Whenever you cast a spell, summon a 1/1 Violet Apprentice.",
    baseMana: 4,
    baseAttack: 3,
    baseHealth: 5,
    imageUrl: "assets/cards/Violet_Teacher.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_SPELL_CAST", "FRIENDLY", [summon("violet-apprentice")]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_026_Play_01.ogg"],
      ["VO_NEW1_026_Attack_02.ogg"],
      ["VO_NEW1_026_Death_03.ogg"],
    ),
  },
  "violet-apprentice": {
    title: "Violet Apprentice",
    description: "",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 1,
    imageUrl: "assets/cards/Violet_Apprentice.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    isUncollectible: true,
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(["VO_NEW1_026t_Play_01.ogg"], ["VO_NEW1_026t_Attack_02.ogg"]),
  },
  "gadgetzan-auctioneer": {
    title: "Gadgetzan Auctioneer",
    description: "Whenever you cast a spell, draw a card.",
    baseMana: 5,
    baseAttack: 4,
    baseHealth: 4,
    imageUrl: "assets/cards/Gadgetzan_Auctioneer.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_SPELL_CAST", "FRIENDLY", [draw(1)])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_095_Play_01.ogg"],
      ["VO_EX1_095_Attack_02.ogg"],
      ["VO_EX1_095_Death_03.ogg"],
    ),
  },
  "arcane-devourer": {
    title: "Arcane Devourer",
    description: "Whenever you cast a spell, gain +2/+2.",
    baseMana: 8,
    baseAttack: 4,
    baseHealth: 8,
    type: ["Elemental"],
    imageUrl: "assets/cards/Arcane_Devourer.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_SPELL_CAST", "FRIENDLY", [
        buffSelf({ attack: 2, health: 2 }),
      ]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_187_Female_Elemental_Play_01.ogg"],
      ["VO_EX1_187_Female_Elemental_Attack_01.ogg"],
    ),
  },
  "archmage-antonidas": {
    title: "Archmage Antonidas",
    description:
      "Whenever you cast a spell, add a 'Fireball' spell to your hand.",
    baseMana: 7,
    baseAttack: 5,
    baseHealth: 7,
    imageUrl: "assets/cards/Archmage_Antonidas.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_SPELL_CAST", "FRIENDLY", [addToHand("fireball")])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Legendary",
    class: "Mage",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_559_Play_01.ogg", "Pegasus_Stinger_Alliance.ogg"],
      ["VO_EX1_559_Attack_03.ogg"],
      ["VO_EX1_559_Death_04.ogg"],
      ["VO_EX1_559_Trigger_02.ogg"],
    ),
  },

  // --- SUMMON ----------------------------------------------------------
  "knife-juggler": {
    title: "Knife Juggler",
    description: "After you summon a minion, deal 1 damage to a random enemy.",
    baseMana: 2,
    baseAttack: 3,
    baseHealth: 2,
    imageUrl: "assets/cards/Knife_Juggler.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // self: "exclude" — he doesn't throw a knife for his own arrival.
    triggers: [
      trigger(
        "ON_SUMMON",
        "FRIENDLY",
        [
          {
            type: "damage",
            value: 1,
            target: "enemy-all",
            rand: { split: false, n: 1 },
          },
        ],
        { self: "exclude" },
      ),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_NEW1_019_Play_01.ogg"],
      ["VO_NEW1_019_Attack_02.ogg"],
      ["VO_NEW1_019_Death_03.ogg"],
    ),
  },
  "murloc-tidecaller": {
    title: "Murloc Tidecaller",
    description: "Whenever a Murloc is summoned, gain +1 Attack.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Murloc"],
    imageUrl: "assets/cards/Murloc_Tidecaller.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // Any Murloc, either side (the Hearthstone wording is not "friendly").
    triggers: [
      trigger("ON_SUMMON", "ANY_PLAYER", [buffSelf({ attack: 1 })], {
        self: "exclude",
        conditions: [{ type: "tags-include", value: "Murloc" }],
      }),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["EX1_509_Murloc_Tidecaller_EnterPlay1.ogg"],
      ["EX1_509_Murloc_Tidecaller_Attack1.ogg"],
    ),
  },
  "starving-buzzard": {
    title: "Starving Buzzard",
    description: "Whenever you summon a Beast, draw a card.",
    baseMana: 2,
    baseAttack: 2,
    baseHealth: 1,
    type: ["Beast"],
    imageUrl: "assets/cards/Starving_Buzzard.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_SUMMON", "FRIENDLY", [draw(1)], {
        self: "exclude",
        conditions: [{ type: "tags-include", value: "Beast" }],
      }),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    class: "Hunter",
    set: ["Legacy"],
    sfx: sfx(
      ["SFX_CS2_237_EnterPlay.ogg"],
      ["SFX_CS2_237_Attack.ogg"],
      ["SFX_CS2_237_Death.ogg"],
    ),
  },
  "warsong-commander": {
    title: "Warsong Commander",
    description:
      "Whenever you summon a minion with 3 or less Attack, give it Charge.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 3,
    imageUrl: "assets/cards/Warsong_Commander.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // "user-select" inside a trigger resolves to the window's subject — the
    // minion that was just summoned.
    triggers: [
      trigger(
        "ON_SUMMON",
        "FRIENDLY",
        [{ type: "charge", target: "user-select" }],
        {
          self: "exclude",
          conditions: [
            {
              type: "numeric",
              key: { type: "card-stat", stat: "attack" },
              operator: "<=",
              value: 3,
            },
          ],
        },
      ),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    class: "Warrior",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_084_Play_01.ogg"],
      ["VO_EX1_084_Attack_02.ogg"],
      ["VO_EX1_084_Death_03.ogg"],
    ),
  },
  "sword-of-justice": {
    title: "Sword of Justice",
    description:
      "After you summon a minion, give it +1/+1 and this loses 1 Durability.",
    baseMana: 3,
    baseAttack: 1,
    baseDurability: 5,
    isWeapon: true,
    isMinion: false,
    imageUrl: "assets/cards/Sword_of_Justice.jpg",
    effects: [],
    onPlace: [],
    // Weapons are trigger owners too — listTriggerOwners includes the equipped
    // weapon on each side.
    triggers: [
      trigger("ON_SUMMON", "FRIENDLY", [
        applyModifier({
          target: "user-select",
          stats: { attack: 1, health: 1 },
          stackable: true,
        }),
        durability(-1, "friendly-weapon"),
      ]),
    ],
    targetQuery: { side: "all", type: ["lane"] },
    rarity: "Epic",
    class: "Paladin",
    set: ["Legacy"],
  },

  // --- CARD PLAYED / HEAL ----------------------------------------------
  "questing-adventurer": {
    title: "Questing Adventurer",
    description: "Whenever you play a card, gain +1/+1.",
    baseMana: 3,
    baseAttack: 2,
    baseHealth: 2,
    imageUrl: "assets/cards/Questing_Adventurer.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger(
        "ON_CARD_PLAYED",
        "FRIENDLY",
        [buffSelf({ attack: 1, health: 1 })],
        {
          self: "exclude",
        },
      ),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_044_Play_01.ogg"],
      ["VO_EX1_044_Attack_02.ogg"],
      ["VO_EX1_044_Death_03.ogg"],
    ),
  },
  lightwarden: {
    title: "Lightwarden",
    description: "Whenever a character is healed, gain +2 Attack.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 2,
    type: ["Draenei"],
    imageUrl: "assets/cards/Lightwarden.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [
      trigger("ON_CHARACTER_HEAL", "ANY_PLAYER", [buffSelf({ attack: 2 })]),
    ],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Neutral",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_EX1_001_Play_01.ogg"],
      ["VO_EX1_001_Attack_02.ogg"],
      ["VO_EX1_001_Death_03.ogg"],
    ),
  },
  "northshire-cleric": {
    title: "Northshire Cleric",
    description: "Whenever a minion is healed, draw a card.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 3,
    imageUrl: "assets/cards/Northshire_Cleric.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    triggers: [trigger("ON_MINION_HEALED", "ANY_PLAYER", [draw(1)])],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Common",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS2_235_Play_01.ogg"],
      ["VO_CS2_235_Attack_02.ogg"],
      ["VO_CS2_235_Death_03.ogg"],
    ),
  },
  "crimson-clergy": {
    title: "Crimson Clergy",
    description: "Overheal: Draw a card.",
    baseMana: 1,
    baseAttack: 1,
    baseHealth: 3,
    tags: ["Overheal"],
    imageUrl: "assets/cards/Crimson_Clergy.jpg",
    effects: [damage({ stat: "attack", type: "card-stat" })],
    onPlace: [],
    // Overheal is healing that went to waste — only fires when the target was
    // at (or reached) full health with healing left over.
    triggers: [trigger("OVERHEAL", "ANY_PLAYER", [draw(1)], { self: "only" })],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    isMinion: true,
    rarity: "Rare",
    class: "Priest",
    set: ["Legacy"],
    sfx: sfx(
      ["VO_CS3_014_Male_Human_Play_01.ogg"],
      ["VO_CS3_014_Male_Human_Attack_01.ogg"],
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
