import { useDragStore } from "@/stores/dragStore";
import { useAnimationStore } from "@/stores/animationStore";
import { useDroppable } from "@dnd-kit/core";
import {
  getPlayerAttack,
  type Card,
  type GameState,
  type Player,
} from "@project/shared";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ATTACK_ANIMATION } from "@/utils/animationDurations";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
}

const healthIcon = "assets/health.png";
const armorIcon = "assets/icons/Armor.webp";
const attackIcon = "assets/attack.png";

const HeroSection = ({ player, ...props }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startTargeting = useDragStore((s) => s.startTargeting);
  const endTargeting = useDragStore((s) => s.endTargeting);
  const targetingMode = useDragStore((s) => s.targetingMode);
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);

  const { setNodeRef, isOver } = useDroppable({
    id: `player-${player.id}`,
    data: {
      type: "player",
      player: player.id, // Include playerID to match the Lane component
      id: player.id,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget(
    {
      type: "player",
      player: player.id, // Include playerID to match the Lane component
      id: player.id,
    },
    {
      G: props.G,
      ctx: props.ctx,
      playerID: props.ctx.currentPlayer,
      location: "board",
    },
  );

  // Ownership: both top and bottom HeroSection instances receive the local
  // viewer's playerID via props, so ownership must be derived by comparing
  // player.id to props.playerID rather than trusting isTop alone.
  const isOwnHero = player.id === props.playerID;
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const canAttack =
    isOwnHero &&
    isMyTurn &&
    player.attacksLeft > 0 &&
    !player.frozen &&
    getPlayerAttack(player) > 0;

  function handleHeroAttackMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    if (!isOwnHero || !isMyTurn) return;

    if (player.attacksLeft <= 0) {
      console.warn("Hero has already attacked this turn");
      return;
    }
    if (player.frozen) {
      console.warn("Hero is frozen");
      return;
    }
    if (getPlayerAttack(player) <= 0) {
      console.warn("Hero has no attack (equip a weapon first)");
      return;
    }

    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    // Pseudo-card so canTargetHighlight (which hard-requires a non-null Card)
    // works, mirroring HeroPower.tsx's heroPowerCard.
    const heroAttackCard: Card = {
      id: `hero-${player.id}`,
      originalID: `hero-${player.id}`,
      title: player.name,
      description: "",
      effects: [],
      onPlace: [],
      targetQuery: { side: "enemy", type: ["card", "player"] },
      isMinion: false,
      damageTaken: 0,
      attacksLeft: player.attacksLeft,
      class: player.hero.class,
    };

    startTargeting("hero-attack", `hero-${player.id}`, origin, heroAttackCard);
  }

  useEffect(() => {
    if (targetingMode !== "hero-attack") return;

    const updateTargetingCursor = useDragStore.getState().updateTargetingCursor;

    const getTargetAtCoordinates = (clientX: number, clientY: number) => {
      const playerElements = document.querySelectorAll(
        '[data-player-bounds="true"]',
      );
      for (const el of playerElements) {
        const rect = el.getBoundingClientRect();
        const isInsideX = clientX >= rect.left && clientX <= rect.right;
        const isInsideY = clientY >= rect.top && clientY <= rect.bottom;
        if (isInsideX && isInsideY) {
          return el.getAttribute("data-player-id");
        }
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateTargetingCursor({ x: e.clientX, y: e.clientY });

      const targetPlayerId = getTargetAtCoordinates(e.clientX, e.clientY);
      let targetCardId: string | null = null;
      if (!targetPlayerId) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        targetCardId =
          element?.closest("[data-card-id]")?.getAttribute("data-card-id") ||
          null;
      }

      if (targetCardId || targetPlayerId) {
        useDragStore.setState({
          hoveredTarget: {
            type: targetCardId ? "card" : "player",
            id: targetCardId || targetPlayerId,
          },
        });
      } else {
        useDragStore.setState({ hoveredTarget: null });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const targetPlayerId = getTargetAtCoordinates(e.clientX, e.clientY);
      let targetCardId: string | null = null;
      if (!targetPlayerId) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        targetCardId =
          element?.closest("[data-card-id]")?.getAttribute("data-card-id") ||
          null;
      }

      if (targetCardId || targetPlayerId) {
        window.dispatchEvent(
          new CustomEvent("hero-attack-target", {
            detail: { targetCardId, targetPlayerId },
          }),
        );
      }

      useDragStore.setState({ hoveredTarget: null });
      endTargeting();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [targetingMode, endTargeting]);

  // Attack lunge animation, mirrors PlacedCard.tsx's minion attack keyframes
  const attackAnimation = activeAnimations.find(
    (anim) => anim.type === "attack" && anim.attackerId === `hero-${player.id}`,
  );
  const isAttackAnimating = !!attackAnimation;

  const getTargetPosition = () => {
    if (
      !isAttackAnimating ||
      !attackAnimation ||
      attackAnimation.type !== "attack"
    ) {
      return { x: 0, y: 0 };
    }

    const attackerElement = wrapperRef.current;
    if (!attackerElement) return { x: 0, y: 0 };

    const attackerRect = attackerElement.getBoundingClientRect();
    const attackerCenterX = attackerRect.left + attackerRect.width / 2;
    const attackerCenterY = attackerRect.top + attackerRect.height / 2;

    const targetElement =
      attackAnimation.targetType === "card"
        ? document.querySelector<HTMLElement>(
            `[data-card-id="${attackAnimation.targetId}"]`,
          )
        : document.querySelector<HTMLElement>(
            `[data-player-id="${attackAnimation.targetId}"]`,
          );

    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      return {
        x: targetCenterX - attackerCenterX,
        y: targetCenterY - attackerCenterY,
      };
    }
    return { x: 0, y: 0 };
  };

  const targetPosition = getTargetPosition();

  const heroPortrait = player.heroPortrait || "src/assets/default-hero.jpg";

  const archClipPath = `polygon(
    0% 100%, 
    0% 50%, 
    3% 40%, 
    6% 32%, 
    12% 24%, 
    22% 16%, 
    36% 8%, 
    50% 1%, 
    64% 8%, 
    78% 16%, 
    88% 24%,
    94% 32%,
    97% 40%, 
    100% 50%, 
    100% 100%
  )`;

  return (
    <motion.div
      ref={(node) => setNodeRef(node)}
      id="player-stats"
      data-player-id={player.id}
      data-player-bounds="true"
      className={twMerge(
        `flex items-center w-[7%] pointer-events-auto relative transition-[filter] duration-100    smallShadow`,
        "minion-card",
        isValid && !isOver && "valid-target-shadow ",
        isValid && isOver && "highlight-shadow",
        canAttack && "canAttack",
      )}
      style={{
        aspectRatio: "1 / 1.06",
      }}
      animate={
        isAttackAnimating
          ? {
              x: [
                0,
                -targetPosition.x * 0.08,
                targetPosition.x,
                targetPosition.x,
                0,
              ],
              y: [
                0,
                -targetPosition.y * 0.08,
                targetPosition.y,
                targetPosition.y,
                0,
              ],
              scale: [1, 1.08, 1.15, 1.12, 1],
              zIndex: 999,
              transition: {
                duration: ATTACK_ANIMATION.duration / 1000,
                times: [0, 0.18, 0.58, 0.68, 1],
              },
            }
          : { x: 0, y: 0, scale: 1 }
      }
    >
      <div
        ref={wrapperRef}
        className={twMerge(
          "absolute inset-0 z-40 bg-transparent",
          canAttack && "cursor-pointer",
        )}
        data-player-id={player.id} // Duplicated here so elementFromPoint catches it instantly
        onMouseDown={handleHeroAttackMouseDown}
      />

      {/* Visual Portrait Wrapper */}
      <div
        className="relative h-full w-full overflow-hidden pointer-events-none"
        style={{ clipPath: archClipPath }}
      >
        {/* The Hero Image (Added pointer-events-none) */}
        <img
          src={heroPortrait}
          alt={`${player.name} portrait`}
          className="h-full w-full object-cover opacity-100 pointer-events-none"
          draggable="false"
        />

        {/* Conforming Inset Shadow Overlay */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-100 border border-black"
          style={{
            boxShadow: "inset 0px 0px 20px 8px rgba(0, 0, 0, 1)",
            clipPath: archClipPath,
          }}
        />

        {/* Top Arc Inset Shadow Correction */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-transparent"
          style={{ clipPath: archClipPath }}
        />
      </div>
      {/* ARMOR SECTIOn */}
      {player.armor ? (
        <div className="absolute bottom-[20%] right-[-20%] z-30 w-[40%] aspect-square flex items-center justify-center pointer-events-none">
          <img
            src={armorIcon}
            alt="Armor"
            className="w-full h-full object-contain inset-0 pointer-events-none"
            draggable="false"
          />

          <span className="z-10 text-[1.5vw] absolute font-extrabold text-center leading-none font-belwe scale-140 pointer-events-none text-shadow-A top-[20%]">
            {player.armor}
          </span>
        </div>
      ) : null}

      {getPlayerAttack(player) ? (
        <div className="absolute bottom-[-10%] left-[-20%] z-20 w-[40%] aspect-square flex items-center justify-center pointer-events-none">
          <img
            src={attackIcon}
            alt="Attack"
            className="w-full h-full  scale-120 object-contain inset-0 pointer-events-none"
            draggable="false"
          />

          <span className="z-10 text-[1.4vw] left-[1.25vw] absolute font-extrabold text-center leading-none font-belwe scale-140 pointer-events-none text-shadow-A top-[30%]">
            {getPlayerAttack(player)}
          </span>
        </div>
      ) : null}

      {/* Health Icon (Pushed underneath the invisible hitbox layer using z-30) */}
      <div className="absolute bottom-[-10%] right-[-20%] z-20 w-[40%] aspect-square flex items-center justify-center pointer-events-none">
        <img
          src={healthIcon}
          alt="HP"
          className="w-full h-full object-contain inset-0 pointer-events-none"
          draggable="false"
        />

        <span className=" z-10 text-[1.5vw] absolute font-extrabold text-center leading-none font-belwe scale-140 pointer-events-none text-shadow-A">
          {player.health}
        </span>
      </div>
    </motion.div>
  );
};

export default HeroSection;
