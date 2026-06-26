import { useAudioStore } from "@/stores/audioStore";
import { useViewStore } from "@/stores/viewStore";
import { useEffect, useState } from "react";
import SettingsOverlay from "./SettingsOverlay";
import SettingsButton from "./SettingsButton";
import UserProfileButton from "./UserProfileButton";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import UserProfileOverlay from "./UserProfileOverlay";

const backgroundImage = "assets/menu/main_menu.png";

const MainMenu = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const playSfx = useAudioStore((state) => state.playSfx);
  const setView = useViewStore((state) => state.setView);

  useBackgroundMusic({
    autoplay: true,
  });

  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);

  useEffect(() => {
    setGlobalTrack("assets/audio/music/01_Main_Theme.mp3");
  }, [setGlobalTrack]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: "center",
      }}
    >
      {/* Main circular container */}
      <div className="relative flex flex-col items-center justify-center w-[32vw] h-[32vw]">
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-[1vw] w-[24vw] font-belwe">
          {/* Play Button */}
          <button
            onClick={() => {
              playSfx("button-click");
              setView("play");
            }}
            onMouseEnter={() => {
              playSfx("button-over");
            }}
            className="relative  w-[20vw] py-[0.25vw] px-[2.5vw] bg-[#bda393] rounded-[1.5vw/1vw] border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110"
          >
            <span className="text-[2.25vw] font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]">
              Play
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-[1.5vw/1vw] border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-[1.5vw/1vw] border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
          </button>

          {/* Collection Button */}
          <button
            onClick={() => {
              playSfx("button-click");
              setView("collection");
            }}
            onMouseEnter={() => {
              playSfx("button-over");
            }}
            className="relative w-[20vw] py-[0.25vw] px-[2.5vw] bg-[#bda393] rounded-[1.5vw/1vw] border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110"
          >
            <span className="text-[2.25vw] font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]">
              Collection
            </span>
            {/* Bevel effect */}
            <div className="absolute inset-0 rounded-[1.5vw/1vw] border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-[1.5vw/1vw] border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
          </button>
        </div>
      </div>
      {/* User Profile Button */}
      <UserProfileButton setIsProfileOpen={setIsProfileOpen} />

      {/* Settings Button */}
      <SettingsButton setIsSettingsOpen={setIsSettingsOpen} />

      {/* Settings Overlay */}
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      {/* User Profile Overlay */}
      <UserProfileOverlay
        isOpen={isProfileOpen}
        isEditing={isEditingProfile}
        setIsEditing={setIsEditingProfile}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default MainMenu;
