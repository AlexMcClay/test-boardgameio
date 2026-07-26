import { motion } from "motion/react";

type Props = {};

/**
 * Immune marker: a golden shell, pulsing so it reads as an active ward rather
 * than a static buff. CSS-only — there's no immune art in assets.
 */
const ImmuneOverlay = (_props: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: [0.7, 1, 0.7], scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{
        opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 0.25 },
      }}
      key={"immune"}
      aria-hidden="true"
      className="pointer-events-none absolute inset-[2px] z-10 rounded-[50%/50%]"
      style={{
        boxShadow:
          "inset 0 0 0.7vw 0.2vw rgba(253,224,71,0.8), 0 0 0.7vw 0.2vw rgba(250,204,21,0.6)",
      }}
    />
  );
};

export default ImmuneOverlay;
