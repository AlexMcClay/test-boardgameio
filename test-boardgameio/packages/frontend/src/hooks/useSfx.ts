import { useEffect, useRef } from "react";
import { loadSfxBuffer, playSfx } from "@/utils/audio";
import { useAudioStore } from "../stores/audioStore";

export const useSfx = (soundManifest: Record<string, string>) => {
  const buffersRef = useRef<Record<string, AudioBuffer>>({});

  // Grab volume from Zustand
  const sfxVolume = useAudioStore((state) => state.sfxVolume);
  const isMuted = useAudioStore((state) => state.isMuted);

  useEffect(() => {
    Object.entries(soundManifest).forEach(([key, url]) => {
      loadSfxBuffer(url)
        .then((buffer) => {
          buffersRef.current[key] = buffer;
        })
        .catch((err) => console.error(`Failed to load SFX: ${key}`, err));
    });
  }, []);

  const triggerSfx = (key: string, localVolumeMultiplier: number = 1.0) => {
    if (isMuted) return; // Silent if muted

    const buffer = buffersRef.current[key];
    if (buffer) {
      // Multiply global SFX settings by a local multiplier
      // (e.g., a quiet footstep vs a loud explosion)
      const finalVolume = sfxVolume * localVolumeMultiplier;
      playSfx(buffer, finalVolume);
    }
  };

  return { triggerSfx };
};
