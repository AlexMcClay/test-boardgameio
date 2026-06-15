import { create } from "zustand";
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

// Combine the global master configurations and the split slice interfaces
export type AudioState = BaseAudioState & MusicSlice & SfxSlice;

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
    const masterMusicGain = ctx.createGain();
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
    // Update the SFX gain node if it exists (managed by sfxSlice)
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
        // Update music gain
        if (state.masterMusicGain) {
          state.masterMusicGain.gain.setValueAtTime(
            nextMuted ? 0 : state.musicVolume,
            state.audioContext.currentTime,
          );
        }
        // Update SFX gain
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
  // Using the rest operator arrays (...a) bridges Zustand's configuration arguments seamlessly
  ...createMusicSlice(set, get, ...a),
  ...createSfxSlice(set, get, ...a),
}));
