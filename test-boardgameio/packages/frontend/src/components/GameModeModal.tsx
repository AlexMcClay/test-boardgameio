import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useAudioStore } from "@/stores/audioStore";
import type { GameMode } from "@/stores/viewStore";

interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: GameMode) => void;
}

const GameModeModal = ({
  isOpen,
  onClose,
  onSelectMode,
}: GameModeModalProps) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  const handleSelectMode = (mode: GameMode) => {
    playSfx("button-click");
    onSelectMode(mode);
  };

  const handleClose = () => {
    playSfx("button-click");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={handleClose}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              duration: 0.4,
            }}
            className="relative flex flex-col items-center gap-[2vw] p-[3vw] max-w-[45vw] w-full mx-[2vw] font-belwe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Panel */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/95 via-amber-800/95 to-amber-900/95 rounded-2xl border-[0.4vw] border-amber-600 shadow-[0_0_3vw_rgba(0,0,0,0.9),inset_0_0_2vw_rgba(0,0,0,0.5)]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-[2vw] w-full">
              {/* Title */}
              <h2 className="text-[3vw] font-bold text-amber-100 drop-shadow-[0_0.3vw_0.3vw_rgba(0,0,0,0.8)] text-center">
                Choose Game Mode
              </h2>

              {/* Game Mode Buttons */}
              <div className="flex flex-col gap-[1.5vw] w-full">
                {/* Player vs Player Button */}
                <button
                  onClick={() => handleSelectMode("pvp")}
                  onMouseEnter={() => playSfx("button-over")}
                  className="relative py-[1.5vw] px-[2vw] bg-[#bda393] rounded-xl border-[0.3vw] border-[#8d7037] shadow-[0_0.5vw_0_rgba(92,64,51,1),0_0.8vw_2vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.2vw] hover:shadow-[0_0.3vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6)] hover:brightness-110"
                >
                  <span className="text-[2vw] font-bold text-stone-800 drop-shadow-[0_0.15vw_0.15vw_rgba(255,255,255,0.3)]">
                    Player vs Player
                  </span>
                  <div className="absolute inset-0 rounded-xl border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
                  <div className="absolute inset-0 rounded-xl border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
                </button>

                {/* Play vs AI Button */}
                <button
                  onClick={() => handleSelectMode("ai")}
                  onMouseEnter={() => playSfx("button-over")}
                  className="relative py-[1.5vw] px-[2vw] bg-[#bda393] rounded-xl border-[0.3vw] border-[#8d7037] shadow-[0_0.5vw_0_rgba(92,64,51,1),0_0.8vw_2vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.2vw] hover:shadow-[0_0.3vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6)] hover:brightness-110"
                >
                  <span className="text-[2vw] font-bold text-stone-800 drop-shadow-[0_0.15vw_0.15vw_rgba(255,255,255,0.3)]">
                    Play vs AI
                  </span>
                  <div className="absolute inset-0 rounded-xl border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
                  <div className="absolute inset-0 rounded-xl border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
                </button>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleClose}
                onMouseEnter={() => playSfx("button-over")}
                className="relative py-[1vw] px-[2vw] bg-[#9d8573] rounded-lg border-[0.25vw] border-[#6d5437] shadow-[0_0.3vw_0_rgba(72,54,41,1)] transition-all duration-200 hover:translate-y-[0.1vw] hover:shadow-[0_0.15vw_0_rgba(72,54,41,1)] hover:brightness-110"
              >
                <span className="text-[1.3vw] font-bold text-stone-800">
                  Cancel
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default GameModeModal;
