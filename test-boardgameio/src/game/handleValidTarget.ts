import type { Card, TargetValue } from "@/types";
import type { PlayerID } from "boardgame.io";

export function handleValidTarget(ctx: any, card: Card, target: TargetValue) {
  return card.targets.some((t) => {
    const isFriendly = target.player === ctx.currentPlayer;

    switch (t) {
      case "card":
        return target.type === "card";
      case "player":
        return target.type === "player";
      case "card-friendly":
        return target.type === "card" && isFriendly;
      case "card-opponent":
        return target.type === "card" && !isFriendly;
      case "player-friendly":
        return target.type === "player" && isFriendly;
      case "player-opponent":
        return target.type === "player" && !isFriendly;
      default:
        return false;
    }
  });
}
