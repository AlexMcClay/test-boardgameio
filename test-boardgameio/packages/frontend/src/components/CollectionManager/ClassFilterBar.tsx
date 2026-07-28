import { twMerge } from "tailwind-merge";
import type { Hero } from "@project/shared";
import { classIcons } from "@/utils";
import { FILTER_BY_CLASS_WHEN_BUILDING } from "@/stores/deckStore";
import type { Mode } from "./constants";

interface Props {
  mode: Mode;
  selectedHero: Hero | null;
  selectedClass: string | null;
  onSelectClass: (className: string) => void;
}

/** The row of class crests across the top of the collection sheet. */
const ClassFilterBar = ({
  mode,
  selectedHero,
  selectedClass,
  onSelectClass,
}: Props) => {
  const icons = classIcons.filter((icon) => {
    // While building, only the hero's own class and neutrals are relevant.
    if (mode === "card-select" && FILTER_BY_CLASS_WHEN_BUILDING && selectedHero) {
      return icon.name === selectedHero.class || icon.name === "Neutral";
    }
    return true;
  });

  return (
    <div className="absolute h-[5.9vh] w-[56vw] left-[12.6vw] top-[1vh] pl-[1vw] flex items-end gap-[0.5vw]">
      {icons.map((icon) => (
        <button
          key={icon.name}
          onClick={() => onSelectClass(icon.name)}
          title={icon.name}
          className={twMerge(
            "bg-black h-[2.7vw] w-[2.7vw] rounded-[50%/20%] overflow-hidden border border-[#b7a27e] border-x-4 border-t-4 transition-all duration-200 origin-bottom",
            "hover:scale-110 cursor-pointer",
            selectedClass === icon.name ? "scale-125 hover:scale-125" : "",
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
      ))}
    </div>
  );
};

export default ClassFilterBar;
