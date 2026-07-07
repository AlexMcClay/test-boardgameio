import type { HeroPower } from "@project/shared";
import HeroPowerExpanded from "./HeroPowerExpanded";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

type Props = {
  position: { x: number; y: number } | null;
  heroPower: HeroPower;
  isTop?: boolean;
};

const HeroPowerPopover = ({ position, ...props }: Props) => {
  if (!props.heroPower || !position) return null;
  return createPortal(
    <motion.div
      key={"minion-card-overlay"}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.1 }}
    >
      <div className="origin-left scale-110 pointer-events-none">
        <HeroPowerExpanded {...props} />
      </div>
    </motion.div>,
    document.body,
  );
  return <div></div>;
};

export default HeroPowerPopover;
