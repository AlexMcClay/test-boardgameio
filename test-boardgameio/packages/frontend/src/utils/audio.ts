// ==========================================
// 1. SOUND EFFECTS (SFX) - Web Audio API
// ==========================================

// Initialize AudioContext lazily to avoid browser autoplay warnings on import
let audioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

/**
 * Fetches an audio file and decodes it into memory.
 * Cache these buffers so you don't fetch them more than once!
 */
export const loadSfxBuffer = async (url: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
};

/**
 * Plays a sound effect instantly from a pre-loaded buffer.
 * Supports overlapping plays and dynamic volume.
 */
export const playSfx = (buffer: AudioBuffer, volume: number = 1.0): void => {
  const ctx = getAudioContext();

  // Resume context if browser suspended it due to user interaction rules
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  // Create nodes
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = buffer;
  gainNode.gain.value = volume;

  // Connect: Source -> Volume (Gain) -> Speakers (Destination)
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(0);
};

// ==========================================
// 2. BACKGROUND MUSIC (BGM) - HTML5 Audio
// ==========================================

/**
 * Creates a streaming HTMLAudioElement for long music tracks.
 */
export const createBgmTrack = (
  src: string,
  volume: number = 0.3,
): HTMLAudioElement => {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  return audio;
};

/**
 * Safely plays music, handling browser autoplay restrictions.
 */
export const playBgmTrack = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume(); // Sync the Web Audio context too!

    await audio.play();
  } catch (error) {
    console.warn("BGM blocked by browser. Awaiting user interaction.", error);
  }
};
