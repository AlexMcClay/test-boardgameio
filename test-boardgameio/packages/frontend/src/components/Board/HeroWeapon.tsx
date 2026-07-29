import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { twMerge } from "tailwind-merge";
import {
  getAttack,
  getCurrentDurability,
  getMaxDurability,
  type Card,
  type Ctx,
  type PlayerID,
} from "@project/shared";
import MinionCardPopover from "../MinionCardPopover";
import { useAudioStore } from "@/stores/audioStore";
import { DEATH_ANIMATION } from "@/utils/animationDurations";

const weapon_frame = "assets/weapon_frame.png";

interface Props {
  weapon: Card;
  /** The seat that owns this weapon — whose turn sheathes and unsheathes it. */
  ownerId: PlayerID;
  ctx: Ctx;
  isTop?: boolean;
}

/**
 * The equipped weapon beside a hero.
 *
 * Mounted per weapon instance (PlayerArea keys on `weapon.id`), so swapping
 * weapons remounts and replays the draw. That keying is what makes the "first
 * render" cues below correct rather than merely usually-right.
 */
function HeroWeapon({ weapon, ownerId, ctx, isTop }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const playSfx = useAudioStore((state) => state.playSfx);

  // Sheathed on the opponent's turn — Hearthstone puts the weapon away and
  // dims it, which is also the clearest read of "you can't swing right now".
  const isOwnersTurn = ctx.currentPlayer === ownerId;
  const isSheathed = !isOwnersTurn;

  // The weapon is drawn as it arrives.
  useEffect(() => {
    playSfx("weapon-draw");
    isFirstRender.current = false;
  }, []);

  // Sheathe / unsheathe on the turn boundary. Skips the mount pass: equipping
  // a weapon should sound like drawing it, not like drawing and unsheathing it.
  const wasOwnersTurn = useRef(isOwnersTurn);
  useEffect(() => {
    if (wasOwnersTurn.current === isOwnersTurn) return;
    wasOwnersTurn.current = isOwnersTurn;
    playSfx(isOwnersTurn ? "weapon-unsheathe" : "weapon-sheathe");
  }, [isOwnersTurn, playSfx]);

  // Durability chipping. Losses only — a repair (Deadly Poison, a durability
  // buff) is not a hit. The killing charge is skipped too: that one is the
  // weapon breaking, and the destroyWeapon animation plays the shatter.
  const durability = getCurrentDurability(weapon);
  const prevDurability = useRef(durability);
  useEffect(() => {
    const lost = durability < prevDurability.current;
    prevDurability.current = durability;
    if (lost && durability > 0) playSfx("weapon-durability-hit");
  }, [durability, playSfx]);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cardWidth = rect.width;
      const cardScaled = cardWidth * 1.5;
      const spacing = 20;

      const showOnRight = rect.right + cardScaled + spacing < window.innerWidth;

      const x = showOnRight
        ? rect.right + spacing
        : rect.left - cardScaled - spacing;

      const y = rect.top + rect.height / 2 - (rect.height * 1.5) / 2;

      setPopoverPosition({ x, y });
      setShowPopover(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowPopover(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <motion.div
        key={"weapon"}
        initial={
          isFirstRender.current
            ? {
                opacity: 0.9,
                scale: 1.2,
                y: -90,
                rotateX: 35,
                rotate: -5,
              }
            : undefined
        }
        animate={
          isFirstRender.current
            ? {
                opacity: 1,
                scale: [1.3, 0.95, 1.03, 1],
                y: [-90, 0, -8, 0],
                rotateX: [35, 0, 0, 0],
                rotate: [-5, 3, -2, 1, -0.5, 0],
                x: [0, 6, -5, 3, -1.5, 0],
              }
            : { opacity: 1, scale: 1, y: 0, rotateX: 0, rotate: 0, x: 0 }
        }
        exit={{
          opacity: [1, 1, 0],
          rotate: [0, -5, 5, -5, 5, 20],
          x: [0, -12, 12, -12, 12, -8, 8, -4, 4, 0],
          transition: {
            duration: DEATH_ANIMATION.duration / 1000,
            ease: "easeInOut",
          },
        }}
        ref={wrapperRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={twMerge(
          "absolute z-10 top-[-25%] left-[37vw] flex items-center pointer-events-auto justify-center minion-card ",
          isTop && "top-[60%] left-[37vw]",
        )}
      >
        <img
          src={weapon_frame}
          alt="Weapon"
          className="w-[8vw] h-[8vw] object-contain"
          draggable="false"
        />
        {/* Only the art dims — the frame, attack and durability stay readable
            so the weapon can still be assessed on the opponent's turn. */}
        <motion.img
          src={weapon.imageUrl}
          alt={weapon.title}
          className="w-[5.5vw] h-[5.5vw] rounded-full absolute z-[-1]"
          draggable="false"
          animate={{ filter: `brightness(${isSheathed ? 0.15 : 1})` }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        />
        <p className="absolute bottom-[1.5vw] left-[1.5vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A">
          {getAttack(weapon)}
        </p>

        <p
          className={twMerge(
            "absolute bottom-[1.5vw] right-[1.2vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A",
            durability == weapon.baseDurability &&
              getMaxDurability(weapon) == weapon.baseDurability
              ? ""
              : durability < getMaxDurability(weapon)
                ? "text-red-500"
                : "text-green-400",
          )}
        >
          {durability}
        </p>
      </motion.div>

      <AnimatePresence>
        {showPopover && (
          <MinionCardPopover
            key={"weapon-card-overlay"}
            card={{ ...weapon }}
            position={popoverPosition}
            type="popover"
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default HeroWeapon;
