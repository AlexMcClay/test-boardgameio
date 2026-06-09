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
