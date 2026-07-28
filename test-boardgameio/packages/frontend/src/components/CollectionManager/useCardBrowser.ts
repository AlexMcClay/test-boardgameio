import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import {
  cardTemplates,
  type CardTemplate,
  type CardTemplateKey,
  type Hero,
} from "@project/shared";
import { FILTER_BY_CLASS_WHEN_BUILDING } from "@/stores/deckStore";
import { CARDS_PER_PAGE, type Mode } from "./constants";

export type CardEntry = [CardTemplateKey, CardTemplate];

const collectibleEntries = (
  Object.entries(cardTemplates) as CardEntry[]
).filter(([, card]) => card.isUncollectible !== true);

/**
 * Owns everything about browsing the collection: class filter, mana filter,
 * fuzzy search and pagination. Pulled out of CollectionManager because it is
 * self-contained state that the layout doesn't need to know the shape of.
 */
export function useCardBrowser(mode: Mode, selectedHero: Hero | null) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedManaFilter, setSelectedManaFilter] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(
        collectibleEntries.map(([id, card]) => ({ id, card })),
        {
          keys: [
            "card.title",
            "card.description",
            "card.type",
            "card.class",
            "card.set",
            "card.tags",
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [],
  );

  const matchedCardIds = useMemo(
    () =>
      searchQuery.trim()
        ? new Set(fuse.search(searchQuery).map((r) => r.item.id))
        : null,
    [searchQuery, fuse],
  );

  const filteredCards = useMemo(
    () =>
      collectibleEntries
        .filter(([, card]) => {
          // An explicit class pick always wins.
          if (selectedClass) return card.class === selectedClass;

          // While building, default to the hero's class plus neutrals.
          if (
            mode === "card-select" &&
            FILTER_BY_CLASS_WHEN_BUILDING &&
            selectedHero
          ) {
            return (
              card.class === selectedHero.class || card.class === "Neutral"
            );
          }

          return true;
        })
        .filter(([id]) => matchedCardIds === null || matchedCardIds.has(id))
        .filter(([, card]) => {
          if (selectedManaFilter === null) return true;
          const mana = card.baseMana ?? 0;
          return selectedManaFilter === 7
            ? mana >= 7
            : mana === selectedManaFilter;
        })
        .sort((a, b) => (a[1].baseMana ?? 0) - (b[1].baseMana ?? 0)),
    [selectedClass, selectedManaFilter, matchedCardIds, mode, selectedHero],
  );

  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  // Filters can shrink the list under the current page; clamp rather than
  // rendering a blank page.
  const page = Math.min(currentPage, Math.max(0, totalPages - 1));
  const displayedCards = filteredCards.slice(
    page * CARDS_PER_PAGE,
    page * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  function selectClass(className: string) {
    setSelectedClass((prev) => (prev === className ? null : className));
    setCurrentPage(0);
  }

  function selectManaFilter(bucket: number) {
    setSelectedManaFilter((prev) => (prev === bucket ? null : bucket));
    setCurrentPage(0);
  }

  function search(query: string) {
    setSearchQuery(query);
    setCurrentPage(0);
  }

  function reset() {
    setSelectedClass(null);
    setCurrentPage(0);
  }

  return {
    selectedClass,
    selectedManaFilter,
    searchQuery,
    currentPage: page,
    totalPages,
    displayedCards,
    selectClass,
    selectManaFilter,
    search,
    setCurrentPage,
    reset,
  };
}
