// Pre-game mulligan overlay, rendered above the board while G.mulligan.active.
// Stages: coin flip announcement → starting-hand selection (click to mark a
// card for replacement) → waiting for the opponent. Reads the ACTUAL game
// state (not the visual buffer) — the game proper hasn't started yet.
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import Card from "../Card";

interface Props {
  G: GameState;
  moves: GameMoves;
  /** Seat this client controls; null = hotseat (both seats on this screen). */
  playerID: string | null;
}

const COIN_STAGE_MS = 2600;

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

  // Fresh coin flip + selection whenever the acting seat changes (hotseat)
  useEffect(() => {
    setStage("coin");
    setSelected(new Set());
  }, [actingSeat]);

  useEffect(() => {
    if (stage !== "coin") return;
    const timer = setTimeout(() => setStage("select"), COIN_STAGE_MS);
    return () => clearTimeout(timer);
  }, [stage, actingSeat]);

  if (!mulligan?.active) return null;

  const goesFirst = actingSeat === mulligan.firstPlayer;
  const hand = G.players[actingSeat].hand;
  const iConfirmed = mulligan.confirmed[actingSeat];

  // During the flip only the base 3 cards show; the 4th card + The Coin
  // slide in after the "you go second" announcement (state already has them).
  const visibleCards =
    stage === "coin"
      ? hand.filter((c) => c.originalID !== "the-coin").slice(0, 3)
      : hand;

  const toggleReplace = (cardId: string, isCoin: boolean) => {
    if (isCoin || iConfirmed || stage !== "select") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (iConfirmed) return;
    moves.mulliganConfirm(
      [...selected],
      playerID === null ? actingSeat : undefined,
    );
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/70">
      {/* Banner */}
      <div className="mb-[2vw] flex flex-col items-center">
        <div className="rounded-md border-2 border-blue-400/70 bg-gradient-to-b from-[#8d6500] to-amber-400 px-12 py-2 shadow-[0_0_30px_rgba(80,150,255,0.8)]">
          <span className="text-[2vw] font-bold text-white text-shadow-A">
            Starting Hand
          </span>
        </div>
        <span className=" text-[1.2vw] font-semibold text-yellow-300 drop-shadow text-shadow-A">
          {playerID === null && `Player ${Number(actingSeat) + 1}: `}
          Keep or Replace Cards
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
            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`relative h-[29vh] aspect-[3/4.3] cursor-pointer select-none rounded-xl ${
                  !replaced && !isCoin
                    ? "shadow-[0_0_18px_6px_rgba(80,255,80,0.85)]"
                    : ""
                }`}
                onClick={() => toggleReplace(card.id, isCoin)}
              >
                <div className="scale-150 absolute origin-top-left">
                  <Card card={card} type="preview" />
                </div>
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

      {/* Confirm / waiting */}
      <div className="mt-[6vw]">
        {iConfirmed ? (
          <span className="animate-pulse text-[1.2vw] font-semibold text-blue-200">
            Waiting for opponent…
          </span>
        ) : (
          stage === "select" && (
            <button
              onClick={handleConfirm}
              className="rounded-[1.5vw/1vw] border-4 border-blue-300 bg-gradient-to-b from-blue-500 to-blue-800 px-[1vw] py-[0.4vw] text-[1.6vw] font-bold text-white shadow-[0_0_25px_rgba(80,150,255,0.9)] transition-transform hover:scale-105 active:scale-95"
            >
              Confirm
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default MulliganOverlay;
