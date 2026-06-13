import type { BoardProps } from "boardgame.io/react";
import type { GameState } from "@/types";
import Gameboard from "./GameBoard";

interface Props extends BoardProps<GameState> {}

const Board = ({ ctx, G, moves, ...props }: Props) => {
  return <Gameboard ctx={ctx} G={G} moves={moves} {...props} />;
};

export default Board;
