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
  type Card,
  type PlayerID,
} from "@project/shared";
import type {
  AIWorkerRequest,
  AIWorkerResponse,
} from "@/workers/ai.worker";

/** Cards costing this or less are what a turn 1-3 curve is made of. */
const CHEAP_CURVE = 3;

/**
 * Which opening cards to throw back.
 *
 * The old rule ("replace anything over 4 mana") threw away every four-drop
 * regardless of the rest of the hand, which is a bad keep/toss line: a hand of
 * three one-drops wants a top end, and a hand with nothing under five wants to
 * keep one castable card rather than gamble the whole grip. Holding the Coin is
 * never wrong — it is free tempo and marks you as going second.
 */
function chooseMulligan(hand: Card[]): string[] {
  const isCoin = (card: Card) => card.originalID === "the-coin";

  const cheapCount = hand.filter(
    (c) => !isCoin(c) && getManaCost(c) <= CHEAP_CURVE,
  ).length;
  // Going second (holding the Coin) an extra crystal is available on turn 4,
  // and a hand short on early plays needs a payoff to aim at.
  const fourDropsToKeep = hand.some(isCoin) || cheapCount < 2 ? 1 : 0;

  let kept = 0;
  return hand
    .filter((card) => {
      if (isCoin(card)) return false;
      const mana = getManaCost(card);
      if (mana <= CHEAP_CURVE) return false;
      if (mana === 4 && kept < fourDropsToKeep) {
        kept++;
        return false;
      }
      return true;
    })
    .map((card) => card.id);
}

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

      // Mulligan is simultaneous — handle it before any turn checks.
      if (snapshot.matches("mulligan")) {
        if (G.mulligan?.active && !G.mulligan.confirmed[botSeat]) {
          actor.send({
            type: "MULLIGAN_CONFIRM",
            playerID: botSeat,
            replaceCardIds: chooseMulligan(G.players[botSeat].hand),
          });
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
