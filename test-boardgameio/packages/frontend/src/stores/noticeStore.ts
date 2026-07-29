import { create } from "zustand";
import type { MoveValidationError } from "@project/shared";
import { useAudioStore } from "./audioStore";

/** How long a notice stays up before fading on its own. */
const NOTICE_DURATION = 2600;

export type NoticeKind = "warning" | "info";

export interface Notice {
  /** Bumped on every show, so repeating the same message replays the animation. */
  id: number;
  message: string;
  kind: NoticeKind;
}

/**
 * Human copy for `validateMove`'s error codes.
 *
 * Phrased as the reason the move didn't happen, not as an instruction — the
 * player already tried something, they just need to know why it bounced.
 */
const MOVE_ERROR_COPY: Record<MoveValidationError, string> = {
  "card-not-found": "That card isn't in play.",
  "minion-needs-board": "Minions have to be placed on the board.",
  "board-full": "Too many minions",
  "not-enough-mana": "Not enough mana",
  "spell-needs-target": "That spell needs a target.",
  "invalid-target": "Not a valid target",
  "already-attacked": "That minion has already attacked this turn.",
  "no-active-card": "Nothing is selected.",
  "not-your-turn": "It's not your turn.",
  "must-attack-taunt": "Must attack Taunt minion",
  "summon-sickness": "Minion not ready",
  frozen: "That character is Frozen.",
  stealthed: "Can't target Stealthed minion",
  immune: "That character is Immune.",
  "cant-attack": "Minion exhausted",
  elusive: "That minion can't be targeted by spells or Hero Powers.",
};

/**
 * `validateHeroAttack` returns raw restriction reasons for the shared
 * stealth/taunt/immune checks and full sentences for everything else, so its
 * errors are strings rather than a closed union.
 */
const HERO_ATTACK_COPY: Record<string, string> = {
  "target-not-found": "That's not a valid target.",
  stealthed: MOVE_ERROR_COPY.stealthed,
  taunt: MOVE_ERROR_COPY["must-attack-taunt"],
  immune: MOVE_ERROR_COPY.immune,
};

interface NoticeState {
  notice: Notice | null;
  /** Show an arbitrary message. */
  showNotice: (message: string, kind?: NoticeKind) => void;
  /**
   * Show the copy for a rejected move. Accepts a `MoveValidationError` code or
   * a `validateHeroAttack` error, which may already be a sentence.
   */
  showMoveError: (error: MoveValidationError | string) => void;
  clearNotice: () => void;
}

/**
 * Transient one-line messages across the top of the board — chiefly the reasons
 * `validateMove` rejects something, which until now only ever reached the
 * console.
 *
 * One at a time on purpose: these arrive from misclicks, and a stack of them
 * would bury the board. The newest simply replaces whatever is up.
 */
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let nextId = 0;

export const useNoticeStore = create<NoticeState>((set) => ({
  notice: null,

  showNotice: (message, kind = "warning") => {
    if (dismissTimer) clearTimeout(dismissTimer);

    set({ notice: { id: nextId++, message, kind } });

    // The "no can do" cue the assets already carry for exactly this.
    if (kind === "warning") useAudioStore.getState().playSfx("no-can-do");

    dismissTimer = setTimeout(() => {
      dismissTimer = null;
      set({ notice: null });
    }, NOTICE_DURATION);
  },

  showMoveError: (error) => {
    const copy =
      MOVE_ERROR_COPY[error as MoveValidationError] ??
      HERO_ATTACK_COPY[error] ??
      // validateHeroAttack's own messages are already player-facing sentences.
      error;
    useNoticeStore.getState().showNotice(copy, "warning");
  },

  clearNotice: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = null;
    set({ notice: null });
  },
}));
