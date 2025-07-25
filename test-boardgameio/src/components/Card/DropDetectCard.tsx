import React from "react";
import type { CardProps } from "./types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import Card from ".";
import type { PlayerID } from "boardgame.io";
import DragCard from "./DragCard";

interface Props extends CardProps {
  playerID: PlayerID;
}

const DropDetectCard = (props: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: props.card.id,
    data: {
      type: "card",
      player: props.playerID, // Include playerID to match the Lane component
      id: props.card.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isOver ? "ring-2 ring-yellow-300" : ""}`}
    >
      <DragCard {...props} card={{ ...props.card, mana: null }} />
    </div>
  );
};

export default DropDetectCard;
