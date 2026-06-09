// Animation queue store for managing card animations
import { create } from "zustand";
import type { AnimationEvent } from "@/types/animations";

type AnimationStore = {
  // State
  queue: AnimationEvent[];
  isAnimating: boolean;
  currentAnimation: AnimationEvent | null;

  // Actions
  queueAnimation: (event: AnimationEvent) => void;
  playAnimations: () => Promise<void>;
  clearQueue: () => void;
  setCurrentAnimation: (event: AnimationEvent | null) => void;
  completeCurrentAnimation: () => void;
};

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  queue: [],
  isAnimating: false,
  currentAnimation: null,

  queueAnimation: (event) => {
    set((state) => ({
      queue: [...state.queue, event],
    }));
  },

  clearQueue: () => {
    set({ queue: [], isAnimating: false, currentAnimation: null });
  },

  setCurrentAnimation: (event) => {
    set({ currentAnimation: event });
  },

  completeCurrentAnimation: () => {
    set({ currentAnimation: null });
  },

  playAnimations: async () => {
    const { queue } = get();

    if (queue.length === 0) return;

    set({ isAnimating: true });

    // Wait for drag state to settle before starting animations
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Process animations sequentially
    for (const animation of queue) {
      set({ currentAnimation: animation });

      // Wait for animation duration
      // Attack: 500ms total (250ms to target, 250ms back)
      // Death: 500ms
      const duration = animation.type === "attack" ? 500 : 500;
      await new Promise((resolve) => setTimeout(resolve, duration));

      set({ currentAnimation: null });

      // Small delay between animations for clarity
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear queue and reset state
    set({ queue: [], isAnimating: false, currentAnimation: null });
  },
}));
