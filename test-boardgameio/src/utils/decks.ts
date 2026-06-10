import type { CardTemplateKey, cardTemplates } from "./cards";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

export const warriorDeckString: DeckString = {
  charge: 2,
  "flame-imp": 2,
  "murloc-raider": 2,
  "frostwolf-grunt": 2,
  wolfrider: 2,
  "murloc-tidehunter": 2,
  "razorfen-hunter": 2,
  "dragonling-mechanic": 2,
  "senjin-shieldmasta": 2,
  "boulderfist-ogre": 2,
};

export const druidDeckString: DeckString = {
  "mark-of-the-wild": 2,
  innervate: 2,
  "river-crocolisk": 2,
  "boulderfist-ogre": 2,
  "darkscale-healer": 2,
  nightblade: 2,
  "elven-archer": 2,
  "core-hound": 2,
  "silverback-patriarch": 2,
};

export const mageDeckString: DeckString = {
  "arcane-intellect": 2, // Spells & Draw
  frostbolt: 2,
  fireball: 2,
  "arcane-shot": 2,
  "novice-engineer": 2, // Minion Draw
  "gnomish-inventor": 2,
  "elven-archer": 2, // Ping support
  "river-crocolisk": 2, // Early board
  "chillwind-yeti": 2, // Mid-game bodies
  "senjin-shieldmasta": 2,
  "boulderfist-ogre": 2, // Late-game threats
};

export const paladinDeckString: DeckString = {
  "goldshire-footman": 2, // Cheap Taunt targets
  "voodoo-doctor": 2, // Early heals
  "river-crocolisk": 2,
  "ironfur-grizzly": 2,
  "blessing-of-kings": 2, // Heavy buffs
  "oasis-snapjaw": 2, // High health buff targets
  "senjin-shieldmasta": 2,
  "silver-hand-knight": 2, // Token generation
  "darkscale-healer": 2, // Board wide healing
  "boulderfist-ogre": 2, // Big finishers
};

export const rogueDeckString: DeckString = {
  "elven-archer": 2, // Battlecry pings
  "bloodfen-raptor": 2, // Aggressive stats
  "murloc-tidehunter": 2,
  "razorfen-hunter": 2, // Board flood
  "stormpike-commando": 2, // Removal Battlecry
  assassinate: 2, // Hard removal
  "booty-bay-bodyguard": 2, // Mid-game protection
  wolfrider: 2, // Fast Charge damage
  "reckless-rocketeer": 2,
  nightblade: 2, // Direct hero damage
};

export const aggroFaceDeckString: DeckString = {
  "flame-imp": 2, // High stat 1-drop
  "murloc-raider": 2,
  "arcane-shot": 2, // Direct damage
  "inner-rage": 2, // Zero-mana minion enabler
  "murloc-tidehunter": 2, // Token swarm
  wolfrider: 2, // Immediate Charge
  "magma-rager": 2, // High attack threat
  "razorfen-hunter": 2,
  nightblade: 2, // Direct hero burn
  "reckless-rocketeer": 2, // High-end finisher
};

export const premadeDecks = [
  { name: "Warrior", deckString: warriorDeckString },
  { name: "Druid", deckString: druidDeckString },
  { name: "Mage", deckString: mageDeckString },
  { name: "Paladin", deckString: paladinDeckString },
  { name: "Rogue", deckString: rogueDeckString },
  { name: "Aggro Face", deckString: aggroFaceDeckString },
];
