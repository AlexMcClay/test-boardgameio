// Animation queue store for managing card animations
import { create } from "zustand";
import type { AnimationEvent } from "@/types/animations";

type AnimationStore = {
  // State
  queue: AnimationEvent[];
  isAnimating: boolean;
  activeAnimations: AnimationEvent[]; // Track multiple simultaneous animations

  // Actions
  queueAnimation: (event: AnimationEvent) => void;
  startAnimating: () => void;
  playAnimations: () => Promise<void>;
  clearQueue: () => void;
  addActiveAnimation: (event: AnimationEvent) => void;
  removeActiveAnimation: (event: AnimationEvent) => void;
};

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  queue: [],
  isAnimating: false,
  activeAnimations: [],

  queueAnimation: (event) => {
    set((state) => ({
      queue: [...state.queue, event],
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
      activeAnimations: state.activeAnimations.filter(
        (anim) =>
          !(
            anim.type === event.type &&
            (anim.type === "attack"
              ? anim.attackerId === (event as any).attackerId
              : anim.cardId === (event as any).cardId)
          ),
      ),
    }));
  },

  playAnimations: async () => {
    const { queue } = get();

    if (queue.length === 0) return;

    // isAnimating should already be set by startAnimating(), but ensure it's true
    set({ isAnimating: true });

    // Calculate total timeline duration
    const timelineEnd = Math.max(
      ...queue.map((anim) => anim.startTime + anim.duration),
    );

    // Play all animations on their timeline (can overlap!)
    const animationPromises = queue.map((animation) => {
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

    // Wait for the entire timeline to complete
    await Promise.all(animationPromises);

    // Clear queue and reset state
    // Note: Don't force-clear activeAnimations - they remove themselves after their duration
    set({ queue: [], isAnimating: false });
  },
}));
