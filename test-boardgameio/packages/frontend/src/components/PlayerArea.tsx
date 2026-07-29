import type { GameBoardProps } from "@/types/gameProps";
import HeroSection from "./HeroSection";
import { twMerge } from "tailwind-merge";
import PlayerHand from "./PlayerHand";
import {
  getDisplayMaxMana,
  getSpendableMana,
  type Player,
} from "@project/shared";
import HeroPower from "./HeroPower/HeroPower";
import { AnimatePresence } from "motion/react";
import HeroWeapon from "./Board/HeroWeapon";

interface Props extends GameBoardProps {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
}

const mana_crystal = "assets/mana.png";
const mana_bar = "assets/mana_bar.png";

// Overload padlock — inline so it needs no image asset (swap for art later).
const OverloadLock = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3zm3 4a1.5 1.5 0 0 0-.75 2.8V19h1.5v-2.2A1.5 1.5 0 0 0 12 14z" />
  </svg>
);

const PlayerArea = ({ player, isTop, G, ctx, moves, ...props }: Props) => {
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
          moves={moves}
          {...props}
        />
      </div>

      {!(G.mulligan?.active && !isTop) && (
        <PlayerHand
          player={player}
          isTop={isTop}
          G={G}
          ctx={ctx}
          moves={moves}
          {...props}
        />
      )}

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
          moves={moves}
          {...props}
        />
      )}

      {/* Hero Weapon.*/}
      <AnimatePresence>
        {player.weapon && (
          <HeroWeapon
            key={player.weapon.id}
            weapon={player.weapon}
            ownerId={player.id}
            ctx={ctx}
            isTop={isTop}
          />
        )}
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
          title={`${getSpendableMana(player)} / ${getDisplayMaxMana(player)} Mana`}
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
            {getSpendableMana(player)}/{getDisplayMaxMana(player)}
          </span>
        </div>
        {!isTop && (
          <div className="ml-[0.5vw] mt-[0.05vw] flex items-center justify-center">
            {/* Permanent crystals: filled up to availableMana, then empty.
                Overload padlocks sit on the tail crystals. */}
            {Array.from({ length: player.maxMana }, (_, i) => {
              const overloadLocked = player.overloadLocked ?? 0;
              const overloadPending = player.overloadPending ?? 0;
              // Locked/pending crystals are the tail crystals (independent of
              // how much mana has been spent this turn).
              const isLocked = i >= player.maxMana - overloadLocked;
              const isPending = i >= player.maxMana - overloadPending;
              const isFilled = i < Math.max(0, player.availableMana);
              return (
                <div
                  key={`permanent-${i}`}
                  className="relative flex items-center justify-center"
                >
                  <img
                    src={mana_crystal}
                    alt="Mana"
                    // darken the crystal if it's above the player's current mana
                    className={twMerge(
                      "  w-[1.81vw] h-[2vw] object-contain shadow-lg ",

                      isFilled ? "brightness-150" : "brightness-50",
                    )}
                    draggable="false"
                  />
                  {/* Active lock this turn: padlock blocks the crystal */}
                  {isLocked && (
                    <OverloadLock className="pointer-events-none absolute inset-0 m-auto h-[1vw] w-[1vw] text-slate-100 drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]" />
                  )}
                  {/* Pending lock: preview beneath the crystal (locks next turn) */}
                  {isPending && (
                    <OverloadLock className="pointer-events-none absolute bottom-[-0.85vw] left-1/2 h-[0.8vw] w-[0.8vw] -translate-x-1/2 text-amber-300 drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]" />
                  )}
                </div>
              );
            })}
            {/* Temporary crystals (The Coin / Innervate) trail the permanent
                run, tinted so an 11th crystal reads as this-turn-only. They
                vanish when spent rather than emptying. */}
            {Array.from({ length: player.tempMana ?? 0 }, (_, j) => (
              <div
                key={`temp-${j}`}
                className="relative flex items-center justify-center"
                title="Temporary Mana Crystal — this turn only"
              >
                <img
                  src={mana_crystal}
                  alt="Temporary Mana"
                  className="w-[1.81vw] h-[2vw] object-contain shadow-lg brightness-150 hue-rotate-65 saturate-150 animate-pulse"
                  draggable="false"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerArea;
