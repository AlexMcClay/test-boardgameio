import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import {
  cardTemplates,
  type CardTemplate,
  type CardTemplateKey,
  type Hero,
} from "@project/shared";
import { classIcons } from "@/utils";
import { FILTER_BY_CLASS_WHEN_BUILDING } from "@/stores/deckStore";
import { CARDS_PER_PAGE, type Mode } from "./constants";

export type CardEntry = [CardTemplateKey, CardTemplate];

const collectibleEntries = (
  Object.entries(cardTemplates) as CardEntry[]
).filter(([, card]) => card.isUncollectible !== true);

/** Class display order comes from the crest row; unknown classes sort last. */
const CLASS_ORDER = classIcons.map(({ name }) => name);
const classRank = (card: CardTemplate) => {
  const index = CLASS_ORDER.indexOf(card.class);
  return index === -1 ? CLASS_ORDER.length : index;
};

/**
 * Owns everything about browsing the collection: class filter, mana filter,
 * fuzzy search and pagination. Pulled out of CollectionManager because it is
 * self-contained state that the layout doesn't need to know the shape of.
 */
export function useCardBrowser(mode: Mode, selectedHero: Hero | null) {
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
        .sort(
          (a, b) =>
            classRank(a[1]) - classRank(b[1]) ||
            (a[1].baseMana ?? 0) - (b[1].baseMana ?? 0),
        ),
    [selectedManaFilter, matchedCardIds, mode, selectedHero],
  );

  /**
   * Pages never mix classes: each class starts on a fresh page, so a class
   * whose last page holds 5 cards simply leaves the remaining slots empty.
   */
  const { pages, classPages } = useMemo(() => {
    const pages: CardEntry[][] = [];
    const classPages = new Map<string, number>();

    for (const entry of filteredCards) {
      const className = entry[1].class;
      const lastPage = pages[pages.length - 1];
      const startsNewClass = !classPages.has(className);

      if (startsNewClass) classPages.set(className, pages.length);

      if (startsNewClass || !lastPage || lastPage.length === CARDS_PER_PAGE) {
        pages.push([entry]);
      } else {
        lastPage.push(entry);
      }
    }

    return { pages, classPages };
  }, [filteredCards]);

  const totalPages = pages.length;
  // Filters can shrink the list under the current page; clamp rather than
  // rendering a blank page.
  const page = Math.min(currentPage, Math.max(0, totalPages - 1));
  const displayedCards = pages[page] ?? [];

  /** The class crest to highlight: whichever class the current page shows. */
  const activeClass = displayedCards[0]?.[1].class ?? null;

  /** Class crests act as bookmarks — clicking one jumps to its first page. */
  function jumpToClass(className: string) {
    const target = classPages.get(className);
    if (target === undefined) return;
    setCurrentPage(target);
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
    setCurrentPage(0);
  }

  return {
    activeClass,
    availableClasses: classPages,
    selectedManaFilter,
    searchQuery,
    currentPage: page,
    totalPages,
    displayedCards,
    jumpToClass,
    selectManaFilter,
    search,
    setCurrentPage,
    reset,
  };
}
