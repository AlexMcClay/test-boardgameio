import type { CardProps } from "./types";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "boardgame.io";
import DragCard from "./DragCard";
import { useDragStore } from "@/stores/dragStore";
import { twMerge } from "tailwind-merge";

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

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget("card", props.playerID, props.card.id);

  return (
    <div
      ref={setNodeRef}
      className={twMerge(
        isOver && "ring-2 ring-yellow-300",
        isValid &&
          "ring-yellow-500 rounded-2xl ring-2 shadow-yellow-400  shadow-[0px_0px_20px_rgba(0,0,0,0.5)]",
      )}
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
