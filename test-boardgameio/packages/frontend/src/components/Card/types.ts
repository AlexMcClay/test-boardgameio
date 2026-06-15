import type { Card } from "@project/shared";
import type { Ctx, PlayerID } from "boardgame.io";
import type {
  LegacyAnimationControls,
  TargetAndTransition,
  VariantLabels,
} from "motion/debug";

export interface CardProps {
  card: Card;
  back?: boolean;
  isDragging?: boolean;
  playerID?: PlayerID;
  ctx?: Ctx;
  animate?:
    | boolean
    | TargetAndTransition
    | VariantLabels
    | LegacyAnimationControls
    | undefined;
  initial?:
    | boolean
    | TargetAndTransition
    | VariantLabels
    | LegacyAnimationControls
    | undefined;
  exit?:
    | TargetAndTransition
    | VariantLabels
    | LegacyAnimationControls
    | undefined;
}
