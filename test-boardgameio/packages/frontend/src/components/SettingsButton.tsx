import { useAudioStore } from "@/stores/audioStore";
import React from "react";
import { IoSettings } from "react-icons/io5";

type Props = {
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SettingsButton = ({ setIsSettingsOpen }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <button
      onClick={() => {
        setIsSettingsOpen(true);
        playSfx("button-click");
      }}
      className="absolute bottom-[1vw] right-[1vw] bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50 p-[0.8vw]"
      aria-label="Open settings"
      onMouseEnter={() => {
        playSfx("button-over");
      }}
    >
      <IoSettings className="w-[1.5vw] h-[1.5vw]" />
    </button>
  );
};

export default SettingsButton;
