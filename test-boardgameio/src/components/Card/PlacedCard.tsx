import type { CardProps } from "./types";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import { useAnimationStore } from "@/stores/animationStore";
import { useRef } from "react";
import { ATTACK_ANIMATION } from "@/utils/animationDurations";

const attackIcon = "assets/attack.png";
const healthIcon = "assets/health.png";
const minionFrame = "assets/minion_frame.png";
const minionTaunt = "assets/minion_taunt.png";

interface Props extends CardProps {}

const PlacedCard = ({ card, isDragging = false, playerID, ctx }: Props) => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if this card is attacking (find attack animation for this card)
  const attackAnimation = activeAnimations.find(
    (anim) => anim.type === "attack" && anim.attackerId === card.id,
  );
  const isAttacking = !!attackAnimation;

  // Calculate target position immediately when needed
  const getTargetPosition = () => {
    if (!isAttacking || !attackAnimation || attackAnimation.type !== "attack") {
      return { x: 0, y: 0 };
    }

    const targetId = attackAnimation.targetId;
    const targetType = attackAnimation.targetType;

    // Get attacker position
    const attackerElement = cardRef.current;
    if (!attackerElement) return { x: 0, y: 0 };

    const attackerRect = attackerElement.getBoundingClientRect();
    const attackerCenterX = attackerRect.left + attackerRect.width / 2;
    const attackerCenterY = attackerRect.top + attackerRect.height / 2;

    // Get target position
    let targetElement: HTMLElement | null = null;

    if (targetType === "card") {
      // Find target card by ID
      targetElement = document.querySelector(`[data-card-id="${targetId}"]`);
    } else if (targetType === "player") {
      // Find player hero by ID
      targetElement = document.querySelector(`[data-player-id="${targetId}"]`);
    }

    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      // Calculate relative position
      const deltaX = targetCenterX - attackerCenterX;
      const deltaY = targetCenterY - attackerCenterY;

      return { x: deltaX, y: deltaY };
    }

    return { x: 0, y: 0 };
  };

  const targetPosition = getTargetPosition();

  return (
    <motion.div
      ref={cardRef}
      data-card-id={card.id}
      layout={!isAttacking}
      layoutId={`card-${card.id}`}
      transition={isDragging ? { duration: 0 } : undefined}
      animate={
        isAttacking
          ? {
              x: [0, targetPosition.x, 0],
              y: [0, targetPosition.y, 0],
              scale: [1, 1.15, 1],
              transition: {
                duration: ATTACK_ANIMATION.duration / 1000,
                times: [0, 0.5, 1],
                ease: "easeInOut",
              },
            }
          : {
              x: 0,
              y: 0,
              scale: 1,
            }
      }
      className={twMerge(
        // 1. Turned the card chassis into a distinctive Hearthstone Minion Oval
        "w-[130px] h-[175px] relative rounded-[50%/50%] flex flex-col items-center justify-center font-serif text-white",
      )}
    >
      {/* Card Art - Clipped tightly inside the oval frame */}
      <div
        className={twMerge(
          "w-full h-full",
          !card.hasAttacked && ctx.currentPlayer === playerID && "canAttack",
        )}
      >
        <div
          className={twMerge(
            "absolute top-1 left-2! h-[90%] w-[90%] inset-[2px] overflow-hidden rounded-[50%/50%]",
            card.taunt && "top-4 left-2! w-[87%]",
          )}
        >
          <img
            src={card.imageUrl}
            alt={card.title}
            className="object-cover w-full h-full select-none scale-105"
            draggable="false"
          />
        </div>
        <div className={twMerge("absolute inset-[2px] rounded-[50%/50%] z-0")}>
          <img
            src={card.taunt ? minionTaunt : minionFrame}
            alt={card.title}
            className="object-cover w-full h-full select-none scale-105"
            draggable="false"
          />
        </div>
      </div>

      {/* Summoning Sickness Indicator (Zzz) */}
      {card.summoningSickness && (
        <motion.div
          className="absolute inset-0 pointer-events-none "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Relative wrapper centered on the card to host the floating letters */}
          <div className="absolute top-12 right-12 ">
            {["Z", "Z", "Z"].map((letter, index) => (
              <motion.span
                key={index}
                className="absolute font-bold select-none"
                style={{
                  color: "#4ade80",
                  // Dynamically increase font size for each consecutive Z
                  textShadow:
                    "0 0 10px rgba(74, 222, 128, 0.8), 0 2px 8px rgba(0,0,0,0.8)",
                }}
                initial={{
                  opacity: 0,
                  scale: 0.6,
                  y: 0,
                  x: 0,
                }}
                animate={{
                  // Fades in, stays visible, then vanishes at the top
                  opacity: [0, 1, 1, 0],
                  scale: [0.6, 1, 1.1, 1.2],
                  // Floats upward
                  y: [0, -30, -60, -90],
                  // Gently drifts right and slightly left for a organic floating wave
                  x: [0, 20, 40, 60],
                }}
                transition={{
                  duration: 3,
                  ease: "linear",
                  repeat: Infinity,
                  repeatType: "loop",
                  // Staggers the letters 1 second apart
                  delay: index * 1,
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
      {/* Attack & Health */}
      {(card.attack !== undefined || card.health !== undefined) && (
        <>
          {card.attack !== undefined && (
            <div className="absolute select-none left-[0.75rem] -bottom-[-1rem]  rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg">
              <img
                src={attackIcon}
                alt="Card Back"
                className="object-cover w-full h-full absolute scale-130 -left-1 bottom-1"
                // no drag
                draggable="false"
              />
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
                className="absolute"
              >
                {card.attack}
              </span>
            </div>
          )}
          {card.health !== undefined && (
            <div className="absolute select-none right-[0.5rem] -bottom-[-1rem] rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold  shadow-lg">
              <img
                src={healthIcon}
                alt="Card Back"
                className=" object-contain w-full h-full absolute scale-130  bottom-1"
                // no drag
                draggable="false"
              />
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
                className="absolute"
              >
                {card.health}
              </span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default PlacedCard;
