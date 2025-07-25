import React from "react";
import type { CardProps } from "./types";
import { useDraggable } from "@dnd-kit/core";
import Card from ".";

interface Props extends CardProps {}

const DragCard = (props: Props) => {
  const { isDragging, setNodeRef, listeners, transform } = useDraggable({
    id: props.id,
    data: {
      type: "card",
      card: props,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab ${isDragging ? " cursor-grabbing" : ""}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: "none",
      }}
      {...listeners}
    >
      <Card {...props} />
    </div>
  );
};

export default DragCard;
