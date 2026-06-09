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
        opacity: isDragging ? 0 : 1, // Hide original when dragging

        transition: "none",
      }}
      {...listeners}
    >
      <Card {...props} isDragging={isDragging} />
    </div>
  );
};

export default DragCard;
