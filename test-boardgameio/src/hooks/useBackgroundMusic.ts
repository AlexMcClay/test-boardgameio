import { useEffect } from "react";
import { playBgmTrack } from "@/utils/audio";
import { useAudioStore } from "../stores/audioStore";

interface UseBackgroundMusicOptions {
  autoplay?: boolean;
}

export const useBackgroundMusic = (
  src: string,
  options?: UseBackgroundMusicOptions,
) => {
  const autoplay = options?.autoplay ?? false;

  // Pull states and actions from the Zustand store
  const audioInstance = useAudioStore((state) => state.audioInstance);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const changeTrack = useAudioStore((state) => state.changeTrack);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);

  // 1. Tell store to prepare the right track whenever the src parameter changes
  useEffect(() => {
    changeTrack(src);
  }, [src, changeTrack]);

  const play = async () => {
    if (!audioInstance) return false;

    try {
      await playBgmTrack(audioInstance);
      setIsPlaying(true);
      return true;
    } catch (error) {
      console.warn("Autoplay blocked. Waiting for user interaction...", error);
      setIsPlaying(false);
      return false;
    }
  };

  const pause = () => {
    if (audioInstance) {
      audioInstance.pause();
      setIsPlaying(false);
    }
  };

  // 2. Handle Autoplay / User Interaction Retry logic
  useEffect(() => {
    if (!autoplay || !audioInstance) return;

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
  }, [autoplay, audioInstance]); // Re-run if autoplay rule or audio element changes

  return { isPlaying, play, pause };
};
