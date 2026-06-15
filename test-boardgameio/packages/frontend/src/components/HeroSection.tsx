import { useDragStore } from "@/stores/dragStore";
import { useDroppable } from "@dnd-kit/core";
import type { GameState, Player } from "@project/shared";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { twMerge } from "tailwind-merge";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
}

const healthIcon = "assets/health.png";

const HeroSection = ({ player }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `player-${player.id}`,
    data: {
      type: "player",
      player: player.id, // Include playerID to match the Lane component
      id: player.id,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget("player", player.id);

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
    <div
      ref={setNodeRef}
      id="player-stats"
      data-player-id={player.id}
      data-player-bounds="true"
      className={twMerge(
        `flex items-center w-[7%] pointer-events-auto relative transition-all duration-100 no-shadow`,
        isValid && !isOver && "valid-target-shadow ",
      )}
      style={{
        aspectRatio: "1 / 1.06",
      }}
    >
      <div
        className="absolute inset-0 z-40 bg-transparent cursor-pointer"
        data-player-id={player.id} // Duplicated here so elementFromPoint catches it instantly
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

      {/* Health Icon (Pushed underneath the invisible hitbox layer using z-30) */}
      <div className="absolute bottom-[-10%] right-[-20%] z-20 w-[40%] aspect-square flex items-center justify-center pointer-events-none">
        <img
          src={healthIcon}
          alt="HP"
          className="w-full h-full object-contain inset-0 pointer-events-none"
          draggable="false"
        />

        <span
          className="text-red-500 z-10 text-[175%] absolute font-extrabold text-center leading-none font-belwe scale-140 pointer-events-none"
          style={{
            WebkitTextStroke: "1px black",
            textShadow: "0 1px 0px black",
          }}
        >
          {player.health}
        </span>
      </div>
    </div>
  );
};

export default HeroSection;
