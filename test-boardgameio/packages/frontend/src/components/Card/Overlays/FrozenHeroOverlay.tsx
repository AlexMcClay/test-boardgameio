import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";

type Props = {};

const frozenHero = "assets/frozen_hero.png";

const FrozenHeroOverlay = (_props: Props) => {
  const isFirstRender = useRef(true);
  const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("freeze-start");
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
      key={"frozen"}
      className={"absolute inset-0 z-10"}
    >
      <img
        src={frozenHero}
        alt="Frozen Hero"
        className={
          "w-full h-full object-cover pointer-events-none transition-opacity duration-300  opacity-100 scale-150 scale-x-165"
        }
      />
    </motion.div>
  );
};

export default FrozenHeroOverlay;
