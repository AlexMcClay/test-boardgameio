import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import HeroSection from "./HeroSection";
import { twMerge } from "tailwind-merge";
import PlayerHand from "./PlayerHand";
import {
  getAttack,
  getCurrentDurability,
  getMaxDurability,
  type GameState,
  type Player,
} from "@project/shared";
import HeroPower from "./HeroPower/HeroPower";
import { div } from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { useRef, useState, useEffect } from "react";
import MinionCardPopover from "./MinionCardPopover";

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
      <HeroWeapon player={player} isTop={isTop} />

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

function HeroWeapon({ player, isTop }: { player: Player; isTop?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  if (!player.weapon) return null;

  return (
    <>
      <div
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
          src={player.weapon.imageUrl}
          alt={player.weapon.title}
          className="w-[5.5vw] h-[5.5vw] rounded-full absolute z-[-1]"
          draggable="false"
        />
        <p className="absolute bottom-[1.5vw] left-[1.5vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A">
          {getAttack(player.weapon)}
        </p>

        <p
          className={twMerge(
            "absolute bottom-[1.5vw] right-[1.2vw] transform -translate-x-1/2 text-white text-[1.2vw] scale-140 font-bold  text-shadow-A",
            getCurrentDurability(player.weapon) ==
              player.weapon.baseDurability &&
              getMaxDurability(player.weapon) == player.weapon.baseDurability
              ? ""
              : getCurrentDurability(player.weapon) <
                  getMaxDurability(player.weapon)
                ? "text-red-500"
                : "text-green-400",
          )}
        >
          {getCurrentDurability(player.weapon)}
        </p>
      </div>

      <AnimatePresence>
        {showPopover && (
          <MinionCardPopover
            key={"weapon-card-overlay"}
            card={{ ...player.weapon }}
            position={popoverPosition}
            type="popover"
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default PlayerArea;
