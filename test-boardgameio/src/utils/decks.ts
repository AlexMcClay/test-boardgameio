import type { CardTemplateKey, cardTemplates } from "./cards";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

export const warriorDeckString: DeckString = {
  "inner-rage": 2,
  charge: 2,
  "bloodfen-raptor": 2,
  wolfrider: 2,
  "ironfur-grizzly": 2,
  "razorfen-hunter": 2,
  "senjin-shieldmasta": 2,
  "chillwind-yeti": 2,
  "stormwind-knight": 2,
  "boulderfist-ogre": 2,

  "river-crocolisk": 2,
  "murloc-raider": 2,
  "dragonling-mechanic": 2,
  "lord-of-the-arena": 2,
  "core-hound": 2,
};

export const druidDeckString: DeckString = {
  innervate: 2,
  "mark-of-the-wild": 2,
  "healing-touch": 2,
  "river-crocolisk": 2,
  "ironfur-grizzly": 2,
  "oasis-snapjaw": 2,
  "darkscale-healer": 2,
  "boulderfist-ogre": 2,
  "lord-of-the-arena": 2,
  "core-hound": 2,

  "bloodfen-raptor": 2,
  "chillwind-yeti": 2,
  "dragonling-mechanic": 2,
  "silver-hand-knight": 2,
  "senjin-shieldmasta": 2,
};

export const mageDeckString: DeckString = {
  frostbolt: 2,
  "arcane-intellect": 2,
  fireball: 2,
  flamestrike: 2,
  "elven-archer": 2,
  "novice-engineer": 2,
  "chillwind-yeti": 2,
  "senjin-shieldmasta": 2,
  "gnomish-inventor": 2,
  "boulderfist-ogre": 2,

  "river-crocolisk": 2,
  "ironforge-rifleman": 2,
  "dragonling-mechanic": 2,
  "darkscale-healer": 2,
  "lord-of-the-arena": 2,
};

export const paladinDeckString: DeckString = {
  "goldshire-footman": 2,
  "voodoo-doctor": 2,
  "murloc-tidehunter": 2,
  "blessing-of-kings": 2,
  "oasis-snapjaw": 2,
  "senjin-shieldmasta": 2,
  "silver-hand-knight": 2,
  "darkscale-healer": 2,
  "boulderfist-ogre": 2,
  "lord-of-the-arena": 2,

  "river-crocolisk": 2,
  "razorfen-hunter": 2,
  "dragonling-mechanic": 2,
  "chillwind-yeti": 2,
  "core-hound": 2,
};

export const rogueDeckString: DeckString = {
  "elven-archer": 2,
  "bluegill-warrior": 2,
  "river-crocolisk": 2,
  wolfrider: 2,
  assassinate: 2,
  "ironforge-rifleman": 2,
  "stormpike-commando": 2,
  nightblade: 2,
  "reckless-rocketeer": 2,
  "boulderfist-ogre": 2,

  "novice-engineer": 2,
  "bloodfen-raptor": 2,
  "chillwind-yeti": 2,
  "dragonling-mechanic": 2,
  "gnomish-inventor": 2,
};

export const aggroFaceDeckString: DeckString = {
  "flame-imp": 2,
  "murloc-raider": 2,
  "arcane-shot": 2,
  "bluegill-warrior": 2,
  wolfrider: 2,
  "magma-rager": 2,
  nightblade: 2,
  "frostwolf-grunt": 2,
  "reckless-rocketeer": 2,
  "core-hound": 2,

  "bloodfen-raptor": 2,
  "river-crocolisk": 2,
  "elven-archer": 2,
  charge: 2,
  "stormwind-knight": 2,
};

export const premadeDecks = [
  { name: "Warrior", deckString: warriorDeckString },
  { name: "Druid", deckString: druidDeckString },
  { name: "Mage", deckString: mageDeckString },
  { name: "Paladin", deckString: paladinDeckString },
  { name: "Rogue", deckString: rogueDeckString },
  { name: "Aggro Face", deckString: aggroFaceDeckString },
];
