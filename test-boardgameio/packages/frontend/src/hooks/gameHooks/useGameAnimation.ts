// Staggered replay of the authoritative event log.
//
// The engine resolves every move atomically and stamps each recorded event
// with a monotonic `seq`. This hook:
//   1. picks up the events it hasn't processed yet (by seq — timestamps can
//      collide within a millisecond),
//   2. splits them into resolution steps (action → death wave → deathrattle
//      chain → ...),
//   3. derives an intermediate visual state per step with the event reducer,
//   4. queues one animation batch per step; as each batch finishes the visual
//      state advances to that step's board.
// The final step always uses the authoritative post-move state, so the visual
// buffer converges every move regardless of reducer coverage.
import { useAnimationStore } from "@/stores/animationStore";
import { detectAllAnimations } from "@/utils/detectAnimations";
import { splitEventsIntoSteps } from "@/utils/eventSteps";
import { applyEventsToVisualState } from "@/utils/visualEventReducer";
import type { GameState, Ctx, PlayerID } from "@project/shared";
import { useEffect, useRef, useState } from "react";

interface Props {
  ctx: Ctx;
  G: GameState;
  playerID: PlayerID | null;
}

export const useGameAnimation = ({ ctx, G, ...props }: Props) => {
  // Visual state buffer - keeps dead cards visible during animations
  const [visualGameState, setVisualGameState] = useState<GameState>(G);
  const [visualCtx, setVisualCtx] = useState(ctx);

  const lastProcessedSeq = useRef<number>(-1);
  // The state the NEXT queued step should build on (tail of the queue).
  const lastQueuedStateRef = useRef<GameState | null>(null);
  const mountedRef = useRef(false);

  const { queueAnimationBatch, playAnimations, isAnimating } =
    useAnimationStore();

  useEffect(() => {
    const handleAnimationsAndVisualBoard = async () => {
      const currentEvents = G.gameEvents || [];

      // On mount (or joining a match mid-game) show the current state as-is
      // and skip animating whatever already happened.
      if (!mountedRef.current) {
        mountedRef.current = true;
        lastProcessedSeq.current = Math.max(
          -1,
          ...currentEvents.map((e) => e.seq ?? -1),
        );
        lastQueuedStateRef.current = G;
        setVisualGameState(G);
        setVisualCtx(ctx);
        return;
      }

      // Only process events we haven't seen (strictly increasing seq)
      const newEvents = currentEvents.filter(
        (e) => (e.seq ?? -1) > lastProcessedSeq.current,
      );

      if (newEvents.length === 0) {
        // Nothing new to animate; if the queue is idle just mirror the state
        // (covers e.g. cancelBattlecry which clears events)
        if (!isAnimating && useAnimationStore.getState().queue.length === 0) {
          setVisualGameState(G);
          setVisualCtx(ctx);
          lastQueuedStateRef.current = G;
        }
        return;
      }

      lastProcessedSeq.current = Math.max(
        ...newEvents.map((e) => e.seq ?? -1),
      );

      const isMyTurn = props.playerID
        ? ctx.currentPlayer === props.playerID
        : true;

      // Split this move's events into staggered resolution steps
      const steps = splitEventsIntoSteps(newEvents);
      let base = lastQueuedStateRef.current ?? visualGameState;

      steps.forEach((stepEvents, index) => {
        const isLastStep = index === steps.length - 1;
        // Intermediate boards come from the reducer; the last step snaps to
        // the authoritative state so the buffer always converges.
        const stepState = isLastStep
          ? G
          : applyEventsToVisualState(base, stepEvents);
        base = stepState;

        // Don't replay my own card/hero-power presentations back at me
        const animations = detectAllAnimations(stepEvents).filter(
          (a) =>
            !(
              (isMyTurn && a.type === "cardPlayed") ||
              (isMyTurn && a.type === "heroPowerPlayed")
            ),
        );

        queueAnimationBatch(animations, stepState, ctx);
      });

      lastQueuedStateRef.current = G;

      // If not currently animating, start draining the queue
      if (!isAnimating) {
        const onBatchComplete = (gameState: GameState, batchCtx: Ctx) => {
          setVisualGameState(gameState);
          setVisualCtx(batchCtx);
        };
        await playAnimations(onBatchComplete);
      }
      // If already animating, the batches were appended and the running
      // playAnimations loop will play them in order.
    };

    handleAnimationsAndVisualBoard();
  }, [G, ctx, isAnimating, queueAnimationBatch, playAnimations]);

  return {
    visualCtx,
    visualGameState,
    setVisualGameState,
    setVisualCtx,
  };
};
