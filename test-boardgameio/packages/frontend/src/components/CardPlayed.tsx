import CardComponent from "./Card";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { useAnimationStore } from "@/stores/animationStore";
import { useEffect, useState, useRef } from "react";
import type {
  CardPlayedAnimation,
  HeroPowerAnimation,
} from "@/types/animations";
import { useAudioStore } from "@/stores/audioStore";
import type { GameState } from "@project/shared";
import HeroPowerExpanded from "./HeroPower/HeroPowerExpanded";
import { twMerge } from "tailwind-merge";

interface Props extends BoardProps<GameState> {}

// Union type for the actions this component handles
type ActiveActionAnimation = CardPlayedAnimation | HeroPowerAnimation;

const CardPlayed = ({ ctx, playerID }: Props) => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const [activeAction, setActiveAction] =
    useState<ActiveActionAnimation | null>(null);
  const playSfx = useAudioStore((state) => state.playSfx);

  const processedAnimationTime = useRef<number>(-1);

  // 1. Get ALL cardPlayed AND heroPower animations that belong to the ENEMY
  const enemyPlayAnimations = activeAnimations.filter(
    (anim): anim is ActiveActionAnimation =>
      (anim.type === "cardPlayed" || anim.type === "heroPower") &&
      anim.playerId !== playerID,
  );

  // 2. Always grab the LATEST one (the end of the array) so rapid actions override old ones
  const latestPlayAnim = enemyPlayAnimations.length
    ? enemyPlayAnimations[enemyPlayAnimations.length - 1]
    : null;

  useEffect(() => {
    if (!latestPlayAnim) return;

    // 3. Update the display instantly if a newer animation timestamp is found
    if (latestPlayAnim.startTime >= processedAnimationTime.current) {
      processedAnimationTime.current = latestPlayAnim.startTime;

      // Play a contextual sound effect depending on the type
      if (latestPlayAnim.type === "heroPower") {
        playSfx("hero-power-activate"); // Or whatever your sound hook string is
      } else {
        playSfx("card-draw");
      }

      setActiveAction(latestPlayAnim);
    }
  }, [latestPlayAnim, playSfx]);

  // 4. Automatically clear the action after its duration completes
  useEffect(() => {
    if (!activeAction) return;

    const timer = setTimeout(() => {
      // Only clear if another rapid animation hasn't already taken over the ref tracker
      if (processedAnimationTime.current === activeAction.startTime) {
        console.log("CLEAR DURATION", activeAction.duration + 2000);
        setActiveAction(null);
      }
    }, activeAction.duration + 2000);

    return () => clearTimeout(timer);
  }, [activeAction]);

  // Derive a stable key from either the card ID or the hero power metadata/timestamp
  const elementKey = activeAction
    ? activeAction.type === "cardPlayed"
      ? activeAction.card.id
      : `${activeAction.heroPower || "hero"}-${activeAction.startTime}`
    : undefined;

  return (
    // Vital positioning container untouched
    <div
      className={twMerge(
        "absolute top-[35vh] left-[21vw] scale-175 pointer-events-none z-50",
        activeAction?.type === "heroPower" && "scale-120 top-[32vh]",
      )}
      key={elementKey}
    >
      {activeAction &&
        (activeAction.type === "cardPlayed" ? (
          <CardComponent card={activeAction.card} ctx={ctx} />
        ) : (
          <HeroPowerExpanded heroPower={activeAction.heroPower} />
        ))}
    </div>
  );
};

export default CardPlayed;
