import { type StateCreator } from "zustand";
import { createBgmTrack } from "@/utils/audio";
import { type AudioState } from "./audioStore"; // We will define this master type in the store file

export interface AudioChannel {
  element: HTMLAudioElement | null;
  gainNode: GainNode | null;
  sourceNode: MediaElementAudioSourceNode | null;
}

export interface MusicSlice {
  currentSrc: string | null;
  globalTrackSrc: string | null;
  isPlaying: boolean;
  channelA: AudioChannel;
  channelB: AudioChannel;
  activeChannel: "A" | "B" | null;

  setGlobalTrack: (src: string) => void;
  prepareTrack: (src: string) => void;
  executePlay: (fadeDuration: number) => Promise<HTMLAudioElement | null>;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const createMusicSlice: StateCreator<
  AudioState, // Gives this slice type-awareness of the global master store
  [],
  [],
  MusicSlice
> = (set, get) => ({
  currentSrc: null,
  globalTrackSrc: null,
  isPlaying: false,
  channelA: { element: null, gainNode: null, sourceNode: null },
  channelB: { element: null, gainNode: null, sourceNode: null },
  activeChannel: null,

  setGlobalTrack: (src) => set({ globalTrackSrc: src }),

  prepareTrack: (src) => {
    if (!src || get().currentSrc === src) return;

    const { activeChannel, channelA, channelB } = get();
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
    get().preloadSfxSounds();
    const ctx = get().audioContext!;
    const masterGain = get().masterMusicGain!;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const { activeChannel, channelA, channelB } = get();
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

    let incomingGain = incomingChannel.gainNode;
    let incomingSource = incomingChannel.sourceNode;

    if (!incomingGain || !incomingSource) {
      incomingGain = ctx.createGain();
      incomingSource = ctx.createMediaElementSource(incomingChannel.element);
      incomingSource.connect(incomingGain);
      incomingGain.connect(masterGain);
    }

    const now = ctx.currentTime;
    incomingGain.gain.setValueAtTime(oldChannel ? 0 : 1, now);

    try {
      await incomingChannel.element.play();

      if (oldChannel && oldChannel.gainNode && oldChannel.element) {
        const targetGain = oldChannel.gainNode;
        const targetElement = oldChannel.element;

        targetGain.gain.setValueAtTime(targetGain.gain.value, now);
        targetGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

        setTimeout(() => {
          if (get().activeChannel === incomingChannelKey) {
            targetElement.pause();
          }
        }, fadeDuration * 1000);

        incomingGain.gain.linearRampToValueAtTime(1, now + fadeDuration);
      }

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
      set({
        [incomingChannelKey === "A" ? "channelA" : "channelB"]: {
          element: incomingChannel.element,
          gainNode: incomingGain,
          sourceNode: incomingSource,
        },
      });
      throw error;
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
});
