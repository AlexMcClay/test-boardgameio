import { DECK_SIZE, type Hero, type SavedDeck } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import Deck from "../Deck";
import { woodButtonClass, woodButtonLabelClass } from "./constants";

interface Props {
  selectedHero: Hero;
  editingDeck: SavedDeck | null;
  deckName: string;
  totalCards: number;
  isFull: boolean;
  setDeckName: (name: string) => void;
  onGenerate: () => void;
  onComplete: () => void;
  onCopyDeckString: () => void;
  onDeckMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDeckMouseLeave: () => void;
}

/** The deck banner and the build-assist buttons beside it, in editor mode. */
const DeckEditorControls = ({
  selectedHero,
  editingDeck,
  deckName,
  totalCards,
  isFull,
  setDeckName,
  onGenerate,
  onComplete,
  onCopyDeckString,
  onDeckMouseEnter,
  onDeckMouseLeave,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const remaining = DECK_SIZE - totalCards;

  return (
    <>
      <div
        className="absolute top-[0vh] left-[72vw] z-50"
        onMouseEnter={onDeckMouseEnter}
        onMouseLeave={onDeckMouseLeave}
        onContextMenu={(e) => {
          e.preventDefault();
          onCopyDeckString();
        }}
      >
        <Deck
          type="edit"
          key={editingDeck?.id}
          image={selectedHero.portrait}
          name={deckName}
          id={editingDeck?.id ?? "NEW DECK"}
          setDeckName={setDeckName}
        />
      </div>

      <div className="absolute top-[28vh] left-[86.5vw] z-50 flex flex-col gap-[0.5vw] items-start">
        <button
          onMouseEnter={() => playSfx("button-over")}
          className={`${woodButtonClass} px-[0.8vw] py-[0.4vw]`}
          onClick={onGenerate}
          title="Replace the whole deck with a freshly built one"
        >
          <span className={`${woodButtonLabelClass} text-[1vw] whitespace-nowrap`}>
            Generate Deck
          </span>
          <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
        </button>

        <button
          onMouseEnter={() => !isFull && playSfx("button-over")}
          className={`${woodButtonClass} px-[0.8vw] py-[0.4vw]`}
          onClick={onComplete}
          disabled={isFull}
          title={
            isFull
              ? "Deck is already full"
              : `Fill the remaining ${remaining} card${remaining === 1 ? "" : "s"}, balancing the mana curve and minion/spell mix`
          }
        >
          <span className={`${woodButtonLabelClass} text-[1vw] whitespace-nowrap`}>
            Complete Deck
          </span>
          <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
        </button>

        {!isFull && (
          <span className="text-[0.7vw] text-amber-200/60 whitespace-nowrap pl-[0.2vw]">
            {remaining} card{remaining === 1 ? "" : "s"} to go
          </span>
        )}
      </div>
    </>
  );
};

export default DeckEditorControls;
