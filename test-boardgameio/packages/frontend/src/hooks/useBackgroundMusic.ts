import { useEffect } from "react";
import { useAudioStore } from "../stores/audioStore";

interface UseBackgroundMusicOptions {
  autoplay?: boolean;
  fadeDuration?: number;
}

export const useBackgroundMusic = (options?: UseBackgroundMusicOptions) => {
  const autoplay = options?.autoplay ?? false;
  const fadeDuration = options?.fadeDuration ?? 1.5;

  const globalTrackSrc = useAudioStore((state) => state.globalTrackSrc);
  const currentSrc = useAudioStore((state) => state.currentSrc);
  const prepareTrack = useAudioStore((state) => state.prepareTrack);
  const executePlay = useAudioStore((state) => state.executePlay);

  // Sync state to channel when the Zustand property updates
  useEffect(() => {
    if (globalTrackSrc) {
      // Converting relative strings to absolute path URLs stops the NotSupportedError
      const absoluteUrl = new URL(globalTrackSrc, window.location.origin).href;
      prepareTrack(absoluteUrl);
    }
  }, [globalTrackSrc, prepareTrack]);

  const play = async () => {
    try {
      // The store now handles calling .play() internally and returns safely
      await executePlay(fadeDuration);
      return true;
    } catch (error) {
      console.warn(
        "Autoplay blocked. Maintaining old track until user interaction...",
        error,
      );
      return false;
    }
  };

  const pause = () => {
    const { activeChannel, channelA, channelB, setIsPlaying } =
      useAudioStore.getState();
    const active = activeChannel === "A" ? channelA : channelB;
    if (active?.element) {
      active.element.pause();
      setIsPlaying(false);
    }
  };

  // Autoplay handler loop
  useEffect(() => {
    if (!autoplay || !currentSrc) return;

    let isSubscribed = true;

    const attemptPlay = async () => {
      const success = await play();
      if (success && isSubscribed) {
        removeInteractionListeners();
      }
    };

    const removeInteractionListeners = () => {
      window.removeEventListener("click", attemptPlay);
      window.removeEventListener("keydown", attemptPlay);
      window.removeEventListener("touchstart", attemptPlay);
    };

    attemptPlay();

    window.addEventListener("click", attemptPlay);
    window.addEventListener("keydown", attemptPlay);
    window.addEventListener("touchstart", attemptPlay);

    return () => {
      isSubscribed = false;
      removeInteractionListeners();
    };
  }, [autoplay, currentSrc]);

  return { play, pause };
};
