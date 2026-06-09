import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";
import Gameboard from "./GameBoard";
import DeckSelection from "./DeckSelection";

interface Props extends BoardProps<GameState> {}

const Board = ({ ctx, G, moves, ...props }: Props) => {
  if (ctx.phase === "setDeck") {
    return <DeckSelection ctx={ctx} moves={moves} {...props} />;
  }

  return <Gameboard ctx={ctx} G={G} moves={moves} {...props} />;
};

export default Board;
