import type { Hero } from "../types";

// individual hero definitions
export const warriorHero: Hero = {
  name: "Warrior",
  portrait: "assets/heros/Garrosh.jpg",
  class: "Warrior",
  heroName: "Garrosh Hellscream",
};

export const shamanHero: Hero = {
  name: "Shaman",
  portrait: "assets/heros/Thrall.jpg",
  class: "Shaman",
  heroName: "Thrall",
};

export const rogueHero: Hero = {
  name: "Rogue",
  portrait: "assets/heros/Valeera.jpg",
  class: "Rogue",
  heroName: "Valeera Sanguinar",
};

export const paladinHero: Hero = {
  name: "Paladin",
  portrait: "assets/heros/Uther.jpg",
  class: "Paladin",
  heroName: "Uther Lightbringer",
};

export const hunterHero: Hero = {
  name: "Hunter",
  portrait: "assets/heros/Rexxar.jpg",
  class: "Hunter",
  heroName: "Rexxar",
};

export const druidHero: Hero = {
  name: "Druid",
  portrait: "assets/heros/Malfurion.jpg",
  class: "Druid",
  heroName: "Malfurion Stormrage",
};

export const warlockHero: Hero = {
  name: "Warlock",
  portrait: "assets/heros/Gul'dan.jpg",
  class: "Warlock",
  heroName: "Gul'dan",
};

export const mageHero: Hero = {
  name: "Mage",
  portrait: "assets/heros/Jaina.jpg",
  class: "Mage",
  heroName: "Jaina Proudmoore",
};

export const priestHero: Hero = {
  name: "Priest",
  portrait: "assets/heros/Anduin.jpg",
  class: "Priest",
  heroName: "Anduin Wrynn",
};

// Bonus: Later additions to Hearthstone included in your folder
export const demonHunterHero: Hero = {
  name: "Demon Hunter",
  portrait: "assets/heros/Illidan_Stormrage.jpg",
  class: "Demon Hunter",
  heroName: "Illidan Stormrage",
};

export const deathKnightHero: Hero = {
  name: "Death Knight",
  portrait: "assets/heros/Arthas.jpg",
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
  demonHunterHero,
  deathKnightHero,
];
