import Card from "../Card";
import type { Card as CardType, CardTemplateKey } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import type { CardEntry } from "./useCardBrowser";
import type { Mode } from "./constants";

interface Props {
  mode: Mode;
  selectedClass: string | null;
  displayedCards: CardEntry[];
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onAddCard: (cardId: CardTemplateKey) => void;
  onZoomCard: (card: CardType, originRect: DOMRect) => void;
}

/** The paged 4×2 grid of collectible cards filling the open book. */
const CardCollectionPanel = ({
  mode,
  selectedClass,
  displayedCards,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onAddCard,
  onZoomCard,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const isEditing = mode === "card-select";

  return (
    <div
      onWheel={(e) => (e.deltaY > 0 ? onNextPage() : onPreviousPage())}
      className="flex flex-col w-[56vw] absolute h-[81vh] left-[12.6vw] top-[6vh] rounded-lg shadow-lg p-[1vw] px-[0.5vw] overflow-hidden"
    >
      <p className="absolute w-[12vw] h-[4vh] left-[21vw] top-[3.3vh] text-center text-[1.4vw]">
        {selectedClass || "All Classes"}
      </p>

      <div className="mt-[8vh] relative h-[69vh]">
        {/* Page-turn hot zones down each edge of the book */}
        <div
          onClick={onPreviousPage}
          className={`absolute left-0 top-0 h-full w-[5%] z-20 ${
            currentPage > 0 ? "cursor-e-resize" : "cursor-not-allowed opacity-50"
          } transition-all duration-200 flex items-center justify-center`}
        >
          {currentPage > 0 && (
            <div className="text-4xl text-amber-300 opacity-0 hover:opacity-100 transition-opacity">
              ‹
            </div>
          )}
        </div>

        <div
          onClick={onNextPage}
          className={`absolute right-0 top-0 h-full w-[5%] z-20 ${
            currentPage < totalPages - 1
              ? "cursor-e-resize"
              : "cursor-not-allowed opacity-50"
          } transition-all duration-200 flex items-center justify-center`}
        >
          {currentPage < totalPages - 1 && (
            <div className="text-4xl text-amber-300 opacity-0 hover:opacity-100 transition-opacity">
              ›
            </div>
          )}
        </div>

        <div className="card-grid grid grid-cols-4 grid-rows-2 gap-[2vw] px-[3vw] gap-y-[3vw] p-[1vw] items-center justify-center h-full">
          {displayedCards.map(([id, card]) => {
            const previewCard = {
              ...card,
              id,
              originalID: id,
              damageTaken: 0,
              attacksLeft: 1,
            } as CardType;

            return (
              <div
                key={id}
                className={
                  isEditing
                    ? "cursor-pointer z-10 transition-transform duration-200 hover:scale-105 minion-shadow"
                    : "z-10 minion-shadow"
                }
                onClick={() => isEditing && onAddCard(id)}
                onMouseEnter={() => isEditing && playSfx("card-over")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onZoomCard(previewCard, e.currentTarget.getBoundingClientRect());
                }}
              >
                <div className="w-[11.7vw] aspect-[5/7] items-center justify-center relative transition-all ease-in">
                  <div
                    className="scale-140 absolute origin-top-left minion-card"
                    onMouseEnter={() => playSfx("card-over")}
                  >
                    <Card
                      card={previewCard}
                      back={false}
                      isDragging={false}
                      type="game"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {displayedCards.length === 0 && (
            <div className="col-span-4 row-span-2">
              <p className="text-[2vw] text-center text-black/70">
                No Cards Available
              </p>
            </div>
          )}
        </div>

        <div className="absolute bottom-[-2vh] left-0 right-0 flex justify-center items-center py-2">
          <span className="text-black/60 text-[1.4vw] font-bold">
            Page {currentPage + 1}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardCollectionPanel;
