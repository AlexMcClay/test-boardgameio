import CardComponent from "./Card";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import type { GameState } from "@/types";
import { useAnimationStore } from "@/stores/animationStore";
import { useEffect, useState, useRef } from "react";
import type { CardPlayedAnimation } from "@/types/animations";
import { AnimatePresence, motion } from "motion/react";

interface Props extends BoardProps<GameState> {}

const CardPlayed = ({ ctx, playerID }: Props) => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const [activeCard, setActiveCard] = useState<CardPlayedAnimation | null>(
    null,
  );
  const processedAnimationTime = useRef<number>(-1);

  // 1. Get ALL cardPlayed animations that belong to the ENEMY
  const enemyPlayAnimations = activeAnimations.filter(
    (anim): anim is CardPlayedAnimation =>
      anim.type === "cardPlayed" && anim.playerId !== playerID,
  );

  // 2. Always grab the LATEST one (the end of the array) so rapid plays override old ones
  const latestPlayAnim = enemyPlayAnimations.length
    ? enemyPlayAnimations[enemyPlayAnimations.length - 1]
    : null;

  // console.log(
  //   "currentPlayAnim",
  //   latestPlayAnim?.card.title,
  //   "OTHR",
  //   enemyPlayAnimations.map((a) => a.card.title).join(", "),
  //   activeAnimations.length,
  // );

  useEffect(() => {
    console.log(
      "LATEST PLAY",
      latestPlayAnim?.card.title,
      activeAnimations.length,
    );
    if (!latestPlayAnim) return;

    // 3. Update the display instantly if a newer animation timestamp is found
    if (latestPlayAnim.startTime >= processedAnimationTime.current) {
      processedAnimationTime.current = latestPlayAnim.startTime;
      setActiveCard(latestPlayAnim);
    } else {
      console.log(
        "DIDNT UPDATE DISPLAY",
        latestPlayAnim.startTime,
        processedAnimationTime.current,
      );
    }
  }, [latestPlayAnim]);

  // 4. Automatically clear the card after its duration completes
  useEffect(() => {
    if (!activeCard) return;

    const timer = setTimeout(() => {
      // Only clear if another rapid card animation hasn't already taken over the ref tracker
      if (processedAnimationTime.current === activeCard.startTime) {
        console.log("CLEAR DURATION", activeCard.duration);
        setActiveCard(null);
      }
    }, activeCard.duration);

    return () => clearTimeout(timer);
  }, [activeCard]);

  // 5. Global reset hook when animation store clears out completely
  useEffect(() => {
    if (activeAnimations.length === 0) {
      console.log("RESETTING");
      processedAnimationTime.current = -1;
      setActiveCard(null);
    }
  }, [activeAnimations.length]);

  return (
    // Keep your vital positioning container untouched
    <div className="absolute top-[35vh] left-[21vw] scale-175 pointer-events-none z-50">
      {activeCard && <CardComponent card={activeCard.card} ctx={ctx} />}
    </div>
  );
};

export default CardPlayed;
