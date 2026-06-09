import type { Card } from "@/types";
import type { Ctx, PlayerID } from "boardgame.io";

export interface CardProps {
  card: Card;
  back?: boolean;
  isDragging?: boolean;
  playerID?: PlayerID;
  ctx: Ctx;
}
