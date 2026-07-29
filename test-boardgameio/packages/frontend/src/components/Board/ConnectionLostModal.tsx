import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { useAudioStore } from "@/stores/audioStore";
import { useViewStore } from "@/stores/viewStore";

interface Props {
  /** Whether the socket is currently down. */
  isOpen: boolean;
}

/**
 * Grace period before the modal appears.
 *
 * The service reconnects on a 1.5s debounce, and a blip that heals on the first
 * retry shouldn't throw a modal over the board — that reads as a worse failure
 * than it was. Anything past this is a real interruption worth interrupting for.
 */
const SHOW_DELAY = 2000;

/**
 * Shown when the game's WebSocket drops mid-match.
 *
 * The service retries indefinitely on its own and `useGameConnection` re-sends
 * `game_join` on every reopen, so recovery needs nothing from the player —
 * this dismisses itself the moment the socket is back. The exit is for when it
 * doesn't come back.
 */
const ConnectionLostModal = ({ isOpen }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const disconnectFromGame = useViewStore((state) => state.disconnectFromGame);
  const [visible, setVisible] = useState(false);
  const [secondsDown, setSecondsDown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      setSecondsDown(0);
      return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY);
    const tick = setInterval(
      () => setSecondsDown((seconds) => seconds + 1),
      1000,
    );

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [isOpen]);

  const handleExit = () => {
    playSfx("button-click");
    // Same exit the settings overlay uses, so both land back on the play
    // screen in the same state — which is also what re-arms the socket.
    disconnectFromGame();
  };

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[250] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />

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
            <div className="absolute inset-0 bg-black/60 rounded" />

            <div className="relative z-10 flex flex-col items-center gap-[1.5vw] w-full">
              <h2 className="text-[2.6vw] font-bold text-amber-100 drop-shadow-[0_0.3vw_0.3vw_rgba(0,0,0,0.8)] text-center">
                Connection Lost
              </h2>

              <div className="relative w-[6vw] h-[6vw]">
                <motion.div
                  className="absolute inset-0 border-[0.4vw] border-red-900 border-t-red-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <motion.p
                className="text-[1.4vw] text-amber-200 text-center"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Reconnecting to the match…
              </motion.p>

              {/* Concrete evidence that something is still happening — an
                  indefinite spinner alone reads as hung. */}
              <p className="text-[1vw] text-stone-400 text-center">
                Disconnected for {secondsDown}s. The match is held on the server;
                you'll rejoin where you left off.
              </p>

              <button
                onClick={handleExit}
                onMouseEnter={() => playSfx("button-over")}
                className="relative py-[1vw] px-[2vw] bg-[#9d8573] rounded-lg border-[0.25vw] border-[#6d5437] shadow-[0_0.3vw_0_rgba(72,54,41,1)] transition-all duration-200 hover:translate-y-[0.1vw] hover:shadow-[0_0.15vw_0_rgba(72,54,41,1)] hover:brightness-110"
              >
                <span className="text-[1.3vw] font-bold text-stone-800">
                  Leave Match
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

export default ConnectionLostModal;
