import { useEffect, useRef, useState } from "react";
import { type Hero, type SavedDeck } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import Deck from "../Deck";

interface Props {
  selectedHero: Hero;
  editingDeck: SavedDeck | null;
  deckName: string;
  totalCards: number;
  setDeckName: (name: string) => void;
  onCopyDeckString: () => void;
  /** Copies a shareable deck code. Resolves false if the clipboard refused. */
  onCopyDeckCode: () => Promise<boolean>;
  onDeckMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDeckMouseLeave: () => void;
}

/** The deck banner and its copy-code affordance, in editor mode. */
const DeckEditorControls = ({
  selectedHero,
  editingDeck,
  deckName,
  totalCards,
  setDeckName,
  onCopyDeckString,
  onCopyDeckCode,
  onDeckMouseEnter,
  onDeckMouseLeave,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
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

    </>
  );
};

export default DeckEditorControls;
