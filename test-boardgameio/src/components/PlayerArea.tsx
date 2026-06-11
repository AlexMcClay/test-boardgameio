import type { GameState, Player } from "@/types";
import type { PlayerID } from "boardgame.io";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import HeroSection from "./HeroSection";
import { twMerge } from "tailwind-merge";
import PlayerHand from "./PlayerHand";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  playerID: PlayerID; // Added playerID to match the Board component
}

const mana_crystal = "assets/mana.png";

const PlayerArea = ({
  player,
  isTop,
  playerID,
  G,
  ctx,
  events,
  moves,
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
          isTop && "translate-y-[57%] translate-x-[0]",
        )}
      >
        <HeroSection
          player={player}
          isTop={isTop}
          playerID={playerID}
          G={G}
          ctx={ctx}
          events={events}
          moves={moves}
          {...props}
        />
      </div>

      <PlayerHand
        player={player}
        isTop={isTop}
        G={G}
        playerID={playerID}
        ctx={ctx}
        events={events}
        moves={moves}
        {...props}
      />

      {/* Mana */}
      <div
        className={twMerge(
          "absolute z-10 top-[53.5%] left-[64.2vw] flex items-center pointer-events-none ",
          isTop && "top-[29.5%] left-[62vw]",
        )}
      >
        <div
          className="flex items-center justify-center bg-blue-900/50 px-[0.5vw] py-[0.1vw] rounded-full w-[4.5vw] text-center"
          title={`${player.mana} / ${G.maxMana} Mana`}
          style={{
            backgroundImage: `url(${mana_crystal})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // darken background with filter
            backgroundBlendMode: "multiply",
            filter: "brightness(120%)",
            // filter it slightly light blue
            backgroundColor: "rgba(59, 130, 246, 0.5)",
          }}
        >
          <span
            className="text-[1.2vw] scale-140 text-center font-extrabold text-white font-belwe"
            style={{
              WebkitTextStroke: "1px black",
              textShadow: "0 1px 0px black",
            }}
          >
            {player.mana}/{G.maxMana}
          </span>
        </div>
        {!isTop && (
          <div className="ml-[0.5vw] flex items-center justify-center">
            {Array.from({ length: G.maxMana }, (_, i) => (
              <img
                key={i}
                src={mana_crystal}
                alt="Mana"
                // darken the crystal if it's above the player's current mana
                className={twMerge(
                  " aspect-square w-[2vw] object-contain ",

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

export default PlayerArea;
