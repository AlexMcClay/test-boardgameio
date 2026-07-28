import { countCards, type DeckCodeDeck } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";

interface Props {
  deck: DeckCodeDeck;
  onYes: () => void;
  onNo: () => void;
}

/**
 * Offered when "Create New Deck" is pressed and the clipboard holds a deck
 * code. Answering No falls through to the normal hero-select flow.
 */
const ClipboardDeckModal = ({ deck, onYes, onNo }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const cardCount = countCards(deck.deckString);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onNo}
    >
      <div
        className="bg-[#2a1810] border-4 border-amber-900 rounded-lg p-[2vw] max-w-[32vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[2vw] font-bold text-amber-300 text-center">
          Create Deck
        </h2>
        <p className="text-[1vw] text-amber-100/80 text-center mt-[0.8vw]">
          Would you like to create a new deck with the deck in your clipboard?
        </p>

        <div className="flex items-center gap-[1vw] justify-center mt-[1.4vw] p-[0.8vw] rounded border-2 border-amber-900/60 bg-black/40">
          <img
            src={deck.hero.portrait}
            alt=""
            className="w-[4vw] h-[4vw] rounded-full border-2 border-amber-900 object-cover select-none"
            draggable={false}
          />
          <div className="flex flex-col">
            <span className="text-[1.1vw] text-amber-200">{deck.name}</span>
            <span className="text-[0.8vw] text-gray-400">
              {deck.hero.class} · {cardCount} card{cardCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex gap-[1vw] mt-[1.6vw]">
          <button
            onClick={onYes}
            onMouseEnter={() => playSfx("button-over")}
            className="flex-1 warrior-button p-[0.5vw] text-[1vw] text-amber-200"
          >
            Yes
          </button>
          <button
            onClick={onNo}
            onMouseEnter={() => playSfx("button-over")}
            className="flex-1 warrior-button p-[0.5vw] text-[1vw] text-amber-200"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClipboardDeckModal;
