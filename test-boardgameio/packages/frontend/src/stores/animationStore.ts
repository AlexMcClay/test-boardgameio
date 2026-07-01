// Animation queue store for managing card animations
import { create } from "zustand";
import type { AnimationEvent, AnimationQueueItem } from "@/types/animations";
import { BATCH_UPDATE_DELAY } from "@/utils/animationDurations";

// We extend the baseline type to handle dynamic unique run tracking internally
type ActiveAnimationEvent = AnimationEvent & { uid?: string };

type AnimationStore = {
  queue: AnimationQueueItem[];
  isAnimating: boolean;
  activeAnimations: ActiveAnimationEvent[]; // Supports tracking unique active instances

  queueAnimationBatch: (
    animations: AnimationEvent[],
    gameState: any,
    ctx: any,
  ) => void;
  startAnimating: () => void;
  playAnimations: (
    onBatchComplete?: (gameState: any, ctx: any) => void,
  ) => Promise<void>;
  clearQueue: () => void;
  addActiveAnimation: (event: ActiveAnimationEvent) => void;
  removeActiveAnimation: (event: ActiveAnimationEvent) => void;
};

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  queue: [],
  isAnimating: false,
  activeAnimations: [],

  queueAnimationBatch: (animations, gameState, ctx) => {
    const currentQueue = get().queue;

    const isDuplicate = currentQueue.some((batch) => {
      if (batch.animations.length !== animations.length) return false;
      return batch.animations.every((anim, index) => {
        const incomingAnim = animations[index];
        if (anim.type !== incomingAnim.type) return false;
        return JSON.stringify(anim) === JSON.stringify(incomingAnim);
      });
    });

    if (isDuplicate) {
      console.warn(
        "⚠️ Animation bug caught: Attempted to add duplicate animation batch to queue. Ignoring.",
        animations,
      );
      return;
    }

    set((state) => ({
      queue: [
        ...state.queue,
        {
          animations,
          gameState: structuredClone(gameState),
          ctx: structuredClone(ctx),
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
        // 1. If we have a unique runtime instance ID, check against that first
        if (anim.uid && event.uid) {
          return anim.uid !== event.uid;
        }

        if (anim.type !== event.type) return true;

        // Fallbacks for baseline items that don't pass a unique identifier
        if (anim.type === "attack" && event.type === "attack") {
          return anim.attackerId !== event.attackerId;
        } else if (anim.type === "death" && event.type === "death") {
          return anim.cardId !== event.cardId;
        } else if (anim.type === "hitNumber" && event.type === "hitNumber") {
          // Fallback to match exact content equality if uid is absent
          return (
            anim.targetId !== event.targetId ||
            anim.damageType !== event.damageType ||
            anim.value !== event.value ||
            anim.startTime !== event.startTime
          );
        }
        return true;
      }),
    }));
  },

  playAnimations: async (onBatchComplete) => {
    while (get().queue.length > 0) {
      const currentBatch = get().queue[0];

      if (!currentBatch || currentBatch.animations.length === 0) {
        if (onBatchComplete && currentBatch) {
          onBatchComplete(currentBatch.gameState, currentBatch.ctx);
        }
        set((state) => ({ queue: state.queue.slice(1) }));
        continue;
      }

      set({ isAnimating: true });

      const hitCountsByTarget: Record<string, number> = {};

      const animationPromises = currentBatch.animations.map((animation) => {
        return new Promise<void>((resolve) => {
          // Generate a cryptographically distinct ID to target this precise element instance
          const runtimeUid = `${animation.type}-${crypto.randomUUID()}`;
          const runtimeAnim: ActiveAnimationEvent = {
            ...animation,
            uid: runtimeUid,
          };

          let adjustedStartTime = animation.startTime;

          if (animation.type === "hitNumber") {
            const targetId = animation.targetId;

            // Initialize or increment the count for this specific target
            if (hitCountsByTarget[targetId] === undefined) {
              hitCountsByTarget[targetId] = 0;
            } else {
              hitCountsByTarget[targetId]++;
            }

            // Stagger delay (300ms) ONLY applies if this target has already been hit in this batch
            adjustedStartTime += hitCountsByTarget[targetId] * 300;
          }
          setTimeout(() => {
            get().addActiveAnimation(runtimeAnim);

            setTimeout(() => {
              get().removeActiveAnimation(runtimeAnim);
              resolve();
            }, animation.duration);
          }, adjustedStartTime);
        });
      });

      await Promise.all(animationPromises);

      set((state) => ({ queue: state.queue.slice(1) }));

      if (onBatchComplete) {
        onBatchComplete(currentBatch.gameState, currentBatch.ctx);

        if (get().queue.length > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, BATCH_UPDATE_DELAY),
          );
        }
      }
    }

    set({ isAnimating: false, activeAnimations: [] });
  },
}));
