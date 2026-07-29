import { twMerge } from "tailwind-merge";
import type { Hero } from "@project/shared";
import { classIcons } from "@/utils";
import { FILTER_BY_CLASS_WHEN_BUILDING } from "@/stores/deckStore";
import type { Mode } from "./constants";

interface Props {
  mode: Mode;
  selectedHero: Hero | null;
  activeClass: string | null;
  availableClasses: Map<string, number>;
  onSelectClass: (className: string) => void;
}

/**
 * The row of class crests across the top of the collection sheet. They are
 * bookmarks, not filters: clicking one jumps to that class's first page, and
 * the crest for whatever class is on screen stays raised.
 */
const ClassFilterBar = ({
  mode,
  selectedHero,
  activeClass,
  availableClasses,
  onSelectClass,
}: Props) => {
  const icons = classIcons.filter((icon) => {
    // While building, only the hero's own class and neutrals are relevant.
    if (
      mode === "card-select" &&
      FILTER_BY_CLASS_WHEN_BUILDING &&
      selectedHero
    ) {
      return icon.name === selectedHero.class || icon.name === "Neutral";
    }
    return true;
  });

  return (
    <div className="absolute h-[5.9vh] w-[56vw] left-[12.6vw] top-[1vh] pl-[1vw] flex items-end gap-[0.5vw]">
      {icons.map((icon) => {
        // Filters can leave a class with no cards at all — nothing to jump to.
        const hasCards = availableClasses.has(icon.name);

        return (
        <button
          key={icon.name}
          onClick={() => hasCards && onSelectClass(icon.name)}
          title={icon.name}
          className={twMerge(
            "bg-black h-[2.7vw] w-[2.7vw] rounded-[50%/20%] overflow-hidden border border-[#b7a27e] border-x-[0.25vw] border-t-[0.25vw]  transition-all duration-200 origin-bottom",
            hasCards ? "hover:scale-110 cursor-pointer" : "opacity-40",
            activeClass === icon.name ? "scale-125 hover:scale-125" : "",
          )}
          style={{ clipPath: "inset(0px 0px 20% 0px)" }}
        >
          <img
            src={icon.icon}
            className="w-full h-full object-cover select-none"
            alt={icon.name}
            draggable={false}
          />
        </button>
        );
      })}
    </div>
  );
};

export default ClassFilterBar;
