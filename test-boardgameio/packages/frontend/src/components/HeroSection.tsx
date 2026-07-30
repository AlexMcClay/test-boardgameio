import { useDragStore } from "@/stores/dragStore";
import { useAnimationStore } from "@/stores/animationStore";
import { useDroppable } from "@dnd-kit/core";
import { getPlayerAttack, hasKeyword, type Player } from "@project/shared";
import type { GameBoardProps } from "@/types/gameProps";
import { centerOf, lungeDelta } from "@/utils/targeting";
import { heroAttackCard } from "@/game/pseudoCards";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ATTACK_ANIMATION } from "@/utils/animationDurations";
import DivineShieldHeroOverlay from "./Card/Overlays/DivineShieldHeroOverlay";
import FrozenHeroOverlay from "./Card/Overlays/FrozenHeroOverlay";
import ImmuneOverlay from "./Card/Overlays/ImmuneOverlay";
import WindfuryOverlay from "./Card/Overlays/WindfuryOverlay";
import { useAudioStore } from "@/stores/audioStore";
import { useNoticeStore } from "@/stores/noticeStore";
import { playHeroLine } from "@/utils/heroVoice";
import HeroPortrait from "./HeroPortrait";

interface Props extends GameBoardProps {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
}

const healthIcon = "assets/health.png";
const armorIcon = "assets/icons/Armor.webp";
const attackIcon = "assets/attack.png";

const HeroSection = ({ player, ...props }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startTargeting = useDragStore((s) => s.startTargeting);
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);
  const playSfx = useAudioStore((state) => state.playSfx);

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
    !hasKeyword(player, "frozen") &&
    getPlayerAttack(player) > 0;

  function handleHeroAttackMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    if (!isOwnHero || !isMyTurn) return;

    // Same three rules validateHeroAttack applies, checked here so the reason
    // reaches the player (and their hero says it) on the click that starts the
    // attack, rather than only once they've dragged out an arrow and released.
    // Order matches the validator's.
    if (hasKeyword(player, "frozen")) {
      useNoticeStore.getState().showMoveError("frozen");
      return;
    }
    if (player.attacksLeft <= 0) {
      useNoticeStore.getState().showMoveError("hero-already-attacked");
      return;
    }
    if (getPlayerAttack(player) <= 0) {
      useNoticeStore.getState().showMoveError("needs-weapon");
      return;
    }

    const origin = centerOf(wrapperRef.current);
    if (!origin) return;

    startTargeting(
      "hero-attack",
      `hero-${player.id}`,
      origin,
      heroAttackCard(player),
    );
  }

  // Attack lunge animation, mirrors PlacedCard.tsx's minion attack keyframes
  const attackAnimation = activeAnimations.find(
    (anim) => anim.type === "attack" && anim.attackerId === `hero-${player.id}`,
  );
  const isAttackAnimating = !!attackAnimation;

  // The swing lands ~200ms into the lunge, so both the weapon hit and the
  // hero's own line ("For justice!", "Lok'tar ogar!") are held back to match it.
  // Keyed to `player.id` rather than the local seat: only the attacking hero's
  // instance of this component sees isAttackAnimating, and you should hear the
  // opponent's hero on their turn.
  useEffect(() => {
    if (!isAttackAnimating) return;
    playHeroLine("attack", player.id);

    const timer = setTimeout(() => {
      playSfx("minion-attack");
    }, 300);
    return () => clearTimeout(timer);
  }, [isAttackAnimating, player.id, playSfx]);

  const targetPosition =
    isAttackAnimating && attackAnimation?.type === "attack"
      ? lungeDelta(
          wrapperRef.current,
          attackAnimation.targetId,
          attackAnimation.targetType,
        )
      : { x: 0, y: 0 };

  const heroPortrait = player.heroPortrait || "src/assets/default-hero.jpg";

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

      <HeroPortrait src={heroPortrait} alt={`${player.name} portrait`} />
      <AnimatePresence>
        {hasKeyword(player, "frozen") && <FrozenHeroOverlay />}
        {hasKeyword(player, "divineShield") && <DivineShieldHeroOverlay />}
        {hasKeyword(player, "immune") && <ImmuneOverlay key={"immune"} />}
        {!!player.weapon && hasKeyword(player.weapon, "windfury") && (
          <WindfuryOverlay key={"windfury"} variant="hero" />
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {getPlayerAttack(player) && props.ctx.currentPlayer === player.id ? (
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
              scale: [1.2, 0.5, 0],
              opacity: 0.5,
            }}
            className="absolute bottom-[-10%] left-[-20%] z-20 w-[40%] aspect-square flex items-center justify-center pointer-events-none"
          >
            <img
              src={attackIcon}
              alt="Attack"
              className="w-full h-full  scale-120 object-contain inset-0 pointer-events-none"
              draggable="false"
            />

            <span className="z-10 text-[1.4vw] left-[1.25vw] absolute font-extrabold text-center leading-none font-belwe scale-140 pointer-events-none text-shadow-A top-[30%]">
              {getPlayerAttack(player)}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
