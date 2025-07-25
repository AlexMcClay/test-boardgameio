import type { GameState, Player } from "@/types";
import { useDroppable } from "@dnd-kit/core";
import type { PlayerID } from "boardgame.io";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import React from "react";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  playerID: PlayerID; // Added playerID to match the Board component
}

const mana_crystal = "src/assets/mana.png";
const healthIcon = "src/assets/health.png";

const HeroSection = ({
  player,
  isTop,
  playerID,
  G,
  ctx,
  events,
  moves,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `player-${player.id}`,
    data: {
      type: "player",
      player: playerID, // Include playerID to match the Lane component
      id: playerID,
    },
  });

  const heroPortrait = player.heroPortrait || "src/assets/default-hero.jpg";

  return (
    <div
      ref={setNodeRef}
      id="player-stats"
      className={`relative flex items-center gap-4 overflow-visible min-w-[160px]
        ${isOver ? "ring-2 ring-yellow-300" : ""}
        `}
      style={{ minHeight: "150px" }}
    >
      {/* Hero Portrait with overlayed stats */}
      <div className="relative w-44 h-44">
        <img
          src={heroPortrait}
          alt={`${player.name} portrait`}
          className="w-44 h-44 rounded-full border-4 border-gray-300 object-cover shadow-lg"
          draggable="false"
        />
      </div>
      {/* Name */}
      <div className="flex flex-col gap-2">
        <div className="text-xl font-bold whitespace-nowrap">{player.name}</div>
        <div className="flex items-center bg-black/70 px-2 py-1 rounded-lg">
          <img
            src={healthIcon}
            alt="HP"
            className="w-7 h-7 object-contain mr-2"
            draggable="false"
          />
          <span className="font-semibold text-white">{player.hp}</span>
          <span className="text-gray-300 ml-1">/ {player.maxHp}</span>
        </div>
        <div className="flex items-center bg-blue-900/70 px-2 py-1 rounded-lg">
          <img
            src={mana_crystal}
            alt="Mana"
            className="w-6 h-6 object-contain mr-2"
            draggable="false"
          />
          <span className="font-semibold text-blue-200">{player.mana}</span>
          <span className="text-gray-300 ml-1">/ {G.maxMana}</span>
        </div>
      </div>
      {ctx.currentPlayer === playerID && (
        <div className="flex items-center bg-blue-800/70 px-2 py-1 rounded-lg">
          Active Player
        </div>
      )}
    </div>
  );
};

export default HeroSection;
