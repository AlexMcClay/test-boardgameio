import { useEffect } from "react";
import { motion } from "motion/react";
import type { Player } from "@project/shared";
import HeroPortrait from "../HeroPortrait";
import { useAudioStore } from "@/stores/audioStore";

/** How long the matchup card holds before the mulligan takes over. */
export const VERSUS_OVERLAY_DURATION = 4000;

/** Let the portraits land before the announcer starts talking over them. */
const ANNOUNCER_LEAD_IN = 500;

/**
 * Beat between the three callouts. The clips are short — 0.64s to 1.05s — so
 * chained with no gap they run together as one breathless line. Lead-in plus
 * three clips plus two beats lands around 3.4s, inside the 5s hold with room
 * for the card to settle before the mulligan.
 */
const ANNOUNCER_GAP = 260;

interface Props {
  /** The local seat — bottom left, matching the in-game layout. */
  player: Player;
  /** The opponent — top right. */
  opponent: Player;
}

/**
 * The pre-game matchup card: both heroes, name and class, and the announcer
 * calling the fight.
 *
 * Purely presentational — the engine has already dealt the opening hands and is
 * sitting in the mulligan. GameBoard simply holds the mulligan overlay back
 * until this one is done.
 */
const VersusOverlay = ({ player, opponent }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  /**
   * "Your hero… versus… their hero", one after the other. `playSfx` resolves
   * when a sound FINISHES, so awaiting in sequence is all the timing this
   * needs — no hand-tuned delays that drift when a line is re-recorded.
   */
  useEffect(() => {
    let cancelled = false;

    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const announce = async () => {
      await wait(ANNOUNCER_LEAD_IN);

      // Every step re-checks: the overlay can be torn down mid-sequence, and
      // the rest of the callout must not play over the mulligan.
      const parts = [
        player.hero?.sfx?.announcer,
        [{ soundId: "announcer-versus" }],
        opponent.hero?.sfx?.announcer,
      ];

      for (const [index, lines] of parts.entries()) {
        if (index > 0) await wait(ANNOUNCER_GAP);
        for (const line of lines ?? []) {
          if (cancelled) return;
          await playSfx(line.soundId, line.volume);
        }
      }
    };

    announce();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-[0.2vw] font-belwe select-none pointer-events-none"
    >
      {/* Opponent, upper right — the same diagonal the board itself uses, so
          the eye already knows which seat is which before the game starts. */}
      <HeroCard
        player={opponent}
        className="top-[8vh] right-[20vw]"
        delay={0.15}
        from={{ x: 60, y: -40 }}
      />

      <motion.div
        initial={{ scale: 2.4, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.5, duration: 0.45, ease: "backOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9vw] leading-none text-[#c0261d] drop-shadow-[0_0.4vw_0.5vw_rgba(0,0,0,0.95)]"
        style={{ WebkitTextStroke: "0.15vw #2b0a06" }}
      >
        VS
      </motion.div>

      <HeroCard
        player={player}
        className="bottom-[8vh] left-[20vw]"
        delay={0.3}
        from={{ x: -60, y: 40 }}
      />
    </motion.div>
  );
};

/** One side of the matchup: portrait, hero name, class. */
const HeroCard = ({
  player,
  className,
  delay,
  from,
}: {
  player: Player;
  className: string;
  delay: number;
  from: { x: number; y: number };
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, ...from }}
    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className={`absolute flex flex-col items-center gap-[0.8vw] ${className}`}
  >
    <div className="w-[16vw] drop-shadow-[0_0.5vw_1vw_rgba(0,0,0,0.9)]">
      <HeroPortrait
        src={player.heroPortrait}
        alt={`${player.hero?.heroName ?? player.name} portrait`}
      />
    </div>

    <div className="flex flex-col items-center">
      <span className="text-[2vw] leading-none text-[#f0e0c0] drop-shadow-[0_0.2vw_0.25vw_rgba(0,0,0,0.95)]">
        {player.hero?.heroName ?? player.name}
      </span>
      <span className="mt-[0.35vw] text-[1.1vw] tracking-[0.2em] uppercase text-[#b9a888] drop-shadow-[0_0.15vw_0.2vw_rgba(0,0,0,0.95)]">
        {player.hero?.class}
      </span>
      {/* The account behind the hero, kept quiet so the matchup reads first. */}
      <span className="mt-[0.5vw] text-[0.95vw] text-[#8a8073]">
        {player.name}
      </span>
    </div>
  </motion.div>
);

export default VersusOverlay;
