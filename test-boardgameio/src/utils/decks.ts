import type { Card } from "@/types";
import { createCardFromID, createCardInstance } from ".";

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

    return deck.filter((card) => card !== null) as Card[];
};
