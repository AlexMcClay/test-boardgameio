import { useDroppable } from "@dnd-kit/core";
import type { PlayerID } from "boardgame.io";
import React from "react";

type Props = {
  children: React.ReactNode;
  playerID: PlayerID; // Added playerID to match the Board component
};

const Lane = ({ children, playerID }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${playerID}`,
    data: {
      type: playerID,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex justify-center items-center gap-4 h-1/2  bg-[#00000038] w-full ${isOver ? "ring-2 ring-yellow-300" : ""}`}
    >
      {children}
    </div>
  );
};

export default Lane;
