// MCTS search off the main thread. Receives an EngineState snapshot, replies
// with the chosen move. The UI thread stays free to run animations while the
// bot "thinks" — no artificial timers anywhere.
import {
  findBestMove,
  DEFAULT_MCTS_CONFIG,
  type EngineState,
  type MCTSChosenMove,
} from "@project/shared";

export interface AIWorkerRequest {
  requestId: number;
  state: EngineState;
}

export interface AIWorkerResponse {
  requestId: number;
  /** null = nothing enumerable; the host should end the bot's turn. */
  chosen: MCTSChosenMove | null;
}

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, state } = event.data;
  const chosen = findBestMove(state, DEFAULT_MCTS_CONFIG);
  const response: AIWorkerResponse = { requestId, chosen };
  self.postMessage(response);
};
