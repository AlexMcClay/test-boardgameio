import type { GameState, Player } from "@/types";
import type { PlayerID } from "boardgame.io";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { twMerge } from "tailwind-merge";
import HandCard from "./Card/HandCard";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  playerID: PlayerID; // Added playerID to match the Board component
}

const PlayerHand = ({ isTop, G, ctx, player }: Props) => {
  return (
    <div
      className={twMerge(
        "flex absolute self-center justify-center w-full z-50 ",
        !isTop && "translate-y-[45%]",
        isTop && "translate-y-[-70%]",
      )}
    >
      {player.hand.map((card, idx) => {
        return (
          <HandCard
            key={card.id}
            size={player.hand.length}
            index={idx}
            isTop={isTop}
            card={card}
            ctx={ctx}
            player={player}
          />
        );
      })}
    </div>
  );
};

export default PlayerHand;
