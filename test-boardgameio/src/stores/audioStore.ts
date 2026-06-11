import { create } from "zustand";

interface AudioState {
  musicVolume: number; // 0.0 to 1.0
  sfxVolume: number; // 0.0 to 1.0
  isMuted: boolean;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  musicVolume: 0.3, // 30% default
  sfxVolume: 0.5, // 50% default
  isMuted: false,

  setMusicVolume: (volume) =>
    set({ musicVolume: Math.max(0, Math.min(1, volume)) }),

  setSfxVolume: (volume) =>
    set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
