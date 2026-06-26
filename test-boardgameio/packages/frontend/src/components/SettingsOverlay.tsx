import { AnimatePresence, motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
import { useViewStore } from "@/stores/viewStore";
import {
  IoClose,
  IoVolumeHigh,
  IoVolumeMute,
  IoMusicalNotes,
  IoMegaphone,
  IoLogOut,
} from "react-icons/io5";

interface UserProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileOverlay = ({ isOpen, onClose }: UserProfileOverlayProps) => {
  const musicVolume = useAudioStore((state) => state.musicVolume);
  const sfxVolume = useAudioStore((state) => state.sfxVolume);
  const isMuted = useAudioStore((state) => state.isMuted);
  const setMusicVolume = useAudioStore((state) => state.setMusicVolume);
  const setSfxVolume = useAudioStore((state) => state.setSfxVolume);
  const toggleMute = useAudioStore((state) => state.toggleMute);
  const playSfx = useAudioStore((state) => state.playSfx);

  const gameMode = useViewStore((state) => state.gameMode);
  const disconnectFromGame = useViewStore((state) => state.disconnectFromGame);

  const handleDisconnect = () => {
    playSfx("button-click");
    disconnectFromGame();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 p-[1.5vw] max-w-[35vw] w-full mx-[1vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-[0.8vw] right-[0.8vw] text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Close settings"
            >
              <IoClose className="w-[1.3vw] h-[1.3vw]" />
            </button>

            {/* Header */}
            <h2 className="text-[1.6vw] font-bold text-white mb-[1vw]">
              User Profile
            </h2>

            {/* Username Display */}
            <div className="mb-[1vw]">
              <p className="text-[1.2vw] text-gray-300">
                Username:{" "}
                <span className="font-semibold text-white">
                  {localStorage.getItem("user_name") || "Guest"}
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UserProfileOverlay;
