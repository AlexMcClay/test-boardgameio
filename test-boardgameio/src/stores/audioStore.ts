import { create } from "zustand";
import { createMusicSlice, type MusicSlice } from "./musicSlice";

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

// Combine the global master configurations and the split slice interface
export type AudioState = BaseAudioState & MusicSlice;

export const useAudioStore = create<AudioState>()((set, get, ...a) => ({
  // --- Core State Variables ---
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
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(
      get().isMuted ? 0 : get().musicVolume,
      ctx.currentTime,
    );
    masterGain.connect(ctx.destination);
    set({ audioContext: ctx, masterMusicGain: masterGain });
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

  setSfxVolume: (volume) =>
    set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),

  toggleMute: () =>
    set((state) => {
      const nextMuted = !state.isMuted;
      if (state.masterMusicGain && state.audioContext) {
        state.masterMusicGain.gain.setValueAtTime(
          nextMuted ? 0 : state.musicVolume,
          state.audioContext.currentTime,
        );
      }
      return { isMuted: nextMuted };
    }),

  // --- Injecting Slices ---
  // Using the rest operator arrays (...a) bridges Zustand's configuration arguments seamlessly
  ...createMusicSlice(set, get, ...a),
}));
