// ==========================================
// SFX Manager - Utility functions for sound effects
// ==========================================

/**
 * Sound effect manifest - defines all available sounds
 * Use preload: true for frequent UI sounds, false for contextual sounds
 */
export const SFX_MANIFEST = {
  // === UI Sounds (Preloaded) ===
  "button-click": { path: "/ui/button_click.ogg", preload: true },
  "button-over": { path: "/ui/button_over.ogg", preload: true },
  "play-over": { path: "/ui/play_button_mouseover.ogg", preload: true },
  "card-over": {
    path: "/ui/collection_manager_card_mouse_over.ogg",
    preload: true,
  },
  "collection-manager-page-flip": {
    path: "/ui/collection_manager_book_page_flip_back.ogg",
    preload: true,
  },
  "startgame-loop": {
    path: "/ui/StartGame_window_bar_filling_loop.ogg",
    preload: true,
  },

  // === Gameplay Sounds (Preloaded) ===
  "card-play": { path: "/gameplay/card-play.ogg", preload: true },
  "card-draw": { path: "/gameplay/draw_card_1.ogg", preload: true },
  "your-turn": { path: "/gameplay/your_turn.ogg", preload: true },
  "card-magic-loop": {
    path: "/gameplay/card_motion_loop_magical.ogg",
    preload: true,
  },
  "freeze-start": {
    path: "/gameplay/FX_FreezeEvent_BirthStart.ogg",
    preload: true,
  },
  "freeze-end": {
    path: "/gameplay/FX_FreezeEvent_StateEnd.ogg",
    preload: true,
  },

  // Basic minion
  "minion-attack": {
    path: "/gameplay/minion_attack_impact.ogg",
    preload: false,
  },
  "minion-death": { path: "/gameplay/Minion_Death_01.ogg", preload: true },
  "minion-drop-med": {
    path: "/gameplay/Minion_Drop_Medium.ogg",
    preload: true,
  },

  // === Combat Sounds (On-demand) ===

  "attack-spell": { path: "/gameplay/attack-spell.ogg", preload: false },
  "damage-taken": { path: "/gameplay/damage.ogg", preload: false },
  heal: { path: "/gameplay/heal.ogg", preload: false },
  death: { path: "/gameplay/death.ogg", preload: false },

  // === Game State Sounds (On-demand) ===
  victory: { path: "/gameplay/victory.ogg", preload: false },
  defeat: { path: "/gameplay/defeat.ogg", preload: false },
} as const;

export type SfxId = keyof typeof SFX_MANIFEST;

const BASE_SFX_PATH = "/assets/audio/sfx";

/**
 * Resolves a sound path from either a manifest ID or a custom path
 * @param pathOrId - Either a manifest key like 'button-click' or a custom path like '/ui/custom.ogg'
 * @returns The full URL path to the sound file
 */
export const resolveSfxPath = (pathOrId: string): string => {
  // Check if it's a manifest ID
  if (pathOrId in SFX_MANIFEST) {
    const manifestPath = SFX_MANIFEST[pathOrId as SfxId].path;
    return `${BASE_SFX_PATH}${manifestPath}`;
  }

  // Treat as custom path
  // If it starts with /, it's relative to BASE_SFX_PATH
  if (pathOrId.startsWith("/")) {
    return `${BASE_SFX_PATH}${pathOrId}`;
  }

  // Otherwise, use as-is (could be full URL)
  return pathOrId;
};

/**
 * Loads and decodes an audio file into an AudioBuffer
 * @param audioContext - The Web Audio API context
 * @param url - The URL to fetch
 * @returns A promise that resolves to the decoded AudioBuffer
 */
export const loadSfxBuffer = async (
  audioContext: AudioContext,
  url: string,
): Promise<AudioBuffer> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sound: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    console.error(`Error loading sound from ${url}:`, error);
    throw error;
  }
};

/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Automatically evicts oldest entries when maxSize is exceeded
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, remove it first so we can re-add at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        console.log(`[SFX Cache] Evicted sound: ${String(firstKey)}`);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
