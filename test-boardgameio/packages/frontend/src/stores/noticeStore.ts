import { create } from "zustand";
import type { MoveValidationError } from "@project/shared";
import { useAudioStore } from "./audioStore";
import { playMoveErrorLine } from "@/utils/heroVoice";

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
  "hero-already-attacked": "Your hero has already attacked this turn.",
  "needs-weapon": "Equip a weapon first",
  "cant-attack-own-side": "Can't attack your own side.",
};

interface NoticeState {
  notice: Notice | null;
  /** Show an arbitrary message. */
  showNotice: (message: string, kind?: NoticeKind) => void;
  /**
   * Show the copy for a rejected move, and play the local hero's bark for it.
   *
   * Takes a code, never prose: `validateHeroAttack` used to hand back finished
   * sentences and this accepted `string` to swallow them, which meant any typo'd
   * code silently became the banner text.
   */
  showMoveError: (error: MoveValidationError) => void;
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
    if (kind === "warning") useAudioStore.getState().playSfx("no-can-do", 0.3);

    dismissTimer = setTimeout(() => {
      dismissTimer = null;
      set({ notice: null });
    }, NOTICE_DURATION);
  },

  showMoveError: (error) => {
    const copy = MOVE_ERROR_COPY[error];
    useNoticeStore.getState().showNotice(copy, "warning");
    playMoveErrorLine(error);
  },

  clearNotice: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = null;
    set({ notice: null });
  },
}));
