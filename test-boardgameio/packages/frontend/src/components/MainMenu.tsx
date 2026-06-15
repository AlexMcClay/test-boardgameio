import { useAudioStore } from "@/stores/audioStore";
import { useViewStore } from "@/stores/viewStore";
import { useState } from "react";
import SettingsOverlay from "./SettingsOverlay";
import SettingsButton from "./SettingsButton";

const backgroundImage = "assets/menu/main_menu.png";

const MainMenu = () => {
  const [hoveredButton, setHoveredButton] = useState<
    "play" | "collection" | null
  >(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const playSfx = useAudioStore((state) => state.playSfx);
  const setView = useViewStore((state) => state.setView);

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
              setView("play");
            }}
            onMouseEnter={() => {
              setHoveredButton("play");
              playSfx("button-over");
            }}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              relative w-full py-6 px-8
              bg-[#bda393]
              rounded-lg
              border-4 border-[#8d7037]
              outline-2 outline-black
              shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
              transition-all duration-200
              ${hoveredButton === "play" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)] brightness-110" : ""}
            `}
          >
            <span className="text-4xl font-belwe font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] tracking-wide">
              Play
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
          </button>

          {/* Collection Button */}
          <button
            onClick={() => {
              playSfx("button-click");
              setView("collection");
            }}
            onMouseEnter={() => {
              playSfx("button-over");
              setHoveredButton("collection");
            }}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              relative w-full py-6 px-8
              bg-[#bda393]
              rounded-lg
              border-4 border-[#8d7037]
              outline-2 outline-black
              shadow-[0_6px_0_rgba(92,64,51,1),0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
              transition-all duration-200
              ${hoveredButton === "collection" ? "translate-y-1 shadow-[0_4px_0_rgba(92,64,51,1),0_6px_15px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.3)] brightness-110" : ""}
            `}
          >
            <span className="text-4xl font-belwe font-bold text-stone-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)] tracking-wide">
              Collection
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-lg border-t-2 border-l-2 border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-lg border-b-2 border-r-2 border-black/20 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Settings Button */}
      <SettingsButton setIsSettingsOpen={setIsSettingsOpen} />

      {/* Settings Overlay */}
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default MainMenu;
