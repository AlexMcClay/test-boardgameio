import { useEffect, useRef } from "react";
import { motion } from "motion/react";
// import { useAudioStore } from "@/stores/audioStore";

type Props = {};

const divineShield = "assets/DivineShield_Bubble2.png";

const DivineShieldOverlay = (_props: Props) => {
  const isFirstRender = useRef(true);
  // const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // playSfx("freeze-start");
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
      className={"absolute inset-[2px] rounded-[50%/50%] z-10"}
    >
      <img
        src={divineShield}
        alt={"divineShield"}
        className="object-cover w-full h-full select-none scale-129"
        draggable="false"
      />
    </motion.div>
  );
};

export default DivineShieldOverlay;
