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
  stopTrack: (fadeDuration?: number) => void;
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
    // A channel reused soon after `stopTrack` still has that fade-out ramp
    // scheduled on it. `setValueAtTime` does not displace a pending ramp, so
    // without this the new track would start at full volume and then slide to
    // silence on the old ramp's schedule.
    incomingGain.gain.cancelScheduledValues(now);
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

  /**
   * Fades the active channel out and stops it. Unlike the pause in
   * `useBackgroundMusic`, this tears the selection down as well: `currentSrc`
   * and `globalTrackSrc` are cleared so the next screen's `setGlobalTrack` is
   * seen as a change and re-prepares cleanly. Leaving `currentSrc` set would
   * make `prepareTrack`'s identity guard swallow a request for the same track
   * and the music would never come back.
   *
   * The channel's element, gain and source nodes are deliberately kept —
   * `createMediaElementSource` throws if it runs twice on the same element, so
   * `executePlay` must be able to find and reuse them.
   */
  stopTrack: (fadeDuration = 1.0) => {
    const { activeChannel, channelA, channelB, audioContext } = get();
    const active =
      activeChannel === "A" ? channelA : activeChannel === "B" ? channelB : null;

    set({
      currentSrc: null,
      globalTrackSrc: null,
      activeChannel: null,
      isPlaying: false,
    });

    if (!active?.element) return;

    const element = active.element;

    // No context yet means nothing ever routed through the graph; just stop.
    if (!active.gainNode || !audioContext) {
      element.pause();
      element.currentTime = 0;
      return;
    }

    const now = audioContext.currentTime;
    active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
    active.gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);

    setTimeout(() => {
      // A new track may have claimed this channel while the fade ran; pausing
      // then would cut off the music that just started.
      const { activeChannel: current, channelA: a, channelB: b } = get();
      const claimed =
        (current === "A" ? a : current === "B" ? b : null)?.element === element;
      if (claimed) return;

      element.pause();
      element.currentTime = 0;
    }, fadeDuration * 1000);
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
});
