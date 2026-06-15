import { useDragStore } from "@/stores/dragStore";
import { useDroppable } from "@dnd-kit/core";
import type { PlayerID } from "boardgame.io";
import React from "react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence } from "motion/react";

type Props = {
  children: React.ReactNode;
  playerID: PlayerID; // Added playerID to match the Board component
};

const Lane = ({ children, playerID }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${playerID}`,
    data: {
      type: "lane",
      id: `lane-${playerID}`,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget("lane", playerID);

  return (
    <div
      ref={setNodeRef}
      className={twMerge(
        `flex justify-center items-center gap-[0.8vw] relative`,
        isOver && "ring-2 ring-yellow-300",
        isValid && "ring-2 ring-yellow-400 bg-yellow-400/10",
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
