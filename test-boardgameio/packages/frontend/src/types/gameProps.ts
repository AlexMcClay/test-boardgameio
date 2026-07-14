// Frontend-owned replacement for boardgame.io's BoardProps: the exact shape
// the board components consume, provided by useGameConnection for both hosts
// (local XState actor and online WebSocket match).
import type { GameCtx, GameState, TargetValue } from "@project/shared";

export interface GameMoves {
  placeCard: (
    cardId: string,
    target?: TargetValue,
    boardIndex?: number,
  ) => void;
  minionAttack: (attackerId: string, target: TargetValue) => void;
  heroAttack: (target: TargetValue) => void;
  useHeroPower: (target?: TargetValue) => void;
  resolveBattlecry: (cardId: string, target: TargetValue) => void;
  cancelBattlecry: () => void;
  drawCard: () => void;
  endTurn: () => void;
}

export interface GameBoardProps {
  G: GameState;
  ctx: GameCtx;
  moves: GameMoves;
  /** The seat this client controls; null = hotseat (control current player). */
  playerID: string | null;
}
