import {
  validateMove,
  validateHeroAttack,
  validateTargetQuery,
  type GameCtx,
  type GameState,
  type TargetValue,
} from "@project/shared";
import type { GameMoves } from "@/types/gameProps";
import { useNoticeStore } from "@/stores/noticeStore";

/** Surface a rejected aim to the player instead of only the console. */
const reportMoveError = (error: string) =>
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
  { resolve(args: ResolveArgs): void }
> = {
  attack: {
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
    resolve: ({ G, ctx, moves, target }) => {
      const validation = validateHeroAttack(G, ctx, target);
      if (!validation.valid) {
        // Unlike validateMove this returns a mix of raw reasons and full
        // sentences; the store handles both.
        reportMoveError(validation.error ?? "invalid-target");
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
