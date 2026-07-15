// Pre-game mulligan overlay, rendered above the board while G.mulligan.active.
// Stages: coin flip announcement → starting-hand selection (click to mark a
// card for replacement) → waiting for the opponent. Reads the ACTUAL game
// state (not the visual buffer) — the game proper hasn't started yet.
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Card as CardType, GameState } from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import { MULLIGAN_REVEAL_ANIMATION } from "@/utils/animationDurations";
import { getMulliganTurnDrawCardId } from "@/utils/mulliganEvents";
import Card from "../Card";
import { useAudioStore } from "@/stores/audioStore";

interface Props {
  G: GameState;
  moves: GameMoves;
  /** Seat this client controls; null = hotseat (both seats on this screen). */
  playerID: string | null;
}

const COIN_STAGE_MS = 2000;

const MulliganOverlay = ({ G, moves, playerID }: Props) => {
  const mulligan = G.mulligan;

  // Hotseat: act for the first unconfirmed seat, coin-toss winner first.
  const actingSeat = useMemo(() => {
    if (playerID !== null) return playerID;
    if (!mulligan) return "0";
    const second = mulligan.firstPlayer === "0" ? "1" : "0";
    return mulligan.confirmed[mulligan.firstPlayer]
      ? second
      : mulligan.firstPlayer;
  }, [playerID, mulligan]);
  const [stage, setStage] = useState<"coin" | "select">("coin");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Hand snapshot captured at confirm, shown while waiting for the opponent
  // so the replacement draws aren't spoiled before the completion reveal.
  const [frozen, setFrozen] = useState<{
    hand: CardType[];
    preIds: Set<string>;
  } | null>(null);
  // Set once the completion reveal has played; the overlay is done for good.
  const [done, setDone] = useState(false);
  // The first turn's drawn card is already in the real hand when the
  // completion sync arrives — it belongs to the game, not the mulligan, so
  // it must not appear in the reveal. Captured once at completion.
  const [revealExcludeId, setRevealExcludeId] = useState<string | null>(null);

  const playSfx = useAudioStore((state) => state.playSfx);

  // Fresh coin flip + selection whenever the acting seat changes (hotseat)
  useEffect(() => {
    setStage("coin");
    setSelected(new Set());
  }, [actingSeat]);

  useEffect(() => {
    if (stage !== "coin") return;
    playSfx("mulligan-coin-flip");
    const timer = setTimeout(() => setStage("select"), COIN_STAGE_MS);
    return () => clearTimeout(timer);
  }, [stage, actingSeat]);

  // Completion reveal: when both seats have confirmed, show the final hand
  // (replacement draws highlighted) for the reveal window, then hide the
  // overlay. Underneath, the matching mulliganEnd animation batches hold the
  // board's visual state until the overlay fades, then keep the animation
  // queue busy while the hands settle in (see useGameAnimation).
  const mulliganActive = mulligan?.active ?? false;
  useEffect(() => {
    if (!mulligan || mulliganActive || done) return;
    // Capture from the completion slice before any later move clears it
    setRevealExcludeId(getMulliganTurnDrawCardId(G.gameEvents));
    const timer = setTimeout(
      () => setDone(true),
      MULLIGAN_REVEAL_ANIMATION.duration,
    );
    return () => clearTimeout(timer);
  }, [mulligan, mulliganActive, done]);

  if (!mulligan || done) return null;

  const revealing = !mulligan.active;
  const goesFirst = actingSeat === mulligan.firstPlayer;
  const hand = G.players[actingSeat].hand;
  const iConfirmed = mulligan.confirmed[actingSeat];

  // During the flip only the base 3 cards show; the 4th card + The Coin
  // slide in after the "you go second" announcement (state already has them).
  // While waiting for the opponent the pre-confirm snapshot is shown; on
  // completion the live hand (with the replacement draws) is revealed.
  const visibleCards = revealing
    ? hand.filter((c) => c.id !== revealExcludeId)
    : iConfirmed
      ? (frozen?.hand ?? hand)
      : stage === "coin"
        ? hand.filter((c) => c.originalID !== "the-coin").slice(0, 3)
        : hand;

  const toggleReplace = (cardId: string, isCoin: boolean) => {
    if (isCoin || iConfirmed || revealing || stage !== "select") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (iConfirmed) return;
    playSfx("button-click");
    // Snapshot what the player saw so the waiting stage doesn't leak redraws
    setFrozen({
      hand: hand.map((c) => structuredClone(c)),
      preIds: new Set(hand.map((c) => c.id)),
    });
    moves.mulliganConfirm(
      [...selected],
      playerID === null ? actingSeat : undefined,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/70"
    >
      {/* Banner */}
      <div className="mb-[2vw] flex flex-col items-center">
        <div className="rounded-md border-2 border-blue-400/70 bg-gradient-to-b from-[#8d6500] to-amber-400 px-12 py-2 shadow-[0_0_30px_rgba(80,150,255,0.8)]">
          <span className="text-[2vw] font-bold text-white text-shadow-A">
            Starting Hand
          </span>
        </div>
        <span className=" text-[1.2vw] font-semibold text-yellow-300 drop-shadow text-shadow-A">
          {revealing ? (
            "Your starting hand"
          ) : (
            <>
              {playerID === null && `Player ${Number(actingSeat) + 1}: `}
              Keep or Replace Cards
            </>
          )}
        </span>
      </div>

      {/* Coin flip announcement */}
      <AnimatePresence>
        {stage === "coin" && (
          <motion.div
            className="absolute z-[80] flex flex-col items-center gap-6 left-[75vw]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex h-[10vw] w-[10vw] items-center justify-center rounded-full border-8 border-yellow-600 bg-gradient-to-br from-yellow-300 to-yellow-500 text-6xl font-black text-yellow-800 shadow-[0_0_60px_rgba(255,215,0,0.9)]"
              animate={{ rotateY: [0, 1800] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            >
              {goesFirst ? "1st" : "2nd"}
            </motion.div>
            <motion.span
              className="text-[2vw] font-bold text-white drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              {goesFirst ? "You go first!" : "You go second!"}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card row */}
      <div className="flex items-center justify-center gap-[2vw]">
        <AnimatePresence>
          {visibleCards.map((card) => {
            const isCoin = card.originalID === "the-coin";
            const replaced = selected.has(card.id);
            // Completion reveal: cards that weren't in the pre-confirm hand
            // are the replacement draws — call them out.
            const isNew =
              revealing && frozen !== null && !frozen.preIds.has(card.id);
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`relative h-[29vh] aspect-[3/4.3] cursor-pointer select-none rounded-xl ${
                  isNew
                    ? "shadow-[0_0_22px_8px_rgba(255,215,0,0.9)]"
                    : !replaced && !isCoin
                      ? "shadow-[0_0_18px_6px_rgba(80,255,80,0.85)]"
                      : ""
                }`}
                onClick={() => toggleReplace(card.id, isCoin)}
              >
                <div
                  onMouseEnter={() => {
                    playSfx("card-over");
                  }}
                  className="scale-150 absolute origin-top-left"
                >
                  <Card card={card} type="preview" />
                </div>
                {isNew && (
                  <div className="pointer-events-none absolute -bottom-[2.5vw] left-1/2 -translate-x-1/2 rounded bg-yellow-500 px-[1vw] py-[0.1vw] shadow-lg">
                    <span className="text-[1vw] font-bold tracking-wider text-stone-900">
                      NEW
                    </span>
                  </div>
                )}
                {replaced && (
                  <>
                    {/* Red X */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span
                        className="text-[7vw] font-black leading-none text-red-600 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]"
                        style={{ fontFamily: "Impact, sans-serif" }}
                      >
                        ✕
                      </span>
                    </div>
                    {/* REPLACED ribbon */}
                    <div className="pointer-events-none absolute -bottom-[2.5vw] left-1/2 -translate-x-1/2 rounded bg-red-600 px-[1vw] py-[0.1vw] shadow-lg">
                      <span className="text-[1vw] font-bold tracking-wider text-white text-shadow-A">
                        REPLACED
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm / waiting (hidden during the completion reveal) */}
      <div className="mt-[6vw]">
        {revealing ? null : iConfirmed ? (
          <span className="animate-pulse text-[1.2vw] font-semibold text-blue-200">
            Waiting for opponent…
          </span>
        ) : (
          stage === "select" && (
            <button
              onClick={handleConfirm}
              onMouseEnter={() => {
                playSfx("button-over");
              }}
              className="rounded-[1.5vw/1vw] border-4 border-blue-300 bg-gradient-to-b from-blue-500 to-blue-800 px-[1vw] py-[0.4vw] text-[1.6vw] font-bold text-white shadow-[0_0_25px_rgba(80,150,255,0.9)] transition-transform hover:scale-105 active:scale-95"
            >
              Confirm
            </button>
          )
        )}
      </div>
    </motion.div>
  );
};

export default MulliganOverlay;
