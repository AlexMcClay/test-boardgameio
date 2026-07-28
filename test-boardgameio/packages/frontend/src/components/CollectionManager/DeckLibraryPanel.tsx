import type { SavedDeck } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import Deck from "../Deck";

interface Props {
  decks: SavedDeck[];
  onEditDeck: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    deck: SavedDeck,
  ) => void;
  onDeleteDeck: (deckId: string, e: React.MouseEvent) => void;
  onCreateNewDeck: () => void;
}

/** Viewer mode: the player's decks down the right-hand side. */
const DeckLibraryPanel = ({
  decks,
  onEditDeck,
  onDeleteDeck,
  onCreateNewDeck,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <>
      <div className="flex flex-col gap-[1.5vw] w-full items-center">
        {decks.map((savedDeck) => (
          <Deck
            type="collectionManager"
            key={savedDeck.id}
            handleEditDeck={(e) => onEditDeck(e, savedDeck)}
            image={savedDeck.hero.portrait}
            name={savedDeck.name}
            id={savedDeck.id}
            handleDeleteDeck={onDeleteDeck}
          />
        ))}

        {decks.length === 0 && (
          <p className="text-[0.9vw] text-amber-200/70 text-center px-[0.5vw] py-[1vw]">
            You have no decks. Create one to start playing.
          </p>
        )}
      </div>

      <button
        onMouseEnter={() => playSfx("button-over")}
        className="warrior-button w-full p-[0.5vw] text-[1vw] text-amber-200 mt-[1vw]"
        onClick={onCreateNewDeck}
      >
        Create New Deck
      </button>
    </>
  );
};

export default DeckLibraryPanel;
