import type { CardProps } from "./types";
import { AnimatePresence, motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import {
  ATTACK_ANIMATION,
  TRIGGER_ANIMATION,
} from "@/utils/animationDurations";
import { useAudioStore } from "@/stores/audioStore";
import { useEffect, useMemo } from "react";
import FrozenOverlay from "./Overlays/FrozenOverlay";
import DivineShieldOverlay from "./Overlays/DivineShieldOverlay";
import ImmuneOverlay from "./Overlays/ImmuneOverlay";
import SpellDamageOverlay from "./Overlays/SpellDamageOverlay";
import WindfuryOverlay from "./Overlays/WindfuryOverlay";
import StealthOverlay from "./Overlays/StealthOverlay";
import {
  getAttack,
  getCurrentHealth,
  getMaxHealth,
  getSpellDamageSource,
  hasKeyword,
  providesActiveAura,
} from "@project/shared";
import { useAnimationStore } from "@/stores/animationStore";
import type { TriggerAnimation } from "@/types/animations";

const attackIcon = "assets/attack.png";
const healthIcon = "assets/health.png";
const skullIcon = "assets/icons/skull.png";
const poisonIcon = "assets/icons/poison.png";
const triggerIcon = "assets/icons/Trigger.webp";

const minionFrame = "assets/minion_frame.png";
const minionTaunt = "assets/minion_taunt.png";

interface Props extends CardProps {
  isAttacking?: boolean;
  targetPosition?: { x: number; y: number };
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

const PlacedCard = ({
  card,
  isDragging = false,
  playerID,
  ctx,
  isAttacking = false,
  targetPosition = { x: 0, y: 0 },
  cardRef,
  ...props
}: Props) => {
  const activeAnimations = useAnimationStore((s) => s.activeAnimations);

  // Trigger firings currently aimed at THIS minion. The store hands every
  // running animation a unique `uid` and drops it again once its duration is
  // up, so this is the whole source of truth — no manual bookkeeping needed,
  // and nothing can fire twice for one event.
  //
  // Memoised against the store's array identity (which only changes when an
  // animation starts or ends) so unrelated re-renders don't churn it.
  const triggerAnimations = useMemo(
    () =>
      activeAnimations.filter(
        (anim): anim is TriggerAnimation & { uid: string } =>
          anim.type === "trigger" && anim.minionID === card.id && !!anim.uid,
      ),
    [activeAnimations, card.id],
  );

  const isTriggering = triggerAnimations.length > 0;
  // Keying the icon on the newest firing restarts the pulse cleanly when a
  // minion triggers again while the previous pulse is still playing — two
  // firings can never animate on top of each other.
  const triggerKey = isTriggering
    ? triggerAnimations[triggerAnimations.length - 1].uid
    : "idle";

  // NOTE: the "trigger" cue is played by the animation store from the
  // animation's own `sfx` (see detectAllAnimations), which is also where
  // duplicate firings in one batch are collapsed to a single sound.

  const playSfx = useAudioStore((state) => state.playSfx);
  const isSicknessActive =
    card.summoningSickness &&
    !hasKeyword(card, "charge") &&
    !hasKeyword(card, "rush");

  useEffect(() => {
    if (isAttacking) {
      setTimeout(() => {
        playSfx("minion-attack");
        card.sfx?.attack &&
          card.sfx.attack.forEach((sfx) => playSfx(sfx.soundId, sfx.volume));
      }, 200);
    }
  }, [isAttacking]);

  return (
    <motion.div
      ref={cardRef}
      data-card-id={card.id}
      layout={!isAttacking}
      layoutId={`card-${card.id}-minon`}
      transition={isDragging ? { duration: 0 } : undefined}
      animate={
        isAttacking
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
              scale: [1, 1.08, 1.18, 1.15, 1],
              rotate: [0, -3, 6, 4, 0],
              zIndex: 999,

              transition: {
                duration: ATTACK_ANIMATION.duration / 1000,
                times: [0, 0.18, 0.58, 0.68, 1],
              },
            }
          : props.animate
            ? props.animate
            : {
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
                zIndex: 10,
              }
      }
      className={twMerge(
        // 1. Turned the card chassis into a distinctive Hearthstone Minion Oval
        "w-[6.15vw] h-[8.32vw] relative rounded-[50%/50%] flex flex-col items-center justify-center font-serif text-white",
      )}
    >
      <AnimatePresence>
        {/* Ongoing-effect indicator: a pool of light welling from beneath */}
        {providesActiveAura(card) && (
          <motion.div
            key="auraGlow"
            className="absolute   w-[125%] h-[110%] rounded-[50%] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,225,120,0.85) 0%, rgba(255,200,60,0.35) 45%, rgba(255,200,60,1) 150%)",
              filter: "blur(2px)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.45, 0.95, 0.45],
              scaleX: [0.9, 1.1, 0.9],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {!!card.enrage?.length &&
          getCurrentHealth(card) < getMaxHealth(card) && (
            <motion.div
              key="enrage"
              className="absolute   rounded-[50%/50%] inset-0 pointer-events-none mix-blend-multiply opacity-100  z-[10]
              h-[87%] w-[82%] left-[10%] top-[2%]
              "
              style={{
                boxShadow: "inset 0px 0px 1vw 0.5vw rgba(255, 0, 0, 1)",
              }}
            />
          )}
        {hasKeyword(card, "divineShield") && (
          <DivineShieldOverlay key={"divineShield"} />
        )}
        {hasKeyword(card, "frozen") && <FrozenOverlay key={"frozen"} />}
        {hasKeyword(card, "immune") && (
          <ImmuneOverlay isMinion key={"immune"} />
        )}
        {hasKeyword(card, "windfury") && <WindfuryOverlay key={"windfury"} />}
        {hasKeyword(card, "stealth") && (
          <>
            <motion.div
              key="enrage"
              className="absolute   rounded-[50%/50%] inset-0 pointer-events-none mix-blend-multiply opacity-100  z-[10]
              h-[87%] w-[82%] left-[10%] top-[2%]
              "
              style={{
                boxShadow: "inset 0px 0px 3vw 0.5vw rgba(0, 0, 0, 0)",
              }}
            />
            <StealthOverlay key={"stealth"} />
          </>
        )}

        {getSpellDamageSource(card) > 0 && (
          <SpellDamageOverlay key={"spellDamage"} />
        )}
      </AnimatePresence>

      {/* Card Art - Clipped tightly inside the oval frame */}
      <div className={twMerge("w-full h-full")}>
        <div
          className={twMerge(
            "absolute top-[0.2vw]! left-[0.4vw]! h-[90%] w-[90%] inset-[0.1vw] overflow-hidden rounded-[50%/50%]",
            hasKeyword(card, "taunt") && "top-[0.8vw] left-[0.4vw]! w-[87%]",
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
            src={hasKeyword(card, "taunt") ? minionTaunt : minionFrame}
            alt={card.title}
            className="object-cover w-full h-full select-none scale-105"
            draggable="false"
          />
        </div>
      </div>

      {/* Summoning Sickness Indicator (Zzz) */}
      {isSicknessActive && (
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
      {(card.baseAttack !== undefined || card.baseHealth !== undefined) && (
        <>
          {card.baseAttack !== undefined && (
            <div className="absolute select-none text-[1.1vw] left-[0.5vw] bottom-[0.6vw]  rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold shadow-lg z-10">
              <img
                src={attackIcon}
                alt="Attack"
                className="object-cover w-full h-full absolute scale-130 -left-1 bottom-1"
                // no drag
                draggable="false"
              />
              <span
                className={twMerge(
                  "absolute font-belwe   scale-130  translate-y-[-5%] translate-x-[-5%] text-shadow-A",
                  getAttack(card) > card.baseAttack ? "text-green-400 " : " ",
                )}
              >
                {getAttack(card)}
              </span>
            </div>
          )}
          {card.baseHealth !== undefined && (
            <div className="absolute select-none text-[1.1vw] right-[0.3vw] bottom-[0.5vw]  rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold  shadow-lg z-10">
              <img
                src={healthIcon}
                alt="Health Icon"
                className=" object-contain w-full h-full absolute scale-130  bottom-[0.25vw]"
                // no drag
                draggable="false"
              />
              <span
                className={twMerge(
                  "absolute font-belwe  scale-140 translate-y-[-5%] translate-x-[4%] text-shadow-A",
                  getCurrentHealth(card) == card.baseHealth &&
                    getMaxHealth(card) == card.baseHealth
                    ? ""
                    : getCurrentHealth(card) < getMaxHealth(card)
                      ? "text-red-500"
                      : "text-green-400",
                )}
              >
                {getCurrentHealth(card)}
              </span>
            </div>
          )}
        </>
      )}
      {!!card.deathrattle?.length && (
        <img
          src={skullIcon}
          alt="Deathrattle"
          className=" object-contain h-[2.7vw] absolute  bottom-[-0.7vw]"
          // no drag
          draggable="false"
        />
      )}
      {hasKeyword(card, "poisonous") && (
        <img
          src={poisonIcon}
          alt="DeathRattle"
          className=" object-contain h-[2vw] absolute  bottom-[-0.2vw]"
          // no drag
          draggable="false"
        />
      )}
      {!!card.triggers?.length && (
        <motion.img
          // A new firing swaps the key, remounting the icon so its pulse
          // restarts from the top instead of layering over the previous one.
          key={triggerKey}
          src={triggerIcon}
          alt="Trigger"
          className=" object-contain h-[1.8vw] absolute bottom-[-0.3vw] z-20 pointer-events-none"
          // no drag
          draggable="false"
          initial={false}
          animate={
            isTriggering
              ? {
                  // Swells and flares gold, then settles back to its resting size.
                  scale: [1, 1.2, 1.1, 1],
                  filter: [
                    "drop-shadow(0 0 0vw rgba(255,225,120,0))",
                    "drop-shadow(0 0 0.6vw rgba(255,225,120,1))",
                    "drop-shadow(0 0 0.35vw rgba(255,225,120,0.85))",
                    "drop-shadow(0 0 0vw rgba(255,225,120,0))",
                  ],
                }
              : {
                  scale: 1,
                  filter: "drop-shadow(0 0 0vw rgba(255,225,120,0))",
                }
          }
          transition={
            isTriggering
              ? {
                  duration: TRIGGER_ANIMATION.duration / 1000,
                  times: [0, 0.25, 0.55, 1],
                  ease: "easeOut",
                }
              : { duration: 0.2 }
          }
        />
      )}
      {getSpellDamageSource(card) > 0 && (
        <SpellDamageOverlay key={"spellDamage"} />
      )}
    </motion.div>
  );
};

export default PlacedCard;
