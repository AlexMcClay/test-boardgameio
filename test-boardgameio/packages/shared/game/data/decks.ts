import { type Hero, type DeckString } from "../types";
import {
  druidHero,
  mageHero,
  paladinHero,
  rogueHero,
  warlockHero,
  warriorHero,
} from "./heros";

export const warriorDeckString: DeckString = {
  // All 13 Collectible Warrior Class Cards (26 cards total)
  "inner-rage": 2,
  charge: 2,
  whirlwind: 2,
  "korkron-elite": 2,
  "warsong-outrider": 2,
  "cruel-taskmaster": 2,
  "shield-block": 2,
  bash: 2,
  "unleash-the-crocolisks": 2,
  execute: 2,
  "mortal-strike": 2,
  rampage: 2,
  "fiery-war-axe": 2,

  // Neutral Taunts/Big Bodies to round out the curve (4 cards)
  "senjin-shieldmasta": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const druidDeckString: DeckString = {
  // All 6 Collectible Druid Class Cards (12 cards total)
  innervate: 2,
  "mark-of-the-wild": 2,
  "healing-touch": 2,
  "force-of-nature": 2,
  starfire: 2,
  "ironbark-protector": 2,

  // Deathrattle/Battlecry value neutrals (6 cards)
  "loot-hoarder": 2,
  "novice-engineer": 2,
  "darkscale-healer": 2,

  // Neutral Beasts/Taunts to fill the curve (12 cards)
  "bloodfen-raptor": 2,
  "river-crocolisk": 2,
  "ironfur-grizzly": 2,
  "silverback-patriarch": 2,
  "oasis-snapjaw": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const mageDeckString: DeckString = {
  // Core Mage Freeze/Burn spell package (21 cards)
  "ice-lance": 2,
  frostbolt: 2,
  icicle: 2,
  arcane_explosion: 2,
  "arcane-intellect": 2,
  "frost-nova": 2,
  "mirror-image-spell": 2,
  fireball: 2,
  "water-elemental": 2, // Class minion
  blizzard: 1, // Top-end AoE finisher
  flamestrike: 1, // Top-end AoE finisher
  "deep-freeze": 1,

  "arcane-missiles": 1,

  // Neutral minions to round out the board presence (9 cards)
  "chillwind-yeti": 2,
  "senjin-shieldmasta": 2,
  "loot-hoarder": 2,
  "gnomish-inventor": 2,
}; // Total: 30 cards

export const paladinDeckString: DeckString = {
  // All 8 Collectible Paladin Class Cards (15 cards total)
  "hand-of-protection": 2,
  shielded_minibot: 2,
  "argent-protector": 2,
  "blessing-of-kings": 2,
  "guardian-of-kings": 2,
  "lay-on-hands": 2,
  "tirion-fordring": 1, // Legendary limit strictly kept at 1 copy!

  // Valid Collectible Neutrals to fill up to 30 (15 cards)
  "argent-squire": 2,
  "abusive-sargent": 1,
  "goldshire-footman": 2,
  "river-crocolisk": 2,
  "senjin-shieldmasta": 2,
  sunwalker: 2,
  "silver-hand-knight": 2,
  "loot-hoarder": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const rogueDeckString: DeckString = {
  // All 8 Collectible Rogue Class Cards (16 cards total)
  assassinate: 2,
  backstab: 2,
  "sinister-strike": 2,
  eviscerate: 2,
  "fan-of-knives": 2,
  shadowstep: 2,
  sap: 2,
  shiv: 2,

  // Valid Collectible Neutrals - cheap tempo/charge minions (14 cards)
  "bloodfen-raptor": 2,
  wolfrider: 2,
  "bluegill-warrior": 2,
  "stormwind-knight": 2,
  "booty-bay-bodyguard": 2,
  "reckless-rocketeer": 2,
  "core-hound": 2,
}; // Total: 30 cards

export const warlockDeckString: DeckString = {
  // Warlock Demon minion package (16 cards)
  "flame-imp": 2,
  voidwalker: 2,
  felstalker: 2,
  "vulgar-homunculus": 2,
  "pit-lord": 2,
  "dread-infernal": 2,
  doomguard: 1,
  riftcleaver: 1,
  voidlord: 1,

  // Warlock removal/burn/lifesteal spell package (13 cards)
  soulfire: 2,
  "mortal-coil": 1,
  demonfire: 2,
  "drain-soul": 2,
  "shadow-bolt": 2,
  "drain-life": 1,
  "siphon-soul": 2,
  hellfire: 1,
  "sacrificial-pact": 1,

  // Single neutral taunt to smooth the 3-drop curve (1 card)
  "ironfur-grizzly": 1,
}; // Total: 30 cards

export interface Deck {
  hero: Hero;
  name: string;
  deckString: DeckString;
}

export const premadeDecks: Deck[] = [
  { name: "Warrior", deckString: warriorDeckString, hero: warriorHero },
  { name: "Druid", deckString: druidDeckString, hero: druidHero },
  { name: "Mage", deckString: mageDeckString, hero: mageHero },
  { name: "Paladin", deckString: paladinDeckString, hero: paladinHero },
  { name: "Rogue", deckString: rogueDeckString, hero: rogueHero },
  { name: "Warlock", deckString: warlockDeckString, hero: warlockHero },
];
