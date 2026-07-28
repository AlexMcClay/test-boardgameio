import { useState } from "react";
import {
  cardTemplates,
  completeDeck,
  countCards,
  generateDeck,
  maxCopies,
  DECK_SIZE,
  type CardTemplateKey,
  type DeckString,
  type Hero,
  type SavedDeck,
} from "@project/shared";

/**
 * Owns the deck currently being edited: which hero, its name, its contents,
 * and the actions that mutate it. The heavy deck-building heuristics live in
 * shared/game/utils/deckBuilder so they can be unit tested without React.
 */
export function useDeckEditor() {
  const [editingDeck, setEditingDeck] = useState<SavedDeck | null>(null);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deck, setDeck] = useState<DeckString>({});

  const totalCards = countCards(deck);
  const isFull = totalCards >= DECK_SIZE;

  /** Start a brand new deck for `hero`, optionally seeded from a decklist. */
  function startNewDeck(hero: Hero, from?: { name: string; deckString: DeckString }) {
    setSelectedHero(hero);
    setEditingDeck(null);
    setDeckName(from ? `${from.name} Copy` : "");
    // Copy the deck string — never hold a reference to the source decklist.
    setDeck(from ? { ...from.deckString } : {});
  }

  /** Open an existing saved deck for editing. */
  function startEditingDeck(savedDeck: SavedDeck) {
    setEditingDeck(savedDeck);
    setSelectedHero(savedDeck.hero);
    setDeckName(savedDeck.name);
    setDeck({ ...savedDeck.deckString });
  }

  function clearEditor() {
    setEditingDeck(null);
    setSelectedHero(null);
    setDeckName("");
    setDeck({});
  }

  function setCardCount(cardId: CardTemplateKey, count: number) {
    setDeck((prev) => {
      const next = { ...prev };
      if (count > 0) {
        next[cardId] = count;
      } else {
        delete next[cardId];
      }
      return next;
    });
  }

  /** Add one copy, respecting the per-card and per-deck limits. */
  function addCard(cardId: CardTemplateKey) {
    const template = cardTemplates[cardId];
    if (!template) return;

    const current = deck[cardId] ?? 0;
    if (current >= maxCopies(template)) return;
    if (totalCards >= DECK_SIZE) return;

    setCardCount(cardId, current + 1);
  }

  function removeCard(cardId: CardTemplateKey) {
    const current = deck[cardId] ?? 0;
    if (current > 0) setCardCount(cardId, current - 1);
  }

  /** Replace the whole deck with a freshly balanced one. */
  function generate() {
    if (!selectedHero) return;
    setDeck(generateDeck(selectedHero.class));
  }

  /**
   * Keep what the player has picked and fill the rest, balancing the mana
   * curve and the minion/spell split.
   */
  function complete() {
    if (!selectedHero) return;
    setDeck((prev) => completeDeck(prev, selectedHero.class));
  }

  /** Build the SavedDeck to persist, or null if the form isn't valid yet. */
  function buildSavedDeck(): SavedDeck | null {
    if (!deckName.trim() || !selectedHero) return null;
    return {
      id: editingDeck?.id ?? `user-${Date.now()}`,
      name: deckName.trim(),
      hero: selectedHero,
      deckString: deck,
    };
  }

  return {
    editingDeck,
    selectedHero,
    deckName,
    deck,
    totalCards,
    isFull,
    setDeckName,
    startNewDeck,
    startEditingDeck,
    clearEditor,
    addCard,
    removeCard,
    generate,
    complete,
    buildSavedDeck,
  };
}
