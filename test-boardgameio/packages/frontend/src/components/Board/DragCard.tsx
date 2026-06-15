import React, { useEffect, useRef } from "react";

import { motion } from "motion/react";
import CardComponent from "../Card";
import type { Ctx } from "boardgame.io";
import type { Card } from "@/types";
import { useAudioStore } from "@/stores/audioStore";

type Props = {
  ctx: Ctx;
  activeCard: Card;
  wasHovered: boolean;
};

const DragCard = ({ activeCard, wasHovered, ctx }: Props) => {
  const playSfxLoop = useAudioStore((state) => state.playSfxLoop);
  const stopSfxLoop = useAudioStore((state) => state.stopSfxLoop);
  const loopIdRef = useRef<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    let isMounted = true;
    let activeLoopId: string | null = null;

    console.log("running");

    playSfxLoop("card-magic-loop", 0.1).then((id) => {
      // If the component unmounted while the promise was resolving,
      // immediately kill the audio loop we just created.
      if (!isMounted) {
        stopSfxLoop(id);
        return;
      }

      activeLoopId = id;
      loopIdRef.current = id;
    });

    // Cleanup function
    return () => {
      isMounted = false; // Prevents the .then() from saving the ID if it resolves late

      if (activeLoopId) {
        stopSfxLoop(activeLoopId);
      } else if (loopIdRef.current) {
        // Backup check in case it managed to sync-resolve
        stopSfxLoop(loopIdRef.current);
      }

      loopIdRef.current = null;
    };
  }, [playSfxLoop, stopSfxLoop]);
  // Added store functions to dependencies (they are stable from Zustand anyway)
  return (
    <motion.div
      key={`overlay-${activeCard.id}`}
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: activeCard.isSpell ? 0.45 : 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.5,
        transition: { duration: 3, ease: "easeInOut" },
      }}
      transition={{
        duration: 2,
      }}
    >
      <CardComponent
        animate="normal"
        initial={wasHovered ? "play-hover" : "normal"}
        card={activeCard}
        isDragging={true}
        ctx={ctx}
        playerID={""}
      />
    </motion.div>
  );
};

export default DragCard;
