import { createPortal } from "react-dom";
import { motion } from "motion/react";

interface Props {
  title: string;
  count: number;
  position: { x: number; y: number } | null;
  /** When `count` reaches this, `fullMessage` replaces the plain count line. */
  maxCount?: number;
  fullMessage?: string;
}

const CountPopover = ({
  title,
  count,
  position,
  maxCount,
  fullMessage,
}: Props) => {
  if (!position) return null;

  return createPortal(
    <motion.div
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.12 }}
    >
      <div
        className="
          relative
          overflow-hidden
          min-w-[10vw]
          max-w-[14vw]
          px-[0.9vw]
          py-[0.7vw]

          border-[0.18vw]
          border-[#8e8e8e]

          rounded-[0.45vw]

          bg-[#262626]

          shadow-[inset_0_0_0.25vw_rgba(255,255,255,0.15),0_0.25vw_0.8vw_rgba(0,0,0,0.75)]

          backdrop-blur-[0.08vw]
        "
      >
        <div
          className="
            relative
            text-[1.25vw]
            leading-none
            font-black
            text-white
            tracking-tight
            mb-[0.45vw]
            text-shadow-A
          "
        >
          {title}
        </div>

        <div
          className="
            relative
            text-[0.9vw]
            leading-[1.2]
            font-semibold
            text-[#f0f0f0]
            text-shadow-A
          "
        >
          {maxCount !== undefined && fullMessage && count >= maxCount
            ? fullMessage
            : `${count} ${count === 1 ? "card" : "cards"}`}
        </div>
      </div>
    </motion.div>,
    document.body,
  );
};

export default CountPopover;
