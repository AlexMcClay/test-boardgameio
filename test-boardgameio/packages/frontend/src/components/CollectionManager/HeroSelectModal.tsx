import { heros, type Hero } from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";

interface Props {
  onSelectHero: (hero: Hero) => void;
  onCancel: () => void;
}

/** Step 1 of creating a deck: pick the class. */
const HeroSelectModal = ({ onSelectHero, onCancel }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-[#2a1810] border-4 border-amber-900 rounded-lg p-[2vw] max-w-[60vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[2vw] font-bold text-amber-300 text-center mb-[2vw]">
          Select a Hero
        </h2>

        <div className="grid grid-cols-3 gap-[1vw]">
          {heros.map((hero) => (
            <button
              key={hero.heroName}
              onClick={() => onSelectHero(hero)}
              onMouseEnter={() => playSfx("button-over")}
              className="flex flex-col items-center gap-[0.5vw] p-[1vw] rounded border-2 border-amber-900 hover:border-amber-500 transition-all hover:scale-105 bg-black/40"
            >
              <img
                src={hero.portrait}
                alt={hero.heroName}
                className="w-[8vw] h-[8vw] rounded-full border-4 border-amber-900 select-none"
                draggable={false}
              />
              <span className="text-[1vw] text-amber-200 text-center">
                {hero.heroName}
              </span>
              <span className="text-[0.8vw] text-gray-400">{hero.class}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          onMouseEnter={() => playSfx("button-over")}
          className="mt-[2vw] w-full warrior-button p-[0.5vw] text-[1vw] text-amber-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default HeroSelectModal;
