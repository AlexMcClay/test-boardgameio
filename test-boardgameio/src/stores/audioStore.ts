import { create } from "zustand";
import { createBgmTrack } from "@/utils/audio";

interface AudioState {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  currentSrc: string | null;
  audioInstance: HTMLAudioElement | null;
  isPlaying: boolean;

  // Actions
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMute: () => void;
  changeTrack: (src: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  cleanupTrack: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  musicVolume: 0.3,
  sfxVolume: 0.5,
  isMuted: false,
  currentSrc: null,
  audioInstance: null,
  isPlaying: false,

  setMusicVolume: (volume) => {
    const validVolume = Math.max(0, Math.min(1, volume));
    set({ musicVolume: validVolume });
    const { audioInstance, isMuted } = get();
    if (audioInstance) {
      audioInstance.volume = isMuted ? 0 : validVolume;
    }
  },

  setSfxVolume: (volume) =>
    set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),

  toggleMute: () =>
    set((state) => {
      const nextMuted = !state.isMuted;
      if (state.audioInstance) {
        state.audioInstance.volume = nextMuted ? 0 : state.musicVolume;
      }
      return { isMuted: nextMuted };
    }),

  changeTrack: (src) => {
    const { audioInstance, musicVolume, isMuted, currentSrc } = get();

    // If it's already the same song, do nothing
    if (currentSrc === src) return;

    // Clean up previous audio track if it exists
    if (audioInstance) {
      audioInstance.pause();
    }

    const volume = isMuted ? 0 : musicVolume;
    const newAudio = createBgmTrack(src, volume);

    set({
      currentSrc: src,
      audioInstance: newAudio,
      isPlaying: false, // reset back to false until successfully started by hook
    });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  cleanupTrack: () => {
    const { audioInstance } = get();
    if (audioInstance) {
      audioInstance.pause();
    }
    set({ audioInstance: null, currentSrc: null, isPlaying: false });
  },
}));
