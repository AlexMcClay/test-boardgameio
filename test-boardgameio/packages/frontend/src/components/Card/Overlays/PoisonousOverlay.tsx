import { motion } from "motion/react";

type Props = {};

/**
 * Poisonous marker: a toxic green rim on the minion. CSS-only — there's no
 * poison art in assets, and a coloured glow reads clearly at board scale.
 */
const PoisonousOverlay = (_props: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      key={"poisonous"}
      aria-hidden="true"
      className="pointer-events-none absolute inset-[2px] z-10 rounded-[50%/50%]"
      style={{
        boxShadow:
          "inset 0 0 0.6vw 0.15vw rgba(74,222,128,0.75), 0 0 0.5vw 0.1vw rgba(34,197,94,0.55)",
      }}
    />
  );
};

export default PoisonousOverlay;
