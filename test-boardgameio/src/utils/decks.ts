import type { CardTemplateKey, cardTemplates } from "./cards";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

export const warriorDeckString: DeckString = {
  "inner-rage": 2, // Activate enrage / push damage
  charge: 2, // Classic Warrior utility
  "bloodfen-raptor": 2, // Early aggressive stats
  wolfrider: 2, // Immediate face pressure / trading
  "ironfur-grizzly": 2, // Mid-game Taunt
  "razorfen-hunter": 2, // Board presence
  "senjin-shieldmasta": 2, // Premium Taunt
  "chillwind-yeti": 2, // Best stat-line 4-drop
  "stormwind-knight": 2, // Charge + high health survival
  "boulderfist-ogre": 2, // Solid late-game threat
};

export const druidDeckString: DeckString = {
  innervate: 2, // Mana acceleration
  "mark-of-the-wild": 2, // Early minion buffs
  "healing-touch": 2, // Sustain and survival
  "river-crocolisk": 2, // Solid 2-drop
  "ironfur-grizzly": 2, // Mid-game protection
  "oasis-snapjaw": 2, // High health (Amazing target for Mark of the Wild)
  "darkscale-healer": 2, // AoE heal to keep big bodies alive
  "boulderfist-ogre": 2, // High stat threat to cheat out early
  "lord-of-the-arena": 2, // Late game big Taunt
  "core-hound": 2, // Massive late-game threat
};

export const mageDeckString: DeckString = {
  frostbolt: 2, // Early removal / freeze
  "arcane-intellect": 2, // Core card draw
  fireball: 2, // Premier removal or burn finisher
  flamestrike: 2, // Ultimate board clear
  "elven-archer": 2, // Ping support / Ping combo
  "novice-engineer": 2, // Cycle
  "chillwind-yeti": 2, // Mid-game powerhouse
  "senjin-shieldmasta": 2, // Defensive stall
  "gnomish-inventor": 2, // More card draw on a stick
  "boulderfist-ogre": 2, // Late game finisher
};

export const paladinDeckString: DeckString = {
  squire: 2, // Perfect early target for buffs
  "voodoo-doctor": 2, // Early heal synergy
  "murloc-tidehunter": 2, // Double bodies for buff targets
  "blessing-of-kings": 2, // Massive Paladin stat-buff
  "oasis-snapjaw": 2, // High health (Incredible with Blessing of Kings)
  "senjin-shieldmasta": 2, // Defense
  "silver-hand-knight": 2, // Token generation / wide board
  "darkscale-healer": 2, // Heal up your buffed minions
  "boulderfist-ogre": 2, // Big finisher
  "lord-of-the-arena": 2, // High-end defensive threat
};

export const rogueDeckString: DeckString = {
  "elven-archer": 2, // Combo enabler / Battlecry ping
  "bluegill-warrior": 2, // Fast, reactive damage
  "river-crocolisk": 2, // Efficient stats
  wolfrider: 2, // Immediate damage
  assassinate: 2, // Ultimate hard removal
  "ironforge-rifleman": 2, // Extra tempo/ping damage
  "stormpike-commando": 2, // Removal on a stick
  nightblade: 2, // Direct face burn
  "reckless-rocketeer": 2, // Big charge finisher
  "boulderfist-ogre": 2, // Heavy vanilla stats
};

export const aggroFaceDeckString: DeckString = {
  "flame-imp": 2, // Best aggressive 1-drop stats
  "murloc-raider": 2, // Aggressive 1-drop
  "arcane-shot": 2, // Cheap direct damage
  "bluegill-warrior": 2, // Immediate charge damage
  wolfrider: 2, // More immediate charge damage
  "magma-rager": 2, // Extreme high-attack threat if ignored
  nightblade: 2, // Direct un-blockable face damage
  "frostwolf-grunt": 2, // Cheap protection for your high-attack fragile minions
  "reckless-rocketeer": 2, // High-end charge finisher
  "core-hound": 2, // Ultimate "must-answer-now" top-end threat
};

export const premadeDecks = [
  { name: "Warrior", deckString: warriorDeckString },
  { name: "Druid", deckString: druidDeckString },
  { name: "Mage", deckString: mageDeckString },
  { name: "Paladin", deckString: paladinDeckString },
  { name: "Rogue", deckString: rogueDeckString },
  { name: "Aggro Face", deckString: aggroFaceDeckString },
];
