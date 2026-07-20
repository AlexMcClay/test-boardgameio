import type { Card, GameCtx } from "@project/shared";
import type { PlayerID } from "@project/shared";
import type {
  LegacyAnimationControls,
  TargetAndTransition,
  VariantLabels,
} from "motion/debug";

export interface CardProps {
  card: Card;
  back?: boolean;
  isDragging?: boolean;
  // Skips the layout/layoutId projection animation (Framer's automatic FLIP +
  // spring correction), for ephemeral duplicate copies (e.g. a zoom preview)
  // whose position/scale is instead driven entirely by a wrapping motion element.
  disableLayoutAnimation?: boolean;
  playerID?: PlayerID;
  ctx?: GameCtx;
  type?: "game" | "preview" | "popover";
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
