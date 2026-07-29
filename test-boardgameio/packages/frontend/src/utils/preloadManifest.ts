import { cardTemplates, heros } from "@project/shared";
import { classIcons } from "./index";
import { SFX_MANIFEST, resolveSfxPath } from "./sfxManager";

/**
 * The UI chrome the game shows before any card art does: frames, gems, icons,
 * portraits and screen backgrounds.
 *
 * None of these go through Vite — every asset in this app is a runtime string
 * into `public/`, so nothing is fetched until the component that needs it
 * mounts. Warming this list up front is what removes the pop-in.
 *
 * Deliberately NOT here: the 453 card images (~29 MB) and the per-card voice
 * lines (~21 MB). Those stream on demand and the voice lines already have an
 * LRU cache in `sfxManager`.
 */

/** The codebase mixes `"assets/…"` and `"/assets/…"`; normalise so the de-dupe works. */
const abs = (path: string) =>
  path.startsWith("/") ? path : `/${path.replace(/^\.?\//, "")}`;

/**
 * Frame filenames are `<class>_<kind>_frame.webp`, built the same way
 * `Card/index.tsx` builds them at render time.
 */
const CLASS_SLUGS = classIcons.map(({ name }) => name.toLowerCase());
const cardFrames = (["minion", "spell", "weapon"] as const).flatMap((kind) =>
  CLASS_SLUGS.map(
    (slug) => `assets/card_parts/${kind}_frames/${slug}_${kind}_frame.webp`,
  ),
);

/** `Card/index.tsx` builds `/assets/icons/${card.rarity}.webp` dynamically. */
const rarityGems = [
  ...new Set(
    // `cardTemplates` is a const object literal, so its union of value types
    // only carries `rarity` on the entries that declare one.
    Object.values(cardTemplates)
      .map((template) => (template as { rarity?: string }).rarity)
      .filter(Boolean),
  ),
].map((rarity) => `assets/icons/${rarity}.webp`);

/** Shared board/card furniture, referenced as literals across many components. */
const gameChrome = [
  "assets/Card_Back.png",
  "assets/mana.png",
  "assets/mana_bar.png",
  "assets/attack.png",
  "assets/health.png",
  "assets/deck_frame.png",
  "assets/minion_frame.png",
  "assets/minion_taunt.png",
  "assets/weapon_frame.png",
  "assets/exit_button.png",
  "assets/gamemode_parchment.png",
  "assets/Your_Turn.png",
  "assets/damage_icon.png",
  "assets/frozen.png",
  "assets/frozen_hero.png",
  "assets/immune_bubble.png",
  "assets/divine_shield_hero.webp",
  "assets/DivineShield_Bubble2.png",
  "assets/DamageShield_Bubble2.webp",
  "assets/icons/weapon_attack.png",
  "assets/icons/weapon_shield.png",
  "assets/icons/skull.png",
  "assets/icons/poison.png",
  "assets/icons/Trigger.webp",
  "assets/icons/Armor.webp",
  "assets/hero_powers/hero_power.png",
  "assets/hero_powers/hero_power_used.png",
  "assets/hero_powers/Hero-power-player.webp",
  "assets/hero_powers/Hero-power-opponent.webp",
];

/** Full-screen art. `main_menu.jpg` is first — the splash itself renders on it. */
const screens = [
  "assets/menu/main_menu.jpg",
  "assets/collection/collection.jpg",
  "assets/collection/sheet.jpg",
  "assets/play_screen/background.png",
  "assets/play_screen/play.png",
  "assets/play_screen/play_inactive.png",
  "assets/battlefields/board.jpg",
];

/**
 * Derived paths that have no file behind them. The loader tolerates 404s, but
 * requesting these anyway would only pad the progress bar with dead ticks.
 * - Neutral has no weapon frame (there are no neutral weapons).
 * - `Placeholder.jpg` is what the two unimplemented heroes' powers point at.
 */
const KNOWN_MISSING = new Set([
  "/assets/card_parts/weapon_frames/neutral_weapon_frame.webp",
  "/assets/hero_powers/Placeholder.jpg",
]);

/** Ordered, de-duplicated, absolute. Order matters: the splash art loads first. */
export const PRELOAD_IMAGES: string[] = [
  ...new Set(
    [
      ...screens,
      ...classIcons.map(({ icon }) => icon),
      ...cardFrames,
      ...rarityGems,
      ...gameChrome,
      ...heros.map((hero) => hero.portrait),
      ...heros.map((hero) => hero.heroPower?.imageUrl).filter(Boolean),
    ]
      .filter((path): path is string => Boolean(path))
      .map(abs)
      .filter((path) => !KNOWN_MISSING.has(path)),
  ),
];

/**
 * The sfx the store marks `preload: true`. Warmed with `fetch`, not decoded —
 * decoding needs an AudioContext, and constructing one before a user gesture
 * leaves it suspended. This just puts the bytes in the HTTP cache so the
 * store's own `preloadSfxSounds()` resolves instantly once audio starts.
 */
export const PRELOAD_SFX: string[] = Object.entries(SFX_MANIFEST)
  .filter(([, config]) => config.preload)
  .map(([id]) => resolveSfxPath(id));
