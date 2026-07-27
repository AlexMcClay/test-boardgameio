import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
// import { useAudioStore } from "@/stores/audioStore";

type Props = {
  isMinion?: boolean;
};

const divineShield = "assets/DamageShield_Bubble2.webp";
const immune_bubble = "assets/immune_bubble.png";

const ImmuneOverlay = ({ isMinion }: Props) => {
  const isFirstRender = useRef(true);
  // const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // playSfx("divine-shield");
      return;
    }
  }, []);

  return (
    <motion.div
      initial={{
        scale: 0.5,
        opacity: 0.5,
      }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      exit={{
        scale: 1.2,
        opacity: 0.5,
      }}
      key={"divineShield"}
      className={"absolute inset-0  z-10"}
    >
      <img
        src={isMinion ? immune_bubble : divineShield}
        alt="Immune Hero"
        className={twMerge(
          " w-full h-full object-cover pointer-events-none scale-150 scale-x-165 brightness-125 ",
          isMinion && "scale-x-140 scale-140 brightness-100",
        )}
      />
    </motion.div>
  );
};

export default ImmuneOverlay;
