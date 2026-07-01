import {
  validateMove,
  type GameState,
  type TargetValue,
} from "@project/shared";
import type { Ctx } from "boardgame.io";
import { useCallback, useEffect } from "react";

interface Props {
  ctx: Ctx;
  G: GameState;
  moves: any;
}

export const useGameTargeting = ({ G, ctx, moves }: Props) => {
  // Handle attack arrow target selection
  const handleAttackTarget = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent;
      const { sourceCardId, attackerId, targetCardId, targetPlayerId } =
        customEvent.detail;
      const cardId = sourceCardId || attackerId; // Support both old and new format

      let target: TargetValue | undefined;

      if (targetCardId) {
        // Find which player owns this card
        const player0HasCard = G.board["0"].some((c) => c.id === targetCardId);
        const targetPlayer = player0HasCard ? "0" : "1";

        target = {
          type: "card",
          id: targetCardId,
          player: targetPlayer,
        };
      } else if (targetPlayerId) {
        target = {
          type: "player",
          id: targetPlayerId,
          player: targetPlayerId,
        };
      }

      if (!target) return;

      // Execute the move with validation and animations
      const validation = validateMove(G, ctx, cardId, "board", target);

      if (!validation.valid) {
        console.warn(`Cannot perform move (UI): ${validation.error}`);
        return; // Don't execute invalid move
      }

      // Execute the move - animations will be detected and played by useEffect
      moves.minionAttack(cardId, target);
    },
    [ctx, moves, G],
  );

  useEffect(() => {
    window.addEventListener("attack-target", handleAttackTarget);
    return () => {
      window.removeEventListener("attack-target", handleAttackTarget);
    };
  }, [handleAttackTarget]);

  // Handle battlecry arrow target selection
  const handleBattlecryTarget = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent;
      const { sourceCardId, targetCardId, targetPlayerId } = customEvent.detail;

      let target: TargetValue | undefined;

      if (targetCardId) {
        const player0HasCard = G.board["0"].some((c) => c.id === targetCardId);
        const targetPlayer = player0HasCard ? "0" : "1";
        target = { type: "card", id: targetCardId, player: targetPlayer };
      } else if (targetPlayerId) {
        target = { type: "player", id: targetPlayerId, player: targetPlayerId };
      }

      if (!target) return;

      // Validate and execute
      const validation = validateMove(G, ctx, sourceCardId, "board", target);
      if (!validation.valid) {
        console.warn(`Cannot resolve battlecry (UI): ${validation.error}`);
        return;
      }

      moves.resolveBattlecry(sourceCardId, target);
    },
    [G, ctx, moves],
  );

  useEffect(() => {
    window.addEventListener("battlecry-target", handleBattlecryTarget);
    return () => {
      window.removeEventListener("battlecry-target", handleBattlecryTarget);
    };
  }, [handleBattlecryTarget]);

  // Handle hero power arrow target selection
  const handleHeroPowerTarget = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent;
      const { targetCardId, targetPlayerId } = customEvent.detail;

      let target: TargetValue | undefined;

      if (targetCardId) {
        const player0HasCard = G.board["0"].some((c) => c.id === targetCardId);
        const targetPlayer = player0HasCard ? "0" : "1";
        target = { type: "card", id: targetCardId, player: targetPlayer };
      } else if (targetPlayerId) {
        target = { type: "player", id: targetPlayerId, player: targetPlayerId };
      }

      if (!target) return;

      // Execute hero power with target
      moves.useHeroPower(target);
    },
    [G, moves]
  );

  useEffect(() => {
    window.addEventListener("hero-power-target", handleHeroPowerTarget);
    return () => {
      window.removeEventListener("hero-power-target", handleHeroPowerTarget);
    };
  }, [handleHeroPowerTarget]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && G.activeBattlecryMinion) {
        console.log("Canceling battlecry with ESC");
        moves.cancelBattlecry();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [G.activeBattlecryMinion, moves]);
};
