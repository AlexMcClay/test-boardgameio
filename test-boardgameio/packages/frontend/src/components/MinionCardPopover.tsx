import { createPortal } from "react-dom";
import { motion } from "motion/react";
import CardComponent from "./Card";
import type { Card } from "@project/shared";
import type { Ctx } from "boardgame.io";

interface Props {
  card: Card | null;
  position: { x: number; y: number } | null;
  ctx?: Ctx;
  animate?: boolean;
  type?: "game" | "preview" | "popover";
}

const MinionCardPopover = ({
  card,
  position,
  ctx,
  animate = true,
  type,
}: Props) => {
  if (!card || !position) return null;

  return createPortal(
    <motion.div
      key={"minion-card-overlay"}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={animate ? { opacity: 0, scale: 0.5 } : {}}
      animate={animate ? { opacity: 1, scale: 1 } : {}}
      exit={animate ? { opacity: 0, scale: 0.5 } : {}}
      transition={animate ? { duration: 0.1 } : {}}
    >
      <div className="scale-200 origin-left">
        <CardComponent card={card} ctx={ctx} type={type} />
      </div>
    </motion.div>,
    document.body,
  );
};

export default MinionCardPopover;
