import { twMerge } from "tailwind-merge";
import {
  cardTemplates,
  DECK_SIZE,
  type Card as CardType,
  type CardTemplateKey,
  type DeckString,
} from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import { manaCrystal } from "./constants";

interface Props {
  deck: DeckString;
  totalCards: number;
  onRemoveCard: (cardId: CardTemplateKey) => void;
  onEntryMouseEnter: (
    e: React.MouseEvent<HTMLDivElement>,
    card: CardType,
  ) => void;
  onEntryMouseLeave: () => void;
}

/** Card-select mode: the decklist rows, sorted by mana cost. */
const DeckContentsPanel = ({
  deck,
  totalCards,
  onRemoveCard,
  onEntryMouseEnter,
  onEntryMouseLeave,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  const entries = (Object.entries(deck) as [CardTemplateKey, number][]).sort(
    ([a], [b]) =>
      (cardTemplates[a].baseMana ?? -1) - (cardTemplates[b].baseMana ?? -1),
  );

  return (
    <div
      className={twMerge(
        "flex flex-col w-full gap-[0.5vh] overflow-y-auto h-full rounded-[0.7vw]",
        // Glow once the deck is legal.
        totalCards === DECK_SIZE &&
          "ring-blue-500 ring-2 shadow-blue-400 shadow-[0px_0px_60px_rgba(0,0,0,0.5)]",
      )}
    >
      {entries.map(([key, count]) => {
        const template = cardTemplates[key];

        return (
          <div
            key={key}
            className="bg-gray-800 text-white w-full h-[3vh] min-h-[3vh] flex items-center relative shadow rounded transition-colors cursor-pointer hover:bg-gray-700"
            onClick={() => onRemoveCard(key)}
            onMouseEnter={(e) => {
              playSfx("card-over");
              onEntryMouseEnter(e, {
                ...template,
                id: `${key}-preview`,
                originalID: `${key}-preview`,
                damageTaken: 0,
              } as CardType);
            }}
            onMouseLeave={onEntryMouseLeave}
          >
            <img
              src={template.imageUrl}
              className={twMerge(
                "absolute h-[2.8vh] min-h-[2.8vh] w-[40%] right-0 select-none",
                "object-cover object-center",
                count > 1 && "right-[1.1vw]",
              )}
              style={{
                WebkitMaskImage:
                  "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
              }}
              draggable={false}
              alt=""
            />

            <div className="select-none absolute text-lg w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold shadow-md z-10">
              <img
                src={manaCrystal}
                alt=""
                className="object-cover w-full h-full absolute scale-100 brightness-90"
                draggable={false}
              />
              <span className="relative z-20 text-[1.1vw] font-extrabold font-belwe scale-160 translate-y-[-10%] translate-x-[-5%] text-shadow-A">
                {template.baseMana ?? ""}
              </span>
            </div>

            <span className="pl-[2vw] text-[0.8vw] z-20 text-shadow-A">
              {template.title}
            </span>

            {count > 1 && (
              <div className="absolute right-0 top-0 bg-gray-950 h-full flex items-center text-yellow-400 px-[0.3vw] rounded">
                {count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DeckContentsPanel;
