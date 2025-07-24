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
        const cardTemplate =
            cardTemplates[Math.floor(Math.random() * cardTemplates.length)];
        // Create a card instance from the template
        deck.push(createCardInstance(cardTemplate));
    }
    return shuffleDeck(deck);
}
