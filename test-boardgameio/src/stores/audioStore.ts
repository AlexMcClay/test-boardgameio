import { create } from "zustand";
import { createBgmTrack } from "@/utils/audio";

interface AudioChannel {
  element: HTMLAudioElement | null;
  gainNode: GainNode | null;
  sourceNode: MediaElementAudioSourceNode | null;
}

interface AudioState {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  currentSrc: string | null;
  globalTrackSrc: string | null;
  isPlaying: boolean;

  audioContext: AudioContext | null;
  masterMusicGain: GainNode | null;

  channelA: AudioChannel;
  channelB: AudioChannel;
  activeChannel: "A" | "B" | null;

  initAudio: () => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleMute: () => void;
  setGlobalTrack: (src: string) => void;
  prepareTrack: (src: string) => void;
  executePlay: (fadeDuration: number) => Promise<HTMLAudioElement | null>;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  musicVolume: 0.3,
  sfxVolume: 0.5,
  isMuted: false,
  currentSrc: null,
  globalTrackSrc: null,
  isPlaying: false,
  audioContext: null,
  masterMusicGain: null,

  channelA: { element: null, gainNode: null, sourceNode: null },
  channelB: { element: null, gainNode: null, sourceNode: null },
  activeChannel: null,

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

  setGlobalTrack: (src) => set({ globalTrackSrc: src }),

  prepareTrack: (src) => {
    if (!src || get().currentSrc === src) return;

    const { activeChannel, channelA, channelB } = get();
    // Prime whichever channel is not playing right now
    const incomingChannelKey = activeChannel === "A" ? "B" : "A";
    const targetChannelConfig =
      incomingChannelKey === "A" ? channelA : channelB;

    let element = targetChannelConfig.element;

    if (!element) {
      element = createBgmTrack(src, 1);
      element.loop = true;
    } else {
      element.src = src;
      element.load();
    }

    set({
      currentSrc: src,
      [incomingChannelKey === "A" ? "channelA" : "channelB"]: {
        ...targetChannelConfig,
        element,
      },
    });
  },

  executePlay: async (fadeDuration) => {
    get().initAudio();
    const ctx = get().audioContext!;
    const masterGain = get().masterMusicGain!;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const { activeChannel, channelA, channelB } = get();

    // Target channel calculation
    const incomingChannelKey =
      activeChannel === "A" ? "B" : activeChannel === "B" ? "A" : "A";
    const oldChannelKey = activeChannel;

    const incomingChannel = incomingChannelKey === "A" ? channelA : channelB;
    const oldChannel =
      oldChannelKey === "A"
        ? channelA
        : oldChannelKey === "B"
          ? channelB
          : null;

    if (!incomingChannel.element || !incomingChannel.element.src) return null;

    // 1. Build and wire up Web Audio nodes for incoming track if needed
    let incomingGain = incomingChannel.gainNode;
    let incomingSource = incomingChannel.sourceNode;

    if (!incomingGain || !incomingSource) {
      incomingGain = ctx.createGain();
      incomingSource = ctx.createMediaElementSource(incomingChannel.element);
      incomingSource.connect(incomingGain);
      incomingGain.connect(masterGain);
    }

    // Set volume relative to whether something else is currently playing
    const now = ctx.currentTime;
    incomingGain.gain.setValueAtTime(oldChannel ? 0 : 1, now);

    try {
      // 2. Test if the browser allows playback BEFORE modifying channels or volumes
      await incomingChannel.element.play();

      // --- Playback Succeeded: Run Crossfade ---
      if (oldChannel && oldChannel.gainNode && oldChannel.element) {
        const targetGain = oldChannel.gainNode;
        const targetElement = oldChannel.element;

        targetGain.gain.setValueAtTime(targetGain.gain.value, now);
        targetGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

        setTimeout(() => {
          // Verify we haven't switched tracks again during the fade
          if (get().activeChannel === incomingChannelKey) {
            targetElement.pause();
          }
        }, fadeDuration * 1000);

        // Smoothly fade up incoming song
        incomingGain.gain.linearRampToValueAtTime(1, now + fadeDuration);
      }

      // Finalize store state update
      set({
        activeChannel: incomingChannelKey,
        isPlaying: true,
        [incomingChannelKey === "A" ? "channelA" : "channelB"]: {
          element: incomingChannel.element,
          gainNode: incomingGain,
          sourceNode: incomingSource,
        },
      });

      return incomingChannel.element;
    } catch (error) {
      // --- Playback Blocked by Browser Autoplay Policy ---
      // We do not stop or fade the old channel. It continues playing.
      // We preserve our nodes so they can retry on the next click handler.
      set({
        [incomingChannelKey === "A" ? "channelA" : "channelB"]: {
          element: incomingChannel.element,
          gainNode: incomingGain,
          sourceNode: incomingSource,
        },
      });
      throw error; // Let the hook catch this and register retry event listeners
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
}));
