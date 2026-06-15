import { createPortal } from "react-dom";
import { motion } from "motion/react";
import CardComponent from "./Card";
import type { Card } from "@project/shared";
import type { Ctx } from "boardgame.io";

interface Props {
  card: Card | null;
  position: { x: number; y: number } | null;
  ctx: Ctx;
}

const MinionCardPopover = ({ card, position, ctx }: Props) => {
  if (!card || !position) return null;

  return createPortal(
    <motion.div
      key={"minion-card-overlay"}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <div className="scale-150 origin-left">
        <CardComponent card={card} ctx={ctx} />
      </div>
    </motion.div>,
    document.body,
  );
};

export default MinionCardPopover;
