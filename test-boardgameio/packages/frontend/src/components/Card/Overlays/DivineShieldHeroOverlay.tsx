import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
// import { useAudioStore } from "@/stores/audioStore";

type Props = {};

const divineShield = "assets/divine_shield_hero.webp";

const DivineShieldHeroOverlay = (_props: Props) => {
  const isFirstRender = useRef(true);
  const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("divine-shield");
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
        src={divineShield}
        alt="Divine Shield Hero"
        className={
          " w-full h-full object-cover pointer-events-none scale-150 scale-x-165 brightness-125 "
        }
      />
    </motion.div>
  );
};

export default DivineShieldHeroOverlay;
