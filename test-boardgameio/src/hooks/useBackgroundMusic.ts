import { useEffect, useRef, useState } from "react";
import { createBgmTrack, playBgmTrack } from "@/utils/audio";
import { useAudioStore } from "../stores/audioStore";

export const useBackgroundMusic = (src: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Grab state from Zustand
  const musicVolume = useAudioStore((state) => state.musicVolume);
  const isMuted = useAudioStore((state) => state.isMuted);

  // Calculate actual volume based on mute status
  const actualVolume = isMuted ? 0 : musicVolume;

  // Initialize track
  useEffect(() => {
    audioRef.current = createBgmTrack(src, actualVolume);
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  // Sync volume whenever Zustand state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = actualVolume;
    }
  }, [actualVolume]);

  const play = () => {
    if (audioRef.current) {
      playBgmTrack(audioRef.current);
      setIsPlaying(true);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  return { isPlaying, play, pause };
};
