import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // 1. Import middleware
import { createMusicSlice, type MusicSlice } from "./musicSlice";
import { createSfxSlice, type SfxSlice } from "./sfxSlice";

interface BaseAudioState {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  audioContext: AudioContext | null;
  masterMusicGain: GainNode | null;

  initAudio: () => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMute: () => void;
}

export type AudioState = BaseAudioState & MusicSlice & SfxSlice;

export const useAudioStore = create<AudioState>()(
  persist(
    // 2. Wrap your store creator in the persist middleware
    (set, get, ...a) => ({
      // --- Core State Variables ---
      // These defaults will act as fallbacks if localStorage is empty
      musicVolume: 0.3,
      sfxVolume: 0.5,
      isMuted: false,
      audioContext: null,
      masterMusicGain: null,

      // --- Core State Methods ---
      initAudio: () => {
        if (get().audioContext) return;
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const masterMusicGain = ctx.createGain();

        // This will now correctly use the values loaded from localStorage on startup
        masterMusicGain.gain.setValueAtTime(
          get().isMuted ? 0 : get().musicVolume,
          ctx.currentTime,
        );
        masterMusicGain.connect(ctx.destination);

        set({
          audioContext: ctx,
          masterMusicGain: masterMusicGain,
        });
      },

      setMusicVolume: (volume) => {
        const validVolume = Math.max(0, Math.min(1, volume));
        set({ musicVolume: validVolume });
        const { masterMusicGain, isMuted, audioContext } = get();
        if (masterMusicGain && audioContext) {
          masterMusicGain.gain.setValueAtTime(
            isMuted ? 0 : validVolume,
            audioContext.currentTime,
          );
        }
      },

      setSfxVolume: (volume) => {
        const validVolume = Math.max(0, Math.min(1, volume));
        set({ sfxVolume: validVolume });
        const state = get();
        if (state.masterSfxGain && state.audioContext) {
          state.masterSfxGain.gain.setValueAtTime(
            state.isMuted ? 0 : validVolume,
            state.audioContext.currentTime,
          );
        }
      },

      toggleMute: () =>
        set((state) => {
          const nextMuted = !state.isMuted;
          if (state.audioContext) {
            if (state.masterMusicGain) {
              state.masterMusicGain.gain.setValueAtTime(
                nextMuted ? 0 : state.musicVolume,
                state.audioContext.currentTime,
              );
            }
            if (state.masterSfxGain) {
              state.masterSfxGain.gain.setValueAtTime(
                nextMuted ? 0 : state.sfxVolume,
                state.audioContext.currentTime,
              );
            }
          }
          return { isMuted: nextMuted };
        }),

      // --- Injecting Slices ---
      ...createMusicSlice(set, get, ...a),
      ...createSfxSlice(set, get, ...a),
    }),
    {
      name: "audio-storage", // Unique key for localStorage
      storage: createJSONStorage(() => localStorage),

      // 3. CRITICAL: Only save the primitive types, skip the Audio Nodes
      partialize: (state) => ({
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        isMuted: state.isMuted,
      }),
    },
  ),
);
