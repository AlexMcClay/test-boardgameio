import {
  cardTemplates,
  countCards,
  starterDecks,
  type CardTemplate,
  type CardTemplateKey,
  type DeckString,
  type Hero,
} from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";

interface Props {
  hero: Hero;
  onStartEmpty: () => void;
  onCopyStarter: (starter: { name: string; deckString: DeckString }) => void;
  onBack: () => void;
}

/** A quick read on what the starter list is made of, for the preview card. */
function describe(deckString: DeckString): string {
  let minions = 0;
  let spells = 0;
  let weapons = 0;
  for (const [key, count] of Object.entries(deckString) as [
    CardTemplateKey,
    number,
  ][]) {
    const template: CardTemplate | undefined = cardTemplates[key];
    if (!template) continue;
    if (template.isMinion) minions += count;
    else if (template.isWeapon) weapons += count;
    else spells += count;
  }
  const parts = [`${minions} minions`, `${spells} spells`];
  if (weapons) parts.push(`${weapons} weapons`);
  return parts.join(" · ");
}

/**
 * Step 2 of creating a deck: start from the class's starter list, or from an
 * empty deck. The starter list is read from the static `starterDecks` export
 * rather than the player's collection, so it's still offered even if they
 * deleted or heavily edited their own copy.
 */
const DeckStartModal = ({
  hero,
  onStartEmpty,
  onCopyStarter,
  onBack,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const starter = starterDecks.find((deck) => deck.hero.class === hero.class);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onBack}
    >
      <div
        className="bg-[#2a1810] border-4 border-amber-900 rounded-lg p-[2vw] max-w-[46vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[2vw] font-bold text-amber-300 text-center">
          New {hero.class} Deck
        </h2>
        <p className="text-[0.9vw] text-gray-400 text-center mt-[0.3vw] mb-[1.6vw]">
          How would you like to start?
        </p>

        <div className="grid grid-cols-2 gap-[1.2vw]">
          {/* Copy the starter list */}
          <button
            disabled={!starter}
            onClick={() =>
              starter &&
              onCopyStarter({
                name: starter.name,
                deckString: starter.deckString,
              })
            }
            onMouseEnter={() => starter && playSfx("button-over")}
            className="flex flex-col items-center gap-[0.6vw] p-[1.2vw] rounded border-2 border-amber-900 bg-black/40 transition-all enabled:hover:border-amber-500 enabled:hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <img
              src={hero.portrait}
              alt=""
              className="w-[6vw] h-[6vw] rounded-full border-4 border-amber-900 select-none object-cover"
              draggable={false}
            />
            <span className="text-[1.1vw] text-amber-200">
              Copy Starter Deck
            </span>
            <span className="text-[0.75vw] text-gray-400 text-center leading-snug">
              {starter
                ? `A ready-to-play ${countCards(starter.deckString)}-card list you can edit freely.`
                : "No starter deck exists for this class."}
            </span>
            {starter && (
              <span className="text-[0.7vw] text-amber-300/70">
                {describe(starter.deckString)}
              </span>
            )}
          </button>

          {/* Start from nothing */}
          <button
            onClick={onStartEmpty}
            onMouseEnter={() => playSfx("button-over")}
            className="flex flex-col items-center gap-[0.6vw] p-[1.2vw] rounded border-2 border-amber-900 bg-black/40 transition-all hover:border-amber-500 hover:scale-105"
          >
            <div className="w-[6vw] h-[6vw] rounded-full border-4 border-dashed border-amber-900/70 flex items-center justify-center text-[2.5vw] text-amber-900">
              +
            </div>
            <span className="text-[1.1vw] text-amber-200">Start from Empty</span>
            <span className="text-[0.75vw] text-gray-400 text-center leading-snug">
              Build from scratch. Use Complete Deck any time to fill the rest.
            </span>
          </button>
        </div>

        <button
          onClick={onBack}
          onMouseEnter={() => playSfx("button-over")}
          className="mt-[1.6vw] w-full warrior-button p-[0.5vw] text-[1vw] text-amber-200"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default DeckStartModal;
