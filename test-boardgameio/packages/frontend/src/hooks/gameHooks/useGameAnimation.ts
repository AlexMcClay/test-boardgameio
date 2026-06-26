import { useAnimationStore } from "@/stores/animationStore";
import { detectAllAnimations } from "@/utils/detectAnimations";
import type { GameState } from "@project/shared";
import type { Ctx, PlayerID } from "boardgame.io";
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

  const prevGameStateRef = useRef<GameState | null>(null);
  const lastProcessedTimestamp = useRef<number>(0);

  const { queueAnimationBatch, playAnimations, isAnimating } =
    useAnimationStore();

  useEffect(() => {
    const handleAnimationsAndVisualBoard = async () => {
      // Skip on initial mount
      if (!prevGameStateRef.current) {
        prevGameStateRef.current = structuredClone(G);
        setVisualGameState(G);
        setVisualCtx(ctx);
        return;
      }

      // Only process new events (by timestamp)
      const currentEvents = G.gameEvents || [];
      const newEvents = currentEvents.filter(
        (e) => e.timestamp > lastProcessedTimestamp.current,
      );

      // Skip if no new events to process
      if (newEvents.length === 0) {
        return;
      }

      // Detect all animations from event log
      // filter out all cardPlayed animations that belong to the player
      const animations = detectAllAnimations(G).filter((a) => {
        const isMyTurn = props.playerID
          ? ctx.currentPlayer === props.playerID
          : true;
        // Read as: "Keep this if it's NOT (a card played by me)"
        return !(isMyTurn && a.type === "cardPlayed");
      });

      // Update tracking timestamp
      if (currentEvents.length > 0) {
        lastProcessedTimestamp.current = Math.max(
          ...currentEvents.map((e) => e.timestamp),
        );
      }

      // Update ref immediately
      prevGameStateRef.current = structuredClone(G);

      // If animations exist, add them to queue with current game state and ctx
      if (animations.length > 0) {
        // --- DUPLICATE CHECK START ---
        // Fetch the absolute newest queue array snapshot directly from the store
        const existingQueue = useAnimationStore.getState().queue;
        const incomingSerialized = JSON.stringify(animations);

        const isAlreadyQueued = existingQueue.some(
          (batch) => JSON.stringify(batch.animations) === incomingSerialized,
        );

        if (isAlreadyQueued) {
          console.warn(
            "⚠️ Multi-player race-condition caught in useEffect: This animation batch is already in the queue. Dropping duplicate.",
          );
          return; // Exit early so it doesn't queue or trigger an extra playAnimations loop
        }
        // --- DUPLICATE CHECK END ---

        console.log("Queueing animation batch:", animations);

        // Queue this batch of animations with the full game state and ctx
        queueAnimationBatch(animations, G, ctx);

        // If not currently animating, start playing the queue
        if (!isAnimating) {
          console.log("Starting animation queue");

          // Callback to update visual state after each batch completes
          const onBatchComplete = (gameState: GameState, batchCtx: any) => {
            console.log("Batch complete, updating visual state");
            setVisualGameState(gameState);
            setVisualCtx(batchCtx);
          };

          await playAnimations(onBatchComplete);
          console.log("All animations complete, syncing to current state");

          // After all animations complete, sync visual state to actual current state
          // setVisualGameState(G);
          // setVisualCtx(ctx);
        }
        // If already animating, the batch is queued and will play automatically
        // when the current batch finishes (handled by playAnimations loop)
      } else {
        // No animations detected
        if (isAnimating) {
          // Queue an empty batch so state updates after current animations finish
          console.log("Queueing state update (no animations)");
          queueAnimationBatch([], G, ctx);
        } else {
          // Not animating, update immediately
          setVisualGameState(G);
          setVisualCtx(ctx);
        }
      }
    };

    handleAnimationsAndVisualBoard();
  }, [G, ctx, isAnimating, queueAnimationBatch, playAnimations]);

  return {
    visualCtx,
    visualGameState,
  };
};
