import { type Hero, type DeckString } from "../types";
import {
  druidHero,
  mageHero,
  paladinHero,
  rogueHero,
  warriorHero,
} from "./heros";

export const warriorDeckString: DeckString = {
  // Class / Spell Synergies (7 cards)
  "inner-rage": 2,
  charge: 2,
  "korkron-elite": 2,
  whirlwind: 2,

  // Mandatory Neutral Battlecry/Deathrattle Requirements (6 cards)
  "leper-gnome": 1,
  "loot-hoarder": 2,
  "novice-engineer": 2,

  // Valid Collectible Neutrals (17 cards - mixed 1s and 2s)
  "bluegill-warrior": 2,
  "bloodfen-raptor": 2,
  "river-crocolisk": 1,
  wolfrider: 2,
  "ironfur-grizzly": 2,
  "chillwind-yeti": 2,
  "senjin-shieldmasta": 2,
  "boulderfist-ogre": 2,
  "core-hound": 2,
}; // Total: 30 cards

export const druidDeckString: DeckString = {
  // Class Spells & Core Minions (9 cards)
  innervate: 2,
  "mark-of-the-wild": 2,
  "healing-touch": 1,
  starfire: 2,
  "ironbark-protector": 2,
  "force-of-nature": 2,

  // Mandatory Neutral Battlecry/Deathrattle Requirements (6 cards)
  "leper-gnome": 1,
  "loot-hoarder": 2,
  "novice-engineer": 2,

  // Valid Collectible Neutrals (15 cards - mixed 1s and 2s)
  "voodoo-doctor": 1,
  "bloodfen-raptor": 2,
  "river-crocolisk": 2,
  "ironfur-grizzly": 1,
  "silverback-patriarch": 2,
  "darkscale-healer": 2,
  "oasis-snapjaw": 2,
  "boulderfist-ogre": 2,
}; // Total: 30 cards

export const mageDeckString: DeckString = {
  // Class Spells & Core Removal (13 cards)
  frostbolt: 2,
  "arcane-intellect": 2,
  fireball: 2,
  arcane_explosion: 2,
  flamestrike: 1,
  "frost-nova": 2,
  "mirror-image-spell": 2, // Spell is collectible, token is not!
  blizzard: 1,

  // Mandatory Neutral Battlecry/Deathrattle Requirements (6 cards)
  "leper-gnome": 1,
  "loot-hoarder": 2,
  "novice-engineer": 2,

  // Valid Collectible Neutrals (11 cards - mixed 1s and 2s)
  "elven-archer": 2,
  "murloc-raider": 2,
  "chillwind-yeti": 1,
  "senjin-shieldmasta": 2,
  "gnomish-inventor": 2,
  sunwalker: 1,
  "boulderfist-ogre": 1,
}; // Total: 30 cards

export const paladinDeckString: DeckString = {
  // Class Spells & Minions (9 cards)
  "blessing-of-kings": 2,
  shielded_minibot: 2,
  "argent-protector": 2,
  "guardian-of-kings": 2,
  "hand-of-protection": 2,
  "tirion-fordring": 1, // Fittingly dropped to 1 copy as a Legendary feel!
  "lay-on-hands": 1,

  // Mandatory Neutral Battlecry/Deathrattle Requirements (6 cards)
  "loot-hoarder": 2,
  "novice-engineer": 2,

  // Valid Collectible Neutrals (15 cards - mixed 1s and 2s)
  "argent-squire": 2,
  "goldshire-footman": 2,
  "river-crocolisk": 1,
  "senjin-shieldmasta": 2,
  "darkscale-healer": 2,
  sunwalker: 2,
  "boulderfist-ogre": 2,
  "lord-of-the-arena": 1,
}; // Total: 30 cards

export const rogueDeckString: DeckString = {
  // Class Removal (2 cards)
  assassinate: 2,

  // Mandatory Neutral Battlecry/Deathrattle Requirements (6 cards)
  "leper-gnome": 2,
  "loot-hoarder": 2,
  "novice-engineer": 2,

  // Valid Collectible Neutrals (22 cards - mixed 1s and 2s)
  "elven-archer": 2,
  "voodoo-doctor": 2,
  "bloodfen-raptor": 2,
  "river-crocolisk": 2,
  "ironforge-rifleman": 1,
  wolfrider: 2,
  "chillwind-yeti": 2,
  "gnomish-inventor": 2,
  "booty-bay-bodyguard": 2,
  "reckless-rocketeer": 2,
  "boulderfist-ogre": 2,
  "core-hound": 1,
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
