import type { CardProps } from "./types";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "boardgame.io";
import { useDragStore } from "@/stores/dragStore";
import { useAnimationStore } from "@/stores/animationStore";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";
import { useRef, useEffect } from "react";
import { DEATH_ANIMATION } from "@/utils/animationDurations";
import PlacedCard from "./PlacedCard";
import { useAudioStore } from "@/stores/audioStore";

interface Props extends CardProps {
  playerID: PlayerID;
  ctx: Ctx;
  isValid: boolean;
}

// MinionCard component with attack arrow behavior and attack animations
const MinionCard = ({ card, playerID, ctx, isValid }: Props) => {
  const placedCardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startAttack = useDragStore((s) => s.startAttack);
  const updateAttackCursor = useDragStore((s) => s.updateAttackCursor);
  const endAttack = useDragStore((s) => s.endAttack);
  const attackingCardId = useDragStore((s) => s.attackingCardId);
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const gameState = useDragStore((s) => s.gameState);

  const isAttackingWithArrow = attackingCardId === card.id;
  const disabled =
    (card.hasAttacked || card.summoningSickness || card.frozen) &&
    !gameState?.activeBattlecryMinion; // Can't attack if already attacked (unless battlecry)
  const isBattlecryMinion =
    gameState?.activeBattlecryMinion?.cardId === card.id;
  const prevIsBattlecryRef = useRef(isBattlecryMinion);

  // Check if this card is performing an attack animation
  const attackAnimation = activeAnimations.find(
    (anim) => anim.type === "attack" && anim.attackerId === card.id,
  );
  const isAttackAnimating = !!attackAnimation;

  // Calculate target position for attack animation
  const getTargetPosition = () => {
    if (
      !isAttackAnimating ||
      !attackAnimation ||
      attackAnimation.type !== "attack"
    ) {
      return { x: 0, y: 0 };
    }

    const targetId = attackAnimation.targetId;
    const targetType = attackAnimation.targetType;

    // Get attacker position
    const attackerElement = placedCardRef.current;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled && !isBattlecryMinion) return;

    // Get card center position
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    startAttack(card.id, origin, card);
  };

  // Auto-trigger attack mode for battlecry minions
  useEffect(() => {
    if (
      isBattlecryMinion &&
      !isAttackingWithArrow &&
      playerID === ctx.currentPlayer
    ) {
      // console.debug("Auto-triggering battlecry attack for:", card.id);
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      startAttack(card.id, origin, card);
    }
  }, [
    isBattlecryMinion,
    isAttackingWithArrow,
    card.id,
    playerID,
    ctx.currentPlayer,
    startAttack,
    card,
  ]);

  // Clear attack arrow when battlecry is resolved or cancelled
  useEffect(() => {
    // If this card was the battlecry minion and now it's not, clear the attack
    const wasBattlecry = prevIsBattlecryRef.current;
    prevIsBattlecryRef.current = isBattlecryMinion;
    if (
      isAttackingWithArrow &&
      wasBattlecry &&
      !isBattlecryMinion &&
      attackingCardId === card.id
    ) {
      // console.debug("Battlecry resolved, clearing attack arrow for:", card.id);
      endAttack();
    }
  }, [
    isBattlecryMinion,
    isAttackingWithArrow,
    attackingCardId,
    card.id,
    endAttack,
  ]);

  useEffect(() => {
    if (!isAttackingWithArrow) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateAttackCursor({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Use document.elementFromPoint to find target
      const element = document.elementFromPoint(e.clientX, e.clientY);

      if (element) {
        const targetCardId = element
          .closest("[data-card-id]")
          ?.getAttribute("data-card-id");
        const targetPlayerId = element
          .closest("[data-player-id]")
          ?.getAttribute("data-player-id");

        // Emit custom event with target info for GameBoard to handle
        if (targetCardId || targetPlayerId) {
          const event = new CustomEvent("attack-target", {
            detail: {
              attackerId: card.id,
              targetCardId,
              targetPlayerId,
            },
          });
          window.dispatchEvent(event);
        }
      }

      endAttack();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isAttackingWithArrow, card.id, updateAttackCursor, endAttack]);

  return (
    <motion.div
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
      animate={
        isAttackingWithArrow
          ? {
              y: 0,
              scale: 1.15,
              transition: { duration: 0.15, ease: "easeOut" },
              // filter: "drop-shadow(0px 0px 10px rgba(239, 68, 68, 0.7))",
            }
          : { y: 0, scale: 1 }
      }
      className={twMerge(
        !disabled &&
          ctx.currentPlayer === playerID &&
          !isAttackingWithArrow &&
          !isValid &&
          "canAttack cursor-pointer",
      )}
    >
      <PlacedCard
        card={{ ...card, mana: null }}
        playerID={playerID}
        ctx={ctx}
        isAttacking={isAttackAnimating}
        targetPosition={targetPosition}
        cardRef={placedCardRef}
      />
    </motion.div>
  );
};

const DropDetectCard = (props: Omit<Props, "isValid">) => {
  const isFirstRender = useRef(true);
  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget("card", props.playerID, props.card.id);
  const playSfx = useAudioStore((state) => state.playSfx);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("minion-drop-med");
      return;
    }
  }, []);

  const { setNodeRef, isOver } = useDroppable({
    id: props.card.id,
    data: {
      type: "card",
      player: props.playerID, // Include playerID to match the Lane component
      id: props.card.id,
    },
  });

  return (
    <motion.div
      key={props.card.id}
      ref={setNodeRef}
      layoutId={`drop-${props.card.id}`}
      className={twMerge("minion-shadow")}
      initial={
        isFirstRender.current
          ? {
              opacity: 0.9,
              scale: 1.2, // Start slightly larger from the hand layer
              y: -90, // Started higher up to clear the board beautifully
              rotateX: 35, // Tilted back in hand perspective
              rotate: -5, // Slight natural hand tilt before dropping
            }
          : undefined
      }
      animate={
        isFirstRender.current
          ? {
              opacity: 1,
              // 1. Scale snaps down on impact, pushes slightly past 1 (squish), then stabilizes
              scale: [1.3, 0.95, 1.03, 1],

              // 2. Heavy drop to 0px, then a tiny vertical rebound bounce
              y: [-90, 0, -8, 0],

              // 3. Flattens out of 3D tilt instantly on board landing
              rotateX: [35, 0, 0, 0],

              // 4. The Landing Rattle: Rotates slightly back and forth decaying to 0
              rotate: [-5, 3, -2, 1, -0.5, 0],

              // 5. The Ground Vibrations: Subtle micro-shakes left & right post-impact
              x: [0, 6, -5, 3, -1.5, 0],
            }
          : { opacity: 1, scale: 1, y: 0, rotateX: 0, rotate: 0, x: 0 }
      }
      // 3. Heavy Spring Config for the "Slam and Bounce" feel

      exit={{
        opacity: [1, 1, 0], // Stays fully visible during the shake, then vanishes quickly
        rotate: [0, -5, 5, -5, 5, 20], // Shakes back and forth rapidly before spinning away
        // The Rapid Shake: Rapidly oscillates left and right
        x: [0, -12, 12, -12, 12, -8, 8, -4, 4, 0],
        transition: {
          duration: DEATH_ANIMATION.duration / 1000, // Total duration of the animation
          ease: "easeInOut",
        },
      }}
    >
      <div
        className={twMerge(
          isValid && !isOver && "highlight-shadow ",
          isOver && "ring-2 ring-amber-300",
        )}
      >
        <MinionCard {...props} isValid={isValid} />
      </div>
    </motion.div>
  );
};

export default DropDetectCard;
