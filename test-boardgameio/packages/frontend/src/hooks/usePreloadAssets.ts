import { useEffect, useState } from "react";
import { PRELOAD_IMAGES, PRELOAD_SFX } from "@/utils/preloadManifest";

/** Enough to saturate a connection without starving the assets queued first. */
const CONCURRENCY = 8;
/** A stalled asset must never lock the player out of the game. */
const TIMEOUT_MS = 20_000;

/** Everything the bar counts: images, the sfx bytes, and the title webfont. */
const TOTAL = PRELOAD_IMAGES.length + PRELOAD_SFX.length + 1;

/**
 * Decoded images, held for the lifetime of the page.
 *
 * This retention is the whole point. An `Image` that goes out of scope is
 * garbage-collected along with its decoded bitmap, so a later `<img src>` for
 * the same URL has to re-fetch (or at best revalidate) and re-decode it —
 * which defeats the preload entirely. Keeping the objects alive means the
 * browser serves the real render straight from memory.
 */
const retained: HTMLImageElement[] = [];

/** Resolves on load *and* on error — a 404 should cost a tick, not the splash. */
function warmImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    retained.push(image);
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

/** Bytes into the HTTP cache; the store decodes them later, after a gesture. */
function warmFetch(url: string) {
  return fetch(url).then(
    () => undefined,
    () => undefined,
  );
}

/** Runs `worker` over `items` at most CONCURRENCY at a time, in order. */
async function pool(
  items: string[],
  worker: (url: string) => Promise<void>,
  onEach: () => void,
) {
  let cursor = 0;
  async function drain() {
    while (cursor < items.length) {
      const url = items[cursor++];
      await worker(url);
      onEach();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, drain),
  );
}

/**
 * Kicked off at module scope on first use and never again — a singleton, so
 * StrictMode's double-effect, remounts and multiple callers all share one run.
 */
let run: Promise<void> | null = null;
let loaded = 0;
let finished = false;
const listeners = new Set<() => void>();

function tick() {
  loaded++;
  listeners.forEach((notify) => notify());
}

function start() {
  if (run) return run;

  const work = (async () => {
    await pool(PRELOAD_IMAGES, warmImage, tick);
    await pool(PRELOAD_SFX, warmFetch, tick);
    await document.fonts.ready;
    tick();
  })();

  // Whichever lands first wins; the timeout is the escape hatch, not the path.
  run = Promise.race([
    work,
    new Promise<void>((resolve) => setTimeout(resolve, TIMEOUT_MS)),
  ]).then(() => {
    finished = true;
    listeners.forEach((notify) => notify());
  });

  return run;
}

/** Warms the UI chrome once per page load. Returns 0–1 progress and a done flag. */
export function usePreloadAssets() {
  const [, force] = useState(0);

  useEffect(() => {
    const notify = () => force((n) => n + 1);
    listeners.add(notify);
    start();
    return () => {
      listeners.delete(notify);
    };
  }, []);

  return {
    progress: finished ? 1 : Math.min(loaded / TOTAL, 0.99),
    done: finished,
  };
}
