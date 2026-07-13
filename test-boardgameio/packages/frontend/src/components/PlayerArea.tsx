import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import HeroSection from "./HeroSection";
import { twMerge } from "tailwind-merge";
import PlayerHand from "./PlayerHand";
import {
  getAttack,
  getCurrentDurability,
  getMaxDurability,
  type Card,
  type GameState,
  type Player,
} from "@project/shared";
import HeroPower from "./HeroPower/HeroPower";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, useEffect } from "react";
import MinionCardPopover from "./MinionCardPopover";
import { DEATH_ANIMATION } from "@/utils/animationDurations";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  actualG: GameState; // actual game state that is not the visual game state
}

const mana_crystal = "assets/mana.png";
const mana_bar = "assets/mana_bar.png";
const weapon_frame = "assets/weapon_frame.png";

const PlayerArea = ({
  player,
  isTop,
  G,
  ctx,
  events,
  moves,
  actualG,
  ...props
}: Props) => {
  return (
    <div
      className={` h-full w-screen flex justify-between items-${isTop ? "end" : "start"} `}
    >
      {/* HERO STATS */}
      <div
        className={twMerge(
          "absolute z-0 self-center justify-center w-full flex items-center pointer-events-none",
          !isTop && "translate-y-[-97%] translate-x-[-0.1%]",
          isTop && "translate-y-[57%] translate-x-[0%]",
        )}
      >
        <HeroSection
          player={player}
          isTop={isTop}
          G={G}
          ctx={ctx}
          events={events}
          moves={moves}
          {...props}
        />
      </div>

      <PlayerHand
        actualG={actualG}
        player={player}
        isTop={isTop}
        G={G}
        ctx={ctx}
        events={events}
        moves={moves}
        {...props}
      />

      {/* Name */}
      <div
        className={twMerge(
          "absolute z-10 top-[23.5%] left-[0vw] flex items-center pointer-events-none ",
          isTop && "top-[29.5%] left-[0vw]",
        )}
      >
        <div className="text-[1.2vw] text-center font-extrabold text-white font-belwe bg-black/60 pl-[0.5vw] pr-[2vw] py-[0.6vw]">
          {player.name}
        </div>
      </div>

      {/* Hero Power */}
      {player.hero.heroPower && (
        <HeroPower
          isTop={isTop}
          player={player}
          G={G}
          ctx={ctx}
          events={events}
          moves={moves}
          actualG={actualG}
          {...props}
        />
      )}

      {/* Hero Weapon */}
      <AnimatePresence>
        {player.weapon && <HeroWeapon weapon={player.weapon} isTop={isTop} />}
      </AnimatePresence>

      {/* Mana */}
      <div
        className={twMerge(
          "absolute z-10 top-[53.5%] left-[64.1vw] flex items-center pointer-events-none ",
          isTop && "top-[30%] left-[62vw]",
        )}
      >
        <div
          className="flex items-center justify-center  px-[0.5vw] py-[0.1vw] rounded-full w-[4.5vw] text-center "
          title={`${player.mana} / ${player.manaCrystals} Mana`}
          style={{
            backgroundImage: `url(${mana_bar})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // darken background with filter
            backgroundBlendMode: "multiply",
            filter: "brightness(120%)",
            // filter it slightly light blue
            backgroundColor: "rgba(59, 130, 246, 0.5)",
          }}
        >
          <span className="text-[1.1vw] scale-150 text-center font-extrabold text-white font-belwe text-shadow-A">
            {player.mana}/{player.manaCrystals}
          </span>
        </div>
        {!isTop && (
          <div className="ml-[0.5vw] mt-[0.05vw] flex items-center justify-center">
            {Array.from({ length: player.manaCrystals }, (_, i) => (
              <img
                key={i}
                src={mana_crystal}
                alt="Mana"
                // darken the crystal if it's above the player's current mana
                className={twMerge(
                  "  w-[1.81vw] h-[2vw] object-contain shadow-lg ",

                  i < player.mana ? "brightness-150" : "brightness-50",
                )}
                draggable="false"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function HeroWeapon({ weapon, isTop }: { weapon: Card; isTop?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
  }, []);

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
      const cardScaled = cardWidth * 1.5; // Account for 150% scale
      const spacing = 20; // Spacing between weapon and popover

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
        <img
          src={weapon.imageUrl}
          alt={weapon.title}
          className="w-[5.5vw] h-[5.5vw] rounded-full absolute z-[-1]"
          draggable="false"
        />
        <p className="absolute bottom-[1.5vw] left-[1.5vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A">
          {getAttack(weapon)}
        </p>

        <p
          className={twMerge(
            "absolute bottom-[1.5vw] right-[1.2vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A",
            getCurrentDurability(weapon) == weapon.baseDurability &&
              getMaxDurability(weapon) == weapon.baseDurability
              ? ""
              : getCurrentDurability(weapon) < getMaxDurability(weapon)
                ? "text-red-500"
                : "text-green-400",
          )}
        >
          {getCurrentDurability(weapon)}
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

export default PlayerArea;
