import type { Card } from "@/types";
import { nanoid } from "nanoid";
import { cardTemplates } from "./cards";

export function shuffleDeck(deck: Card[]): Card[] {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// cardFactory.ts

export function createCardInstance(template: Omit<Card, "id">): Card {
    return {
        ...template,
        id: nanoid(),
    };
}

export function createDeck(count: number): Card[] {
    const deck: Card[] = [];
    for (let i = 0; i < count; i++) {
        // Randomly select a card template
        const card = Object.values(cardTemplates)[
            Math.floor(Math.random() * Object.keys(cardTemplates).length)
        ];
        // Create a card instance from the template
        deck.push(createCardInstance(card));
    }
    return shuffleDeck(deck);
}

export function createCardFromID(id: string): Card | null {
    const cardTemplate = cardTemplates[id];
    if (!cardTemplate) {
        console.warn(`Card template with ID ${id} not found.`);
        return null;
    }
    return createCardInstance(cardTemplate);
}
