import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useAudioStore } from "@/stores/audioStore";
import type { GameMode } from "@/stores/viewStore";

interface GameModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: GameMode) => void;
}

const parchment = "assets/gamemode_parchment.png";
const aiIcon = "assets/icons/Icon_Standard.webp";
const pvpIcon = "assets/icons/Icon_Duels.webp";

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
          <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" />

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

            {/* Content */}
            <div className="relative z-10 flex items-center gap-[2vw] w-full">
              {/* Title */}
              {/* Game Mode Buttons */}
              <div className="flex  gap-[1.5vw] w-full">
                {/* Player vs Player Button */}

                <div
                  className="flex items-center justify-center flex-col relative w-[20vw] min-w-[20vw] gameMode"
                  onClick={() => handleSelectMode("pvp")}
                  onMouseEnter={() => playSfx("button-over")}
                >
                  <img src={pvpIcon} className="w-[14vw]" />
                  <img className="ml-[1vw]" src={parchment} />
                  <div className=" absolute text-white top-[15vw] w-[8vw] ">
                    <p
                      className="text-[2vw] text-center"
                      style={{
                        WebkitTextStroke: "0.1vw black",
                        textShadow: "0 1px 0px black",
                      }}
                    >
                      PvP
                    </p>
                    <hr className="w-full border-black" />
                    <p className="text-black text-[1vw] text-center">
                      Player vs Player
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-center flex-col relative w-[20vw] min-w-[20vw] gameMode"
                  onClick={() => handleSelectMode("ai")}
                  onMouseEnter={() => playSfx("button-over")}
                >
                  <img src={aiIcon} className="w-[14vw]" />
                  <img className="ml-[1vw]" src={parchment} />
                  <div className=" absolute text-white top-[15vw] w-[8vw] ">
                    <p
                      className="text-[2vw] text-center"
                      style={{
                        WebkitTextStroke: "0.1vw black",
                        textShadow: "0 1px 0px black",
                      }}
                    >
                      AI
                    </p>
                    <hr className="w-full border-black" />
                    <p className="text-black text-[1vw] text-center">
                      Player vs AI
                    </p>
                  </div>
                </div>

                {/* Play vs AI Button */}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default GameModeModal;
