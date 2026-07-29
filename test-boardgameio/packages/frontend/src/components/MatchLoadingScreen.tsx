import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import HeroPortrait from "./HeroPortrait";
import { useDeckStore } from "@/stores/deckStore";
import { useAudioStore } from "@/stores/audioStore";

const backgroundImage = "assets/play_screen/background.png";

/** Grace period before the loading loop starts — see the effect below. */
const LOOP_START_DELAY = 350;

interface Props {
  /** The headline — "Starting Game", "Connecting to Match". */
  title: string;
  /** One quiet line under the bar saying what is actually being waited on. */
  detail?: string;
}

/**
 * The screen between hitting Play and the board appearing.
 *
 * Sits on the play screen's own background so leaving that screen reads as a
 * transition rather than a blank frame, and shows the hero the player just
 * picked so there's something to look at that they chose.
 *
 * The bar is deliberately indeterminate: none of the three things this covers
 * (booting the local machine, opening the socket, generating the opponent deck)
 * reports progress, and a fake percentage would be a lie.
 */
const MatchLoadingScreen = ({ title, detail }: Props) => {
  const selectedDeckForPlay = useDeckStore((s) => s.selectedDeckForPlay);
  const playSfxLoop = useAudioStore((s) => s.playSfxLoop);
  const stopSfxLoop = useAudioStore((s) => s.stopSfxLoop);
  const loopIdRef = useRef<string | null>(null);

  // The bar-filling loop the manifest already carries for exactly this moment.
  //
  // Held back briefly: a local game is often ready within a couple of frames,
  // and a loop that starts and stops that fast is just an audible click. Past
  // the delay the wait is long enough to be worth scoring.
  //
  // Same lifecycle dance as <DragCard> beyond that — the id arrives from a
  // promise, so an unmount that beats the resolution has to stop it after
  // the fact or it plays over the board forever.
  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      playSfxLoop("startgame-loop", 0.35).then((id) => {
        if (!isMounted) {
          stopSfxLoop(id);
          return;
        }
        loopIdRef.current = id;
      });
    }, LOOP_START_DELAY);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (loopIdRef.current) stopSfxLoop(loopIdRef.current);
      loopIdRef.current = null;
    };
  }, [playSfxLoop, stopSfxLoop]);

  const hero = selectedDeckForPlay?.hero;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-cover bg-center font-belwe select-none"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Darkened so the portrait and copy carry, rather than competing with
          the busy tavern art underneath. */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative flex flex-col items-center gap-[1.5vw]">
        {hero && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-[15vw] drop-shadow-[0_0.5vw_1vw_rgba(0,0,0,0.9)]"
          >
            <HeroPortrait
              src={hero.portrait}
              alt={`${hero.heroName} portrait`}
            />
          </motion.div>
        )}

        <div className="flex flex-col items-center">
          <h1 className="text-[2.6vw] leading-none text-[#f0e0c0] drop-shadow-[0_0.25vw_0.3vw_rgba(0,0,0,0.95)]">
            {title}
          </h1>
          {hero && (
            <span className="mt-[0.5vw] text-[1.1vw] tracking-[0.2em] uppercase text-[#b9a888] drop-shadow-[0_0.15vw_0.2vw_rgba(0,0,0,0.9)]">
              {hero.heroName} · {hero.class}
            </span>
          )}
        </div>

        {/* Indeterminate sweep — a band travelling the track, not a fill. */}
        <div className="relative h-[0.6vw] w-[26vw] overflow-hidden rounded-full border-[0.15vw] border-[#8d7037] bg-black/70">
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#f5d76e] to-transparent"
            animate={{ left: ["-33%", "100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {detail && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-[1vw] text-[#8a8073]"
          >
            {detail}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default MatchLoadingScreen;
