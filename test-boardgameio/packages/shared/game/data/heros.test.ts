import { readdirSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Hero, SFXInstance } from "../types";
import { heros } from "./heros";

/**
 * The hero voice lines are ~330 filenames transcribed off hearthstone.wiki.gg,
 * with genuinely erratic casing and numbering (`VO_Hero_02_*` next to
 * `VO_HERO_02_*`, an `ERROR010`, every class's ERROR11 numbered `_20`). A typo
 * in one is invisible until that exact cue fires in game.
 *
 * Matching is done against a directory LISTING rather than with existsSync, so
 * that it stays case-sensitive when the suite runs on Windows. Getting the case
 * wrong is a real 404 once the assets are served off the Linux host, and
 * existsSync would happily wave it through locally.
 */
const SFX_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../frontend/public/assets/audio/sfx",
);

/** Exact-case file listings of the sfx folders, keyed by "/dir" as it appears in a soundId. */
const listings = new Map<string, Set<string>>();

const hasFile = (soundId: string): boolean => {
  const dir = posix.dirname(soundId);
  let listing = listings.get(dir);

  if (!listing) {
    try {
      listing = new Set(readdirSync(resolve(SFX_ROOT, `.${dir}`)));
    } catch {
      listing = new Set();
    }
    listings.set(dir, listing);
  }

  return listing.has(posix.basename(soundId));
};

/** Every `soundId` on a hero, flattened, with a label for the failure message. */
const soundIds = (hero: Hero): [label: string, soundId: string][] => {
  const out: [string, string][] = [];
  const add = (label: string, lines?: SFXInstance[]) => {
    for (const line of lines ?? []) out.push([label, line.soundId]);
  };

  const { sfx } = hero;
  if (!sfx) return out;

  for (const [cue, value] of Object.entries(sfx)) {
    if (!value) continue;
    if (cue === "thinking") {
      (value as SFXInstance[][]).forEach((lines, i) =>
        add(`thinking[${i}]`, lines),
      );
    } else if (Array.isArray(value)) {
      add(cue, value as SFXInstance[]);
    } else {
      // startVs / emotes / errors: a keyed group of cues.
      for (const [key, lines] of Object.entries(
        value as Record<string, SFXInstance[]>,
      )) {
        add(`${cue}.${key}`, lines);
      }
    }
  }

  return out;
};

describe.each(heros.map((hero) => [hero.class, hero] as const))(
  "%s voice lines",
  (_class, hero) => {
    it("point at files that exist", () => {
      const missing = soundIds(hero)
        .filter(([, id]) => !hasFile(id))
        .map(([label, id]) => `${label}: ${id}`);

      expect(missing).toEqual([]);
    });

    it("have a transcript for every clip", () => {
      // `announcer` is the one exception: it lives in a different folder and
      // just names the class, so the wiki has no transcript for it.
      const cues = Object.keys(hero.sfx ?? {}).filter((c) => c !== "announcer");
      const transcribed = Object.keys(hero.sfxText ?? {});

      expect(cues.sort()).toEqual(transcribed.sort());
    });
  },
);
