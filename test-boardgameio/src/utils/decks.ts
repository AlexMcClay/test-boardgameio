import type { Card } from "@/types";
import { createCardFromID } from ".";

export const warriorDeck = () => {
  const deck = [];
  deck.push(createCardFromID("charge"));
  deck.push(createCardFromID("charge"));
  deck.push(createCardFromID("flame-imp"));
  deck.push(createCardFromID("flame-imp"));
  deck.push(createCardFromID("murloc-raider"));
  deck.push(createCardFromID("murloc-raider"));
  deck.push(createCardFromID("frostwolf-grunt"));
  deck.push(createCardFromID("frostwolf-grunt"));
  deck.push(createCardFromID("wolfrider"));
  deck.push(createCardFromID("wolfrider"));
  deck.push(createCardFromID("murloc-tidehunter"));
  deck.push(createCardFromID("murloc-tidehunter"));
  deck.push(createCardFromID("razorfen-hunter"));
  deck.push(createCardFromID("razorfen-hunter"));
  deck.push(createCardFromID("dragonling-mechanic"));
  deck.push(createCardFromID("dragonling-mechanic"));
  deck.push(createCardFromID("senjin-shieldmasta"));
  deck.push(createCardFromID("senjin-shieldmasta"));
  deck.push(createCardFromID("boulderfist-ogre"));
  deck.push(createCardFromID("boulderfist-ogre"));

  return deck.filter((card) => card !== null) as Card[];
};

export const druidDeck = () => {
  const deck = [];
  deck.push(createCardFromID("mark-of-the-wild"));
  deck.push(createCardFromID("mark-of-the-wild"));
  deck.push(createCardFromID("innervate"));
  deck.push(createCardFromID("innervate"));
  deck.push(createCardFromID("druid-of-the-claw"));
  deck.push(createCardFromID("druid-of-the-claw"));
  deck.push(createCardFromID("river-crocolisk"));
  deck.push(createCardFromID("river-crocolisk"));
  deck.push(createCardFromID("boulderfist-ogre"));
  deck.push(createCardFromID("boulderfist-ogre"));
  deck.push(createCardFromID("darkscale-healer"));
  deck.push(createCardFromID("darkscale-healer"));
  deck.push(createCardFromID("nightblade"));
  deck.push(createCardFromID("nightblade"));
  deck.push(createCardFromID("elven-archer"));
  deck.push(createCardFromID("elven-archer"));
  deck.push(createCardFromID("core-hound"));
  deck.push(createCardFromID("core-hound"));
  deck.push(createCardFromID("silverback-patriarch"));
  deck.push(createCardFromID("silverback-patriarch"));

  return deck.filter((card) => card !== null) as Card[];
};
