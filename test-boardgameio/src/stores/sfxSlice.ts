import { type StateCreator } from "zustand";
import { type AudioState } from "./audioStore";
import {
  SFX_MANIFEST,
  type SfxId,
  resolveSfxPath,
  loadSfxBuffer,
  LRUCache,
} from "@/utils/sfxManager";

const MAX_CACHE_SIZE = 30;

export interface SfxSlice {
  // State
  preloadedSounds: Map<string, AudioBuffer>;
  cachedSounds: LRUCache<string, AudioBuffer>;
  loadingPromises: Map<string, Promise<AudioBuffer>>;
  masterSfxGain: GainNode | null;

  // Methods
  preloadSfxSounds: () => Promise<void>;
  playSfx: (soundId: string, volume?: number) => Promise<void>;
  getSfxBuffer: (soundId: string) => Promise<AudioBuffer>;
  clearSfxCache: () => void;
}

export const createSfxSlice: StateCreator<AudioState, [], [], SfxSlice> = (
  set,
  get,
) => ({
  // === State ===
  preloadedSounds: new Map(),
  cachedSounds: new LRUCache<string, AudioBuffer>(MAX_CACHE_SIZE),
  loadingPromises: new Map(),
  masterSfxGain: null,

  // === Methods ===

  /**
   * Preload all sounds marked with preload: true in the manifest
   * Call this during game initialization
   */
  preloadSfxSounds: async () => {
    const { audioContext, preloadedSounds } = get();
    if (!audioContext) {
      console.warn("[SFX] Cannot preload - audio context not initialized");
      return;
    }

    console.log("[SFX] Preloading sounds...");

    const preloadEntries = Object.entries(SFX_MANIFEST).filter(
      ([_, config]) => config.preload,
    );

    const loadPromises = preloadEntries.map(async ([id, config]) => {
      try {
        const url = resolveSfxPath(id);
        const buffer = await loadSfxBuffer(audioContext, url);
        preloadedSounds.set(id, buffer);
        console.log(`[SFX] Preloaded: ${id}`);
        return { id, success: true };
      } catch (error) {
        console.error(`[SFX] Failed to preload ${id}:`, error);
        return { id, success: false };
      }
    });

    const results = await Promise.all(loadPromises);
    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[SFX] Preloaded ${successCount}/${preloadEntries.length} sounds`,
    );

    // Update state with new preloaded map
    set({ preloadedSounds: new Map(preloadedSounds) });
  },

  /**
   * Get an AudioBuffer for a sound ID
   * Checks preloaded → cache → loads fresh (and caches)
   */
  getSfxBuffer: async (soundId: string): Promise<AudioBuffer> => {
    const { audioContext, preloadedSounds, cachedSounds, loadingPromises } =
      get();

    if (!audioContext) {
      throw new Error("[SFX] Audio context not initialized");
    }

    // 1. Check preloaded
    if (preloadedSounds.has(soundId)) {
      return preloadedSounds.get(soundId)!;
    }

    // 2. Check cache
    const cached = cachedSounds.get(soundId);
    if (cached) {
      return cached;
    }

    // 3. Check if already loading (prevent duplicate fetches)
    if (loadingPromises.has(soundId)) {
      return loadingPromises.get(soundId)!;
    }

    // 4. Load fresh
    const url = resolveSfxPath(soundId);
    const loadPromise = loadSfxBuffer(audioContext, url)
      .then((buffer) => {
        // Add to cache
        cachedSounds.set(soundId, buffer);
        loadingPromises.delete(soundId);
        console.log(`[SFX] Loaded and cached: ${soundId}`);
        return buffer;
      })
      .catch((error) => {
        loadingPromises.delete(soundId);
        throw error;
      });

    loadingPromises.set(soundId, loadPromise);
    return loadPromise;
  },

  /**
   * Play a sound effect
   * @param soundId - Either a manifest ID or a custom path
   * @param volume - Optional volume multiplier (0.0 to 1.0), defaults to 1.0
   */
  playSfx: async (soundId: string, volume: number = 1.0) => {
    const { audioContext, masterSfxGain, sfxVolume, isMuted } = get();

    // Validate context
    if (!audioContext) {
      console.warn("[SFX] Audio context not initialized");
      return;
    }

    // Initialize SFX gain node if needed
    let sfxGain = masterSfxGain;
    if (!sfxGain) {
      sfxGain = audioContext.createGain();
      sfxGain.gain.setValueAtTime(
        isMuted ? 0 : sfxVolume,
        audioContext.currentTime,
      );
      sfxGain.connect(audioContext.destination);
      set({ masterSfxGain: sfxGain });
    }

    // Resume context if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    try {
      // Get the audio buffer
      const buffer = await get().getSfxBuffer(soundId);

      // Create nodes
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = buffer;

      // Clamp volume between 0 and 1
      const finalVolume = Math.max(0, Math.min(1, volume));
      gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime);

      // Connect: Source → Individual Gain → Master SFX Gain → Destination
      source.connect(gainNode);
      gainNode.connect(sfxGain);

      // Play
      source.start(0);
    } catch (error) {
      console.error(`[SFX] Error playing sound '${soundId}':`, error);
    }
  },

  /**
   * Clear the runtime cache (does not affect preloaded sounds)
   * Useful for memory management or testing
   */
  clearSfxCache: () => {
    const { cachedSounds } = get();
    cachedSounds.clear();
    console.log("[SFX] Cache cleared");
  },
});
