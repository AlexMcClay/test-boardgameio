import type { CardProps } from "./types";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "boardgame.io";
import DragCard from "./DragCard";

interface Props extends CardProps {
  playerID: PlayerID;
  ctx: Ctx;
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
      <DragCard
        {...props}
        card={{ ...props.card, mana: null }}
        playerID={props.playerID}
        ctx={props.ctx}
      />
    </div>
  );
};

export default DropDetectCard;
