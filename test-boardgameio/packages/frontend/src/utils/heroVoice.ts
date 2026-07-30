import type {
  HeroErrorKey,
  HeroSFX,
  MoveValidationError,
  PlayerID,
  SFXInstance,
} from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import { useDragStore } from "@/stores/dragStore";

/**
 * Playback for `Hero.sfx` — the hero's own voice lines.
 *
 * Separate from noticeStore because voice and banner don't line up one-to-one:
 * a rejected move shows a banner AND speaks, burning a card off a full hand
 * only speaks (the card flying away is its own explanation), and an attack
 * bark has no banner at all.
 */

/**
 * The cues holding a single line, which is everything `playHeroLine` can take:
 * `attack`, `death`, `start`, `picked`, ... but not `thinking` (alternatives to
 * pick between) or `emotes` / `errors` / `startVs` (keyed groups). Derived from
 * `HeroSFX` so it can't drift as cues are added.
 */
export type HeroSingleCue = {
  // NonNullable matters: every cue on HeroSFX is optional, so the raw indexed
  // access is `SFXInstance[] | undefined`, which matches nothing and would
  // collapse this whole union to `never`.
  [K in keyof HeroSFX]-?: NonNullable<HeroSFX[K]> extends SFXInstance[]
    ? K
    : never;
}[keyof HeroSFX];

/** Whose hero speaks: the named seat, else the local player, else whoever's turn it is. */
const resolveSpeaker = (seat?: PlayerID) => {
  const { gameState, localPlayerID, currentPlayer } = useDragStore.getState();
  const speaker = seat ?? localPlayerID ?? currentPlayer;
  if (!gameState || !speaker) return undefined;
  return gameState.players[speaker]?.hero?.sfx;
};

/**
 * An `SFXInstance[]` is a SEQUENCE, so the clips play one after another rather
 * than on top of each other. Fire-and-forget; `playSfx` never rejects.
 */
const speak = (lines: SFXInstance[] | undefined) => {
  if (!lines?.length) return;
  const { playSfx } = useAudioStore.getState();
  void (async () => {
    for (const line of lines) await playSfx(line.soundId, line.volume);
  })();
};

/**
 * Which of the hero's error voice lines answers each rejected move.
 *
 * Deliberately MANY-TO-ONE: Hearthstone only recorded twelve of these barks, so
 * several codes share one line and the ones with no good match fall back to
 * `generic` ("I can't do that."). Every code is listed explicitly rather than
 * defaulting, so adding a `MoveValidationError` fails the build here until
 * someone decides what the hero should say about it.
 */
const MOVE_ERROR_VOICE: Record<MoveValidationError, HeroErrorKey> = {
  "not-enough-mana": "not-enough-mana",
  "board-full": "board-full",
  "summon-sickness": "summon-sickness",
  stealthed: "stealthed",
  "invalid-target": "invalid-target",
  "must-attack-taunt": "must-attack-taunt",
  "hero-already-attacked": "hero-already-attacked",
  "needs-weapon": "needs-weapon",
  // Both mean "that minion can't swing right now", which is ERROR03.
  "already-attacked": "cant-attack",
  "cant-attack": "cant-attack",
  // Malformed plays — the card can't go where it was dropped.
  "minion-needs-board": "cant-play",
  "spell-needs-target": "cant-play",
  // Aimed at something untargetable. The closest recorded line is the
  // valid-target one; there's no Frozen- or Immune-specific bark.
  elusive: "invalid-target",
  immune: "invalid-target",
  "cant-attack-own-side": "invalid-target",
  // No recorded line — "I can't do that."
  "card-not-found": "generic",
  "no-active-card": "generic",
  "not-your-turn": "generic",
  frozen: "generic",
};

/**
 * Error barks run ~2s, so a player mashing an illegal action would stack half a
 * dozen of them on top of each other. Only the audio is rate-limited — the
 * notice banner still updates on every attempt, since it replaces rather than
 * layers.
 *
 * Scoped to error lines on purpose: sharing one cooldown with `playHeroLine`
 * would let a "not enough mana" bark eat the attack line of the swing that
 * followed it.
 */
const ERROR_COOLDOWN = 2500;
let lastErrorAt = 0;

/**
 * Play one of a hero's error lines.
 *
 * Defaults to the LOCAL player's hero, not the current player's: during the
 * opponent's turn a misclick is still your mistake, so your hero is the one who
 * complains. Silent for a hero with no line for it and no `generic` either
 * (Illidan and Arthas have no voice lines at all yet).
 */
export const playHeroErrorLine = (key: HeroErrorKey, seat?: PlayerID) => {
  const errors = resolveSpeaker(seat)?.errors;
  const lines = errors?.[key] ?? errors?.generic;
  if (!lines?.length) return;

  const now = Date.now();
  if (now - lastErrorAt < ERROR_COOLDOWN) return;
  lastErrorAt = now;

  speak(lines);
};

/** Play the hero's bark for a move the validator rejected. */
export const playMoveErrorLine = (error: MoveValidationError) =>
  playHeroErrorLine(MOVE_ERROR_VOICE[error]);

/**
 * Duplicate-fire guard. React re-runs effects on remount (and twice over in
 * StrictMode), and a doubled voice line is far more obvious than a doubled
 * sword clang. Short enough that two genuine attacks — a Windfury hero
 * swinging twice — still get two lines.
 */
const REPEAT_WINDOW = 400;
const lastCueAt = new Map<string, number>();

/**
 * Play a hero's line for a single-line cue: `attack`, `death`, `concede`, and
 * so on. See `HeroSingleCue` for the full set.
 *
 * Unlike the error lines this takes no fallback — a hero missing the cue simply
 * stays quiet. Pass `seat` explicitly for anything that isn't about the local
 * player: an attack bark belongs to whoever is swinging, so you hear the
 * opponent's hero on their turn.
 */
export const playHeroLine = (cue: HeroSingleCue, seat?: PlayerID) => {
  const lines = resolveSpeaker(seat)?.[cue];
  if (!lines?.length) return;

  const guardKey = `${seat ?? "local"}:${cue}`;
  const now = Date.now();
  if (now - (lastCueAt.get(guardKey) ?? 0) < REPEAT_WINDOW) return;
  lastCueAt.set(guardKey, now);

  speak(lines);
};
