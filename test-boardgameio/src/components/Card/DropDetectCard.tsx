import React from "react";
import type { CardProps } from "./types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import Card from ".";
import type { PlayerID } from "boardgame.io";

interface Props extends CardProps {
  playerID: PlayerID;
}

const DropDetectCard = (props: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: props.id,
    data: {
      type: "card",
      player: props.playerID, // Include playerID to match the Lane component
      id: props.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isOver ? "ring-2 ring-yellow-300" : ""}`}
    >
      <Card {...props} mana={null} />
    </div>
  );
};

export default DropDetectCard;
