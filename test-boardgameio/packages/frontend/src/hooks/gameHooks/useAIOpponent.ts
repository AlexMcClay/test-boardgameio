// Drives the bot seat of a local game: whenever it's the bot's turn, ship the
// current EngineState to the MCTS Web Worker and apply the move it returns to
// the machine actor. Repeats until the turn passes back to the human or the
// game ends.
//
// There are deliberately NO pacing timers here (the old FastMCTSBot slept
// 750ms per move). The bot commits moves as fast as the search returns them;
// the player still sees each step because useGameAnimation replays the
// seq-ordered event log against the visual state buffer at animation speed.

import { useEffect, useRef } from "react";
import type { Actor } from "xstate";
import {
  gameMachine,
  getManaCost,
  hasPendingDeaths,
  moveCommandToEvent,
  type PlayerID,
} from "@project/shared";
import type {
  AIWorkerRequest,
  AIWorkerResponse,
} from "@/workers/ai.worker";

export function useAIOpponent(
  actor: Actor<typeof gameMachine> | null,
  botSeat: PlayerID,
) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestId = useRef(0);

  useEffect(() => {
    if (!actor) return;

    // Safety valve: if the bot somehow keeps producing no-op moves, force the
    // turn to end rather than burning CPU forever.
    const MAX_BOT_MOVES_PER_TURN = 60;
    let movesThisTurn = 0;
    let trackedTurn = -1;

    const worker = new Worker(
      new URL("../../workers/ai.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    const requestMoveIfBotTurn = () => {
      const snapshot = actor.getSnapshot();
      const { G, ctx } = snapshot.context;
      if (ctx.gameover) return;

      // Mulligan is simultaneous — handle it before any turn checks. Simple
      // heuristic: throw back expensive cards (cost > 4) for a curve start.
      if (snapshot.matches("mulligan")) {
        if (G.mulligan?.active && !G.mulligan.confirmed[botSeat]) {
          const replaceCardIds = G.players[botSeat].hand
            .filter(
              (card) =>
                card.originalID !== "the-coin" && getManaCost(card) > 4,
            )
            .map((card) => card.id);
          actor.send({ type: "MULLIGAN_CONFIRM", playerID: botSeat, replaceCardIds });
        }
        return;
      }

      if (ctx.currentPlayer !== botSeat) return;

      // Only search from settled, actionable states. While the machine is
      // resolving (battlecries, death waves) the board is mid-transition and
      // no move would be accepted anyway; the subscription fires again when
      // the machine lands back in an actionable state.
      const actionable =
        snapshot.matches({ playing: "idle" }) ||
        snapshot.matches({ playing: "awaitingBattlecryTarget" }) ||
        // A Choose One / Discover prompt is the bot's move to make. Left out
        // of this list the bot would request nothing and the game would hang
        // on its turn forever — there is no timeout to rescue it.
        snapshot.matches({ playing: "awaitingChoice" });
      if (!actionable || hasPendingDeaths(G)) {
        return;
      }

      if (ctx.turn !== trackedTurn) {
        trackedTurn = ctx.turn;
        movesThisTurn = 0;
      }
      if (++movesThisTurn > MAX_BOT_MOVES_PER_TURN) {
        console.warn("AI move cap reached; forcing END_TURN");
        actor.send({ type: "END_TURN", playerID: botSeat });
        return;
      }

      const requestId = ++pendingRequestId.current;
      const request: AIWorkerRequest = {
        requestId,
        // Strip functions/proxies defensively; state is plain data already.
        state: { G: structuredClone(G), ctx: { ...ctx } },
      };
      worker.postMessage(request);
    };

    worker.onmessage = (event: MessageEvent<AIWorkerResponse>) => {
      const { requestId, chosen } = event.data;
      // Ignore stale answers (e.g. from before a state change we already saw)
      if (requestId !== pendingRequestId.current) return;

      const snapshot = actor.getSnapshot();
      const { ctx } = snapshot.context;
      if (ctx.gameover || ctx.currentPlayer !== botSeat) return;
      // Board is mid-resolution: the machine wouldn't accept this move.
      // Drop it — the subscription re-requests once resolution settles.
      const actionable =
        snapshot.matches({ playing: "idle" }) ||
        snapshot.matches({ playing: "awaitingBattlecryTarget" }) ||
        snapshot.matches({ playing: "awaitingChoice" });
      if (!actionable) return;

      if (!chosen) {
        actor.send({ type: "END_TURN", playerID: botSeat });
        return;
      }

      const machineEvent = moveCommandToEvent(
        chosen.move,
        chosen.args,
        botSeat,
      );
      if (machineEvent) {
        actor.send(machineEvent);
      } else {
        actor.send({ type: "END_TURN", playerID: botSeat });
      }
      // The subscription below fires on the resulting state change and
      // requests the bot's next move if it's still their turn.
    };

    const subscription = actor.subscribe(() => requestMoveIfBotTurn());
    // Cover the case where the game starts on the bot's turn
    requestMoveIfBotTurn();

    return () => {
      subscription.unsubscribe();
      worker.terminate();
      workerRef.current = null;
    };
  }, [actor, botSeat]);
}
