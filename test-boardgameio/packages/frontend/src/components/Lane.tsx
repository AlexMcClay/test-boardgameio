import { useDragStore } from "@/stores/dragStore";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "boardgame.io";
import React from "react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence } from "motion/react";
import type { GameState } from "@project/shared";

type Props = {
  children: React.ReactNode;
  playerID: PlayerID; // Added playerID to match the Board component
  G: GameState;
  ctx: Ctx;
};

const Lane = ({ children, playerID, ...props }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${playerID}`,
    data: {
      type: "lane",
      id: `lane-${playerID}`,
      player: playerID,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget(
    {
      type: "lane",
      id: `lane-${playerID}`,
      player: playerID,
    },
    {
      G: props.G,
      ctx: props.ctx,
      playerID: props.ctx.currentPlayer,
      location: "board",
    },
  );

  return (
    <div
      ref={setNodeRef}
      className={twMerge(
        `flex justify-center items-center gap-[0.8vw] relative`,
        isValid && "ring-2 ring-orange-300 bg-orange-400/10",
        isOver && "ring-2 ring-green-300 bg-green-400/20",
      )}
      style={{
        height: "calc(36%)", // Adjust height to account for gap
        width: "calc(55%)", // Adjust width to account for gap
      }}
    >
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
};

export default Lane;
