// MCTS search off the main thread. Receives an EngineState snapshot, replies
// with the chosen move. The UI thread stays free to run animations while the
// bot "thinks" — no artificial timers anywhere.
import {
  findBestMove,
  DEFAULT_MCTS_CONFIG,
  type EngineState,
  type MCTSChosenMove,
  type MCTSConfig,
} from "@project/shared";

export interface AIWorkerRequest {
  requestId: number;
  state: EngineState;
  /** Search strength; omit for DEFAULT_MCTS_CONFIG. See MCTS_PRESETS. */
  config?: MCTSConfig;
}

export interface AIWorkerResponse {
  requestId: number;
  /** null = nothing enumerable; the host should end the bot's turn. */
  chosen: MCTSChosenMove | null;
}

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, state, config } = event.data;
  const chosen = findBestMove(state, config ?? DEFAULT_MCTS_CONFIG);
  const response: AIWorkerResponse = { requestId, chosen };
  self.postMessage(response);
};
