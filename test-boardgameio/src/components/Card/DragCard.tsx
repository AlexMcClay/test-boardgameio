import React from "react";
import type { CardProps } from "./types";
import { useDraggable } from "@dnd-kit/core";
import Card from ".";

interface Props extends CardProps {}

const DragCard = (props: Props) => {
  const disabled = props.card.isPlaced && props.card.hasAttacked; //

  const { isDragging, setNodeRef, listeners, transform } = useDraggable({
    id: props.card.id,
    data: {
      type: "card",
      card: props.card,
    },
    disabled: disabled, // Disable dragging if the card has attacked or was just placed
  });

  return (
    <div
      ref={setNodeRef}
      className={`${!disabled && "cursor-grab"} ${isDragging ? " cursor-grabbing" : ""}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: "none",
        zIndex: isDragging ? 1000 : "auto",
      }}
      {...listeners}
    >
      <Card {...props} isDragging={isDragging} />
    </div>
  );
};

export default DragCard;
