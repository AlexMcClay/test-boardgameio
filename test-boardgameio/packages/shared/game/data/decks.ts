import { type Hero, type DeckString } from "../types";
import {
  druidHero,
  mageHero,
  paladinHero,
  rogueHero,
  warriorHero,
} from "./heros";

export const warriorDeckString: DeckString = {
  // ALL 6 Available Warrior Class Cards (12 cards total)
  "inner-rage": 2,
  charge: 2,
  whirlwind: 2,
  "korkron-elite": 2,
  "warsong-outrider": 2,
  "cruel-taskmaster": 2,
  "shield-block": 2,
  bash: 1,

  // Mandatory Battlecry/Deathrattle Requirements (6 cards)
  "loot-hoarder": 2, // Deathrattle
  "novice-engineer": 1, // Battlecry
  "murloc-tidehunter": 1, // Battlecry

  // Valid Collectible Neutrals to fill up to 30 (12 cards)
  "bluegill-warrior": 1,
  wolfrider: 1,
  "goldshire-footman": 2,
  "chillwind-yeti": 1,
  "senjin-shieldmasta": 2,
  "boulderfist-ogre": 2,
  "core-hound": 2,
}; // Total: 30 cards

export const druidDeckString: DeckString = {
  // ALL 6 Available Druid Class Cards (12 cards total)
  innervate: 2,
  "mark-of-the-wild": 2,
  "healing-touch": 2,
  "force-of-nature": 2,
  starfire: 2,
  "ironbark-protector": 2,

  // Mandatory Battlecry/Deathrattle Requirements (6 cards)
  "loot-hoarder": 2, // Deathrattle
  "novice-engineer": 2, // Battlecry
  "darkscale-healer": 2, // Battlecry

  // Valid Collectible Neutrals to fill up to 30 (12 cards)
  "bloodfen-raptor": 2,
  "river-crocolisk": 2,
  "ironfur-grizzly": 2,
  "silverback-patriarch": 2,
  "oasis-snapjaw": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const mageDeckString: DeckString = {
  // ALL 8 Available Mage Class Cards (16 cards total)
  "ice-lance": 2,
  "mirror-image-spell": 2,
  frostbolt: 2,
  "arcane-intellect": 2,
  arcane_explosion: 2,
  "frost-nova": 2,
  fireball: 2,
  blizzard: 2,
  flamestrike: 1,

  // Mandatory Battlecry/Deathrattle Requirements (6 cards)
  "loot-hoarder": 2, // Deathrattle
  "elven-archer": 1, // Battlecry
  "gnomish-inventor": 2, // Battlecry

  // Valid Collectible Neutrals to fill up to 30 (8 cards)
  "murloc-raider": 1,
  "chillwind-yeti": 1,
  "senjin-shieldmasta": 2,
  "water-elemental": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const paladinDeckString: DeckString = {
  // ALL 7 Available Paladin Class Cards (13 cards total)
  "hand-of-protection": 2,
  shielded_minibot: 2,
  "argent-protector": 2,
  "blessing-of-kings": 2,
  "guardian-of-kings": 2,
  "lay-on-hands": 2,
  "tirion-fordring": 1, // Legendary Limit strictly kept at 1 copy!

  // Mandatory Battlecry/Deathrattle Requirements (6 cards)
  "loot-hoarder": 2, // Deathrattle
  "novice-engineer": 2, // Battlecry
  "silver-hand-knight": 2, // Battlecry

  // Valid Collectible Neutrals to fill up to 30 (11 cards)
  "argent-squire": 2,
  "goldshire-footman": 2,
  "river-crocolisk": 1,
  "senjin-shieldmasta": 2,
  sunwalker: 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const rogueDeckString: DeckString = {
  // ALL 1 Available Rogue Class Card (2 cards total)
  assassinate: 2,
  backstab: 2,
  "sinister-strike": 2,
  eviscerate: 2,
  "fan-of-knives": 1,
  shadowstep: 2,

  // Mandatory Battlecry/Deathrattle Requirements (10 cards)
  "loot-hoarder": 2, // Deathrattle
  "novice-engineer": 2, // Battlecry
  "gnomish-inventor": 1, // Battlecry

  // Valid Collectible Neutrals to fill up to 30 (18 cards)
  "bloodfen-raptor": 1,
  wolfrider: 2,
  "chillwind-yeti": 1,
  "stormwind-knight": 2,
  "booty-bay-bodyguard": 2,
  "reckless-rocketeer": 2,
  "boulderfist-ogre": 2,
  "core-hound": 2,
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
];
