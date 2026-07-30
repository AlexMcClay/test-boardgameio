import {
  validateMove,
  validateHeroAttack,
  validateTargetQuery,
  type GameCtx,
  type GameState,
  type MoveValidationError,
  type TargetValue,
} from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import { useNoticeStore } from "@/stores/noticeStore";

/** Surface a rejected aim to the player instead of only the console. */
const reportMoveError = (error: MoveValidationError) =>
  useNoticeStore.getState().showMoveError(error);

export type TargetingMode =
  | "attack"
  | "battlecry"
  | "hero-power"
  | "hero-attack"
  // Aiming a Choose One half that was picked in the ChoiceOverlay. The option
  // card is the activeCard; choiceOptionIndex is what the move needs.
  | "choice";

export interface ResolveArgs {
  /** ACTUAL game state — see the file-level invariant. */
  G: GameState;
  ctx: GameCtx;
  moves: GameMoves;
  /** dragStore.targetingCardId — the minion, hero or Choose One parent. */
  sourceId: string | null;
  target: TargetValue;
  /** "choice" mode only: index into G.pendingChoice.options. */
  choiceOptionIndex: number | null;
}

/**
 * Did this gesture end on the very thing it started from?
 *
 * Releasing where you began is how a player backs out of an aim — a click that
 * starts and stops on the same minion reads as "never mind", not as an attempt
 * to attack yourself. Resolving it anyway would bounce off `validateMove` and
 * fire a notice plus a hero bark for what was really a cancelled gesture.
 *
 * Heroes are compared through the `hero-<seat>` id that `HeroSection` starts the
 * aim with, since their TargetValue is a bare `player` instead.
 */
export function isSourceTarget(
  sourceId: string | null,
  target: TargetValue,
): boolean {
  if (!sourceId) return false;
  if (target.type === "card") return target.id === sourceId;
  if (target.type === "player") return `hero-${target.id}` === sourceId;
  return false;
}

export function toTargetValue(
  G: GameState,
  hit: { targetCardId: string | null; targetPlayerId: string | null },
): TargetValue | null {
  if (hit.targetCardId) {
    const player = G.board["0"].some((c) => c.id === hit.targetCardId)
      ? "0"
      : "1";
    return { type: "card", id: hit.targetCardId, player };
  }
  if (hit.targetPlayerId) {
    return {
      type: "player",
      id: hit.targetPlayerId,
      player: hit.targetPlayerId,
    };
  }
  return null;
}

export const TARGETING_MODES: Record<
  TargetingMode,
  {
    resolve(args: ResolveArgs): void;
    /**
     * Releasing back on the source cancels the aim instead of resolving it.
     *
     * Set for the aims a player STARTS by pressing on the source: press-and-
     * release on the same minion is how you back out of an attack, and pushing
     * that through the validator barks "not a valid target" at what was really a
     * cancelled gesture.
     *
     * NOT set for aims that open by themselves — a battlecry arrow appears when
     * the minion lands and a Choose One arrow when the half is picked, so there
     * was no press to undo and a click on the source is a deliberate
     * self-target. Abusive Sergeant buffing itself depends on that.
     */
    cancelOnSourceRelease?: boolean;
  }
> = {
  attack: {
    cancelOnSourceRelease: true,
    resolve: ({ G, ctx, moves, sourceId, target }) => {
      if (!sourceId) return;
      const validation = validateMove(G, ctx, sourceId, "board", target);
      if (!validation.valid) {
        reportMoveError(validation.error);
        return;
      }
      moves.minionAttack(sourceId, target);
    },
  },

  battlecry: {
    resolve: ({ G, ctx, moves, sourceId, target }) => {
      if (!sourceId) return;
      const validation = validateMove(G, ctx, sourceId, "board", target);
      if (!validation.valid) {
        reportMoveError(validation.error);
        return;
      }
      moves.resolveBattlecry(sourceId, target);
    },
  },

  "hero-attack": {
    cancelOnSourceRelease: true,
    resolve: ({ G, ctx, moves, target }) => {
      const validation = validateHeroAttack(G, ctx, target);
      if (!validation.valid) {
        reportMoveError(validation.error);
        return;
      }
      moves.heroAttack(target);
    },
  },

  // Deliberately unvalidated on the client, matching the behaviour this
  // replaced. The engine re-checks used-this-turn, mana and the target query.
  "hero-power": {
    resolve: ({ moves, target }) => {
      moves.useHeroPower(target);
    },
  },

  choice: {
    resolve: ({ G, ctx, moves, target, choiceOptionIndex }) => {
      if (typeof choiceOptionIndex !== "number") return;

      // Pre-validate against the option card's own targetQuery, the same check
      // the engine repeats in resolveChoice. Releasing on an illegal target
      // just does nothing and leaves the prompt open.
      const option = G.pendingChoice?.options[choiceOptionIndex];
      if (!option) return;
      if (
        option.targetQuery &&
        !validateTargetQuery(
          option.targetQuery,
          {
            G,
            ctx,
            card: option,
            target,
            playerID: ctx.currentPlayer,
            location: "hand",
            type: "spell",
          },
          option.id,
        )
      ) {
        reportMoveError("invalid-target");
        return;
      }

      moves.resolveChoice(choiceOptionIndex, target);
    },
  },
};
