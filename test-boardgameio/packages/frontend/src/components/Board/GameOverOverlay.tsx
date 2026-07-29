import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
import { useViewStore } from "@/stores/viewStore";
import type { GameState, PlayerID } from "@project/shared";

interface Props {
  /** `ctx.gameover.winner` — a seat id, or "draw". */
  winner: PlayerID | "draw";
  G: GameState;
  /** The local seat. Null in hotseat, where nobody "lost". */
  playerID?: string | null;
}

/** Long enough for the banner to land before the screen invites a click. */
const PROMPT_DELAY_MS = 1200;

/**
 * End-of-game banner. Clicking anywhere tears the game down via the same
 * `disconnectFromGame` the settings overlay uses, so both exits land the player
 * back on the play screen in the same state.
 */
const GameOverOverlay = ({ winner, G, playerID }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const playSfxLoop = useAudioStore((state) => state.playSfxLoop);
  const stopSfxLoop = useAudioStore((state) => state.stopSfxLoop);
  const stopTrack = useAudioStore((state) => state.stopTrack);
  const disconnectFromGame = useViewStore((state) => state.disconnectFromGame);
  const [canDismiss, setCanDismiss] = useState(false);

  const isDraw = winner === "draw";
  const winningPlayer = isDraw ? null : G.players[winner];
  // Hotseat has no local seat, so there is no victory/defeat framing — both
  // players are at the same screen and one of them simply won.
  const isSpectating = !playerID;
  const hasWon = !isDraw && playerID === winner;

  const heading = isDraw
    ? "Draw"
    : isSpectating
      ? `${winningPlayer?.name} Wins`
      : hasWon
        ? "Victory"
        : "Defeat";

  // Gate the click briefly — otherwise a click still in flight from the killing
  // blow dismisses the screen before the player has read it.
  useEffect(() => {
    const timer = setTimeout(() => setCanDismiss(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // The victory set on a win, and in hotseat where somebody at this screen did
  // win; the defeat set otherwise. A draw gets the somber one.
  const isTriumphant = isSpectating || (!isDraw && hasWon);

  /**
   * Three layers: a one-shot whoosh, a one-shot jingle over it, and an ambient
   * bed that loops underneath until the player clicks away. Same lifecycle
   * dance as <DragCard> — the loop id arrives from a promise, so an unmount
   * that beats the resolution has to kill the loop after the fact or it plays
   * forever.
   */
  useEffect(() => {
    let isMounted = true;
    let activeLoopId: string | null = null;

    // The board music has no business playing under this.
    stopTrack();

    playSfx(isTriumphant ? "victory-start" : "defeat-start");
    playSfx(isTriumphant ? "victory-jingle" : "defeat-jingle");
    if (isTriumphant) playSfx("victory-fireworks");

    playSfxLoop(isTriumphant ? "victory-loop" : "defeat-loop", 0.1).then(
      (id) => {
        if (!isMounted) {
          stopSfxLoop(id);
          return;
        }
        activeLoopId = id;
      },
    );

    return () => {
      isMounted = false;
      if (activeLoopId) stopSfxLoop(activeLoopId);
    };
    // Fires once on mount; the outcome cannot change while this is up.
  }, []);

  const handleDismiss = () => {
    if (!canDismiss) return;
    playSfx("button-click");
    disconnectFromGame();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      onClick={handleDismiss}
      className="absolute inset-0 z-90 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[0.3vw] font-belwe select-none"
      style={{ cursor: canDismiss ? "pointer" : "default" }}
    >
      {/* Winner's hero, framed. Omitted on a draw — there is no face to show. */}
      {winningPlayer && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          className="relative mb-[1.5vw]"
        >
          <img
            src={winningPlayer.heroPortrait}
            alt={winningPlayer.name}
            draggable="false"
            className="w-[14vw] h-[14vw] object-cover rounded-full border-[0.35vw] border-[#c9a227] shadow-[0_0_3vw_rgba(201,162,39,0.6)]"
          />
        </motion.div>
      )}

      <motion.h1
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        className={`text-[6vw] leading-none tracking-wider drop-shadow-[0_0.3vw_0.4vw_rgba(0,0,0,0.9)] ${
          hasWon || isSpectating ? "text-[#f5d76e]" : "text-[#c94c4c]"
        }`}
      >
        {heading}
      </motion.h1>

      {!isDraw && !isSpectating && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-[0.5vw] text-[1.4vw] text-[#e0d5bd] drop-shadow-[0_0.15vw_0.2vw_rgba(0,0,0,0.9)]"
        >
          {winningPlayer?.name} wins the duel
        </motion.p>
      )}

      {/* Only appears once the click is actually live, so it never lies. */}
      {canDismiss && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[6vw] text-[1.2vw] tracking-[0.15em] uppercase text-[#e0d5bd] drop-shadow-[0_0.15vw_0.2vw_rgba(0,0,0,0.9)]"
        >
          Click to continue
        </motion.span>
      )}
    </motion.div>
  );
};

export default GameOverOverlay;
