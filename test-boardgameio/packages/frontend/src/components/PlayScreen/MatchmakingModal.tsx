import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useAudioStore } from "@/stores/audioStore";
import { useEffect, useRef } from "react";

interface MatchmakingModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

const MatchmakingModal = ({ isOpen, onCancel }: MatchmakingModalProps) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  const playSfxLoop = useAudioStore((state) => state.playSfxLoop);
  const stopSfxLoop = useAudioStore((state) => state.stopSfxLoop);
  const loopIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    let activeLoopId: string | null = null;

    playSfxLoop("startgame-loop", 0.2).then((id) => {
      // If the component unmounted while the promise was resolving,
      // immediately kill the audio loop we just created.
      if (!isMounted) {
        stopSfxLoop(id);
        return;
      }

      activeLoopId = id;
      loopIdRef.current = id;
    });

    // Cleanup function
    return () => {
      isMounted = false; // Prevents the .then() from saving the ID if it resolves late

      if (activeLoopId) {
        stopSfxLoop(activeLoopId);
      } else if (loopIdRef.current) {
        // Backup check in case it managed to sync-resolve
        stopSfxLoop(loopIdRef.current);
      }

      loopIdRef.current = null;
    };
  }, [playSfxLoop, stopSfxLoop, isOpen]);

  const handleCancel = () => {
    playSfx("button-click");
    onCancel();
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
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />

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
          >
            {/* Background Panel */}
            <div className="absolute inset-0 bg-black/50 rounded " />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-[2vw] w-full">
              {/* Title */}
              <h2 className="text-[3vw] font-bold text-amber-100 drop-shadow-[0_0.3vw_0.3vw_rgba(0,0,0,0.8)] text-center">
                Searching for Opponent
              </h2>

              {/* Loading Spinner */}
              <div className="relative w-[8vw] h-[8vw]">
                <motion.div
                  className="absolute inset-0 border-[0.5vw] border-amber-600 border-t-amber-300 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute inset-[1vw] border-[0.4vw] border-amber-700 border-t-amber-400 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>

              {/* Status Text */}
              <motion.p
                className="text-[1.5vw] text-amber-200 text-center"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Finding a worthy opponent...
              </motion.p>

              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                onMouseEnter={() => playSfx("button-over")}
                className="relative py-[1vw] px-[2vw] bg-[#9d8573] rounded-lg border-[0.25vw] border-[#6d5437] shadow-[0_0.3vw_0_rgba(72,54,41,1)] transition-all duration-200 hover:translate-y-[0.1vw] hover:shadow-[0_0.15vw_0_rgba(72,54,41,1)] hover:brightness-110"
              >
                <span className="text-[1.3vw] font-bold text-stone-800">
                  Cancel Search
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

export default MatchmakingModal;
