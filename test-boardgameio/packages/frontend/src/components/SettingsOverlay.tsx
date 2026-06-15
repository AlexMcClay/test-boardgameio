import { AnimatePresence, motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
import {
  IoClose,
  IoVolumeHigh,
  IoVolumeMute,
  IoMusicalNotes,
  IoMegaphone,
} from "react-icons/io5";

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsOverlay = ({ isOpen, onClose }: SettingsOverlayProps) => {
  const musicVolume = useAudioStore((state) => state.musicVolume);
  const sfxVolume = useAudioStore((state) => state.sfxVolume);
  const isMuted = useAudioStore((state) => state.isMuted);
  const setMusicVolume = useAudioStore((state) => state.setMusicVolume);
  const setSfxVolume = useAudioStore((state) => state.setSfxVolume);
  const toggleMute = useAudioStore((state) => state.toggleMute);

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
              Settings
            </h2>

            {/* Audio Settings */}
            <div className="flex flex-col gap-[1vw]">
              <h3 className="text-[1.1vw] font-semibold text-white">
                Audio Settings
              </h3>

              {/* Mute Toggle */}
              <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-[0.7vw]">
                <div className="flex items-center gap-[0.6vw]">
                  {isMuted ? (
                    <IoVolumeMute className="text-gray-300 w-[1.2vw] h-[1.2vw]" />
                  ) : (
                    <IoVolumeHigh className="text-gray-300 w-[1.2vw] h-[1.2vw]" />
                  )}
                  <span className="text-gray-200 font-medium text-[0.85vw]">
                    {isMuted ? "Unmute All" : "Mute All"}
                  </span>
                </div>
                <button
                  onClick={toggleMute}
                  className={`relative inline-flex items-center rounded-full transition-colors duration-200 h-[1.2vw] w-[2.3vw] ${
                    isMuted ? "bg-gray-600" : "bg-blue-600"
                  }`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <span
                    className={`inline-block rounded-full bg-white transition-transform duration-200 h-[0.8vw] w-[0.8vw] ${
                      isMuted ? "translate-x-[0.2vw]" : "translate-x-[1.3vw]"
                    }`}
                  />
                </button>
              </div>

              {/* Music Volume */}
              <div className="flex flex-col gap-[0.3vw]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[0.4vw]">
                    <IoMusicalNotes className="text-gray-300 w-[1vw] h-[1vw]" />
                    <label className="text-gray-200 font-medium text-[0.85vw]">
                      Music
                    </label>
                  </div>
                  <span className="text-gray-400 font-mono text-[0.75vw]">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume * 100}
                  onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                  disabled={isMuted}
                  className="w-full h-[0.4vw] bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
                />
              </div>

              {/* SFX Volume */}
              <div className="flex flex-col gap-[0.3vw]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[0.4vw]">
                    <IoMegaphone className="text-gray-300 w-[1vw] h-[1vw]" />
                    <label className="text-gray-200 font-medium text-[0.85vw]">
                      SFX
                    </label>
                  </div>
                  <span className="text-gray-400 font-mono text-[0.75vw]">
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume * 100}
                  onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                  disabled={isMuted}
                  className="w-full h-[0.4vw] bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsOverlay;
