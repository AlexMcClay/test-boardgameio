import { useAudioStore } from "@/stores/audioStore";
import { useState } from "react";

interface GameModeSelectorProps {
  onModeSelect: (mode: "pvp" | "ai") => void;
}

const backgroundImage = "assets/menu/main_menu.png";

const GameModeSelector = ({ onModeSelect }: GameModeSelectorProps) => {
  const [hoveredMode, setHoveredMode] = useState<"pvp" | "ai" | null>(null);

  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: "center",
      }}
    >
      {/* Main circular container */}
      <div className="relative flex flex-col items-center justify-center w-[600px] h-[600px]">
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6 w-[400px] font-belwe">
          {/* Play Button */}
          <button
            onClick={() => {
              playSfx("button-click");
              onModeSelect("pvp");
            }}
            onMouseEnter={() => {
              setHoveredMode("pvp");
              playSfx("button-over");
            }}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative w-full py-6 px-8
              bg-[#bda393]
              rounded-lg
              border-4 border-[#8d7037]
              outline-2 outline-black
              shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
              transition-all duration-200
              ${hoveredMode === "pvp" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)] brightness-110" : ""}
            `}
          >
            <span className="text-4xl font-belwe font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] tracking-wide">
              Play
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
          </button>

          {/* Play vs AI Button */}
          <button
            onClick={() => {
              playSfx("button-click");
              onModeSelect("ai");
            }}
            onMouseEnter={() => {
              playSfx("button-over");
              setHoveredMode("ai");
            }}
            onMouseLeave={() => setHoveredMode(null)}
            className={`
              relative w-full py-6 px-8
              bg-[#bda393]
              rounded-lg
              border-4 border-[#8d7037]
              outline-2 outline-black
              shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
              transition-all duration-200
              ${hoveredMode === "ai" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)] brightness-110" : ""}
            `}
          >
            <span className="text-4xl font-belwe font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] tracking-wide">
              Play vs AI
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelector;
