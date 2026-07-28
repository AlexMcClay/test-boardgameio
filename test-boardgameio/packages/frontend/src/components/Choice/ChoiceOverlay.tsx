// Choose One / Discover picker, rendered above the board while
// G.pendingChoice is set for this client's seat.
//
// Both mechanics share this overlay because both are "pick one of these
// cards": pendingChoice.options is a Card[] either way — for Choose One
// they're the option cards (Hearthstone's own uncollectible halves), for
// Discover they're the candidates themselves. Nothing here is synthetic.
//
// Reads the ACTUAL G (like MulliganOverlay) rather than the visual buffer:
// the prompt gates the whole game, so it must reflect authoritative state.
import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  hasTargets,
  isUserSelectValue,
  type Card as CardType,
  type GameCtx,
  type GameState,
} from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import Card from "../Card";
import { useAudioStore } from "@/stores/audioStore";
import { useDragStore } from "@/stores/dragStore";
import { centerOfTarget } from "@/utils/targeting";

interface Props {
  G: GameState;
  ctx: GameCtx;
  moves: GameMoves;
  /** Seat this client controls; null = hotseat (both seats on this screen). */
  playerID: string | null;
}

/** Does this Choose One half ask the player to aim it? */
export function optionNeedsTarget(option: CardType): boolean {
  return !!option.targetQuery && option.effects.some((e) => isUserSelectValue(e));
}

const ChoiceOverlay = ({ G, ctx, moves, playerID }: Props) => {
  const pending = G.pendingChoice;
  const playSfx = useAudioStore((state) => state.playSfx);
  const startTargeting = useDragStore((s) => s.startTargeting);

  // Hotseat has no fixed seat — the prompt always belongs to whoever it says.
  const isMine = !!pending && (playerID === null || pending.playerId === playerID);

  // Which halves are actually pickable. A targeted half with nothing to aim at
  // would strand the player mid-prompt, so it's disabled (Hearthstone greys
  // out Keeper of the Grove's Moonfire on an empty board the same way).
  const disabled = useMemo(() => {
    if (!pending || pending.kind !== "chooseOne") return new Set<number>();
    const out = new Set<number>();
    pending.options.forEach((option, i) => {
      if (!optionNeedsTarget(option)) return;
      const ok = hasTargets(
        option.targetQuery,
        {
          G,
          ctx,
          location: "hand",
          playerID: pending.playerId,
          type: "spell",
        },
        option.id,
      );
      if (!ok) out.add(i);
    });
    return out;
  }, [pending, G, ctx]);

  if (!pending || !isMine) return null;

  const isDiscover = pending.kind === "discover";

  const pick = (option: CardType, index: number) => {
    if (disabled.has(index)) return;
    playSfx("button-click");

    if (!isDiscover && optionNeedsTarget(option)) {
      // Hand off to the arrow: the overlay closes itself because targeting
      // mode is set, and the actual move is sent on mouse-up (useGameTargeting).
      startTargeting(
        "choice",
        pending.sourceCardId ?? option.id,
        targetingOrigin(pending.sourceCardId),
        option,
        index,
      );
      return;
    }
    moves.resolveChoice(index);
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
            {isDiscover ? "Discover" : "Choose One"}
          </span>
        </div>
        <span className="text-[1.2vw] font-semibold text-yellow-300 drop-shadow text-shadow-A">
          {isDiscover
            ? "Pick a card to add to your hand"
            : "Pick a half — press ESC to cancel"}
        </span>
      </div>

      <div className="flex items-start justify-center gap-[6vw]">
        <AnimatePresence>
          {pending.options.map((option, index) => {
            const isDisabled = disabled.has(index);
            return (
              <motion.div
                key={option.id}
                layout
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className={`relative h-[29vh] aspect-[3/4.3] select-none rounded-xl ${
                  isDisabled
                    ? "cursor-not-allowed opacity-40 grayscale"
                    : "cursor-pointer canAttack"
                }`}
                onClick={() => pick(option, index)}
              >
                <div
                  onMouseEnter={() => {
                    if (!isDisabled) playSfx("card-over");
                  }}
                  className="scale-150 absolute origin-top-left"
                >
                  <Card card={option} type="preview" />
                </div>
                {isDisabled && (
                  <div className="pointer-events-none absolute -bottom-[2.5vw] left-1/2 -translate-x-1/2 rounded bg-stone-700 px-[1vw] py-[0.1vw] shadow-lg">
                    <span className="text-[1vw] font-bold tracking-wider text-white text-shadow-A">
                      NO TARGETS
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/**
 * Where the targeting arrow starts. A Choose One MINION is already on the
 * board, so the arrow springs from it; a held spell has no board presence, so
 * it starts from the centre-bottom of the screen (where the hand sits).
 */
function targetingOrigin(sourceCardId?: string): { x: number; y: number } {
  const onBoard = sourceCardId && centerOfTarget(sourceCardId, "card");
  return onBoard || { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
}

export default ChoiceOverlay;
