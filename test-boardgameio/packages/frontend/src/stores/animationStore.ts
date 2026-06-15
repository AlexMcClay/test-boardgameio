// Animation queue store for managing card animations
import { create } from "zustand";
import type { AnimationEvent, AnimationQueueItem } from "@/types/animations";
import { BATCH_UPDATE_DELAY } from "@/utils/animationDurations";

type AnimationStore = {
  // State
  queue: AnimationQueueItem[]; // Queue of animation batches with their game states
  isAnimating: boolean;
  activeAnimations: AnimationEvent[]; // Track multiple simultaneous animations

  // Actions
  queueAnimationBatch: (
    animations: AnimationEvent[],
    gameState: any,
    ctx: any,
  ) => void; // Queue animations with game state and ctx
  startAnimating: () => void;
  playAnimations: (
    onBatchComplete?: (gameState: any, ctx: any) => void,
  ) => Promise<void>;
  clearQueue: () => void;
  addActiveAnimation: (event: AnimationEvent) => void;
  removeActiveAnimation: (event: AnimationEvent) => void;
};

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  queue: [],
  isAnimating: false,
  activeAnimations: [],

  queueAnimationBatch: (animations, gameState, ctx) => {
    set((state) => ({
      queue: [
        ...state.queue,
        {
          animations,
          gameState: structuredClone(gameState), // Deep clone to prevent reference issues
          ctx: structuredClone(ctx), // Deep clone ctx as well
        },
      ],
    }));
  },

  startAnimating: () => {
    set({ isAnimating: true });
  },

  clearQueue: () => {
    set({ queue: [], isAnimating: false, activeAnimations: [] });
  },

  addActiveAnimation: (event) => {
    set((state) => ({
      activeAnimations: [...state.activeAnimations, event],
    }));
  },

  removeActiveAnimation: (event) => {
    set((state) => ({
      activeAnimations: state.activeAnimations.filter((anim) => {
        if (anim.type !== event.type) return true;

        // Match by type-specific identifiers
        if (anim.type === "attack" && event.type === "attack") {
          return anim.attackerId !== event.attackerId;
        } else if (anim.type === "death" && event.type === "death") {
          return anim.cardId !== event.cardId;
        } else if (anim.type === "hitNumber" && event.type === "hitNumber") {
          return (
            anim.targetId !== event.targetId ||
            anim.damageType !== event.damageType
          );
        }
        return true;
      }),
    }));
  },

  playAnimations: async (onBatchComplete) => {
    // Process queue items sequentially
    // Note: Always get fresh queue reference in case new items are added during processing
    while (get().queue.length > 0) {
      const currentBatch = get().queue[0];

      if (!currentBatch || currentBatch.animations.length === 0) {
        // Empty batch - still need to update visual state with this snapshot
        console.log("Processing state update batch (no animations)");

        // Call the callback to update visual state
        if (onBatchComplete && currentBatch) {
          onBatchComplete(currentBatch.gameState, currentBatch.ctx);
        }

        // Remove empty batch and continue
        set((state) => ({
          queue: state.queue.slice(1),
        }));
        continue;
      }

      console.log(
        `Playing animation batch with ${currentBatch.animations.length} animations`,
      );

      // Set animating flag
      set({ isAnimating: true });

      // Calculate total timeline duration for this batch
      // const timelineEnd = Math.max(
      //   ...currentBatch.animations.map(
      //     (anim) => anim.startTime + anim.duration,
      //   ),
      // );

      // Play all animations in this batch on their timeline (can overlap!)
      const animationPromises = currentBatch.animations.map((animation) => {
        return new Promise<void>((resolve) => {
          // Wait for animation's startTime, then trigger it
          setTimeout(() => {
            get().addActiveAnimation(animation);

            // Remove animation after its duration
            setTimeout(() => {
              get().removeActiveAnimation(animation);
              resolve();
            }, animation.duration);
          }, animation.startTime);
        });
      });

      // Wait for the entire batch timeline to complete
      await Promise.all(animationPromises);

      console.log("Animation batch complete");

      // Remove the completed batch from queue
      set((state) => ({
        queue: state.queue.slice(1),
      }));

      // Call the callback with this batch's game state and ctx so visual state can update
      if (onBatchComplete) {
        onBatchComplete(currentBatch.gameState, currentBatch.ctx);

        // Add delay before processing next batch (only if there are more batches)
        if (get().queue.length > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, BATCH_UPDATE_DELAY),
          );
        }
      }
    }

    // All batches complete - reset state
    set({ isAnimating: false, activeAnimations: [] });
    console.log("All animation batches complete");
  },
}));
