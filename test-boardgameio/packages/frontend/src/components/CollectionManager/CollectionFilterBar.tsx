import { twMerge } from "tailwind-merge";
import { useAudioStore } from "@/stores/audioStore";
import { MANA_BUCKETS, manaCrystal } from "./constants";

interface Props {
  selectedManaFilter: number | null;
  searchQuery: string;
  onSelectManaFilter: (bucket: number) => void;
  onSearch: (query: string) => void;
}

/** Mana-cost crystals and the fuzzy search box beneath the collection. */
const CollectionFilterBar = ({
  selectedManaFilter,
  searchQuery,
  onSelectManaFilter,
  onSearch,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <div className="absolute left-[19.3vw] top-[86.5vh] w-[56vw] h-[9vh] flex items-center gap-[5vw] px-[1vw]">
      <div className="flex items-center gap-[0.43vw]">
        {MANA_BUCKETS.map((bucket) => (
          <button
            key={bucket}
            onClick={() => onSelectManaFilter(bucket)}
            onMouseEnter={() => playSfx("button-over")}
            title={bucket === 7 ? "7 or more mana" : `${bucket} mana`}
            className={twMerge(
              "relative w-[2.2vw] h-[2.2vw] flex items-center justify-center transition-all duration-200 hover:brightness-200 cursor-pointer",
              selectedManaFilter === bucket ? "brightness-300" : "",
            )}
          >
            <img
              src={manaCrystal}
              className="absolute w-full h-full object-cover scale-100 brightness-90 select-none"
              draggable={false}
              alt=""
            />
            <span className="relative z-20 text-white text-[1vw] font-extrabold font-belwe scale-150 translate-y-[-5%] translate-x-[-5%] text-shadow-A">
              {bucket}
              {bucket === 7 && (
                <span className="translate-x-[60%] absolute">+</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search cards..."
        className="flex-1 max-w-[12vw] px-[0.8vw] py-[0.4vw] rounded-lg text-[1vw] placeholder:text-amber-100/40 outline-none text-white"
      />
    </div>
  );
};

export default CollectionFilterBar;
