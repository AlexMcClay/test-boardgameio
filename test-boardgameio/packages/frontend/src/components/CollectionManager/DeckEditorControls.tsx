import { useEffect, useRef, useState } from "react";
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
  /** Copies a shareable deck code. Resolves false if the clipboard refused. */
  onCopyDeckCode: () => Promise<boolean>;
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
  onCopyDeckCode,
  onDeckMouseEnter,
  onDeckMouseLeave,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const remaining = DECK_SIZE - totalCards;
  // An empty deck encodes to a code that decodeDeckCode rejects, so there is
  // nothing worth putting on the clipboard yet.
  const isEmpty = totalCards === 0;

  const [isHovered, setIsHovered] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const copyResetRef = useRef<NodeJS.Timeout | null>(null);

  // Don't let a pending "Copied!" reset fire into an unmounted component.
  useEffect(
    () => () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    },
    [],
  );

  async function handleCopyClick() {
    playSfx("button-click");
    const ok = await onCopyDeckCode();

    setCopyState(ok ? "copied" : "failed");
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <>
      {/* The Copy button lives inside the hover region so moving onto it
          doesn't count as leaving the deck. */}
      <div
        className="absolute top-0 left-[72vw] z-50 pb-[1vw]"
        onMouseEnter={(e) => {
          setIsHovered(true);
          onDeckMouseEnter(e);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onDeckMouseLeave();
        }}
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

        {isHovered && (
          <button
            onClick={handleCopyClick}
            onMouseEnter={() => !isEmpty && playSfx("button-over")}
            disabled={isEmpty}
            title={
              isEmpty
                ? "Add some cards first"
                : "Copy a shareable deck code to your clipboard"
            }
            className="mt-[0.3vw] w-[10vw] py-[0.2vw] rounded bg-black/80 border border-[#8d7037] text-amber-200 text-[0.8vw] font-bold transition-all duration-150 enabled:hover:bg-black enabled:hover:border-amber-500 enabled:hover:text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copyState === "copied"
              ? "Copied!"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy"}
          </button>
        )}
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
