import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onReorderDecks: (activeId: string, overId: string) => void;
}

interface SortableDeckProps {
  savedDeck: SavedDeck;
  onEditDeck: Props["onEditDeck"];
  onDeleteDeck: Props["onDeleteDeck"];
}

const SortableDeck = ({
  savedDeck,
  onEditDeck,
  onDeleteDeck,
}: SortableDeckProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: savedDeck.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        // Translate, not Transform: the latter folds in dnd-kit's scale
        // factors, which drifts the tile away from the cursor.
        transform: CSS.Translate.toString(transform),
        // The dragged tile must track the pointer with no easing; only the
        // tiles shuffling out of its way should animate.
        transition: isDragging ? undefined : transition,
        // Lift the deck being dragged above the ones it slides past.
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
      className="w-full flex justify-center touch-none"
      {...attributes}
      {...listeners}
    >
      <Deck
        type="collectionManager"
        handleEditDeck={(e) => onEditDeck(e, savedDeck)}
        image={savedDeck.hero.portrait}
        name={savedDeck.name}
        id={savedDeck.id}
        handleDeleteDeck={onDeleteDeck}
      />
    </div>
  );
};

/** Viewer mode: the player's decks down the right-hand side, drag to reorder. */
const DeckLibraryPanel = ({
  decks,
  onEditDeck,
  onDeleteDeck,
  onCreateNewDeck,
  onReorderDecks,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  // Just enough of a threshold to keep plain clicks (open the deck, delete it)
  // from being swallowed by the drag sensor, without a noticeable dead zone.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderDecks(String(active.id), String(over.id));
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={decks.map((deck) => deck.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-[1.5vw] w-full items-center">
            {decks.map((savedDeck) => (
              <SortableDeck
                key={savedDeck.id}
                savedDeck={savedDeck}
                onEditDeck={onEditDeck}
                onDeleteDeck={onDeleteDeck}
              />
            ))}

            {decks.length === 0 && (
              <p className="text-[0.9vw] text-amber-200/70 text-center px-[0.5vw] py-[1vw]">
                You have no decks. Create one to start playing.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

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
