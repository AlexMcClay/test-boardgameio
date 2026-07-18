// Transport adapter: exposes { G, ctx, moves, playerID } to the board UI for
// both hosts —
//   - "local": an in-browser XState gameMachine actor (single-player vs AI,
//     or hotseat PvP). The actor is also returned so the AI driver can watch
//     it and inject bot moves.
//   - "online": the authoritative actor lives on the backend; this hook
//     speaks the game_join/game_move/game_sync protocol over the existing
//     matchmaking WebSocket and mirrors the served state.
//
// Either way the UI receives atomic state updates; animation staggering is
// handled downstream by useGameAnimation replaying G.gameEvents.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createActor, type Actor } from "xstate";
import {
  gameMachine,
  moveCommandToEvent,
  type GameCtx,
  type GameSetupData,
  type GameState,
  type MoveName,
} from "@project/shared";
import { matchmakingWebSocketService } from "@/services/matchMakingService";
import type { MultiplayerSession } from "@/stores/viewStore";
import type { GameBoardProps, GameMoves } from "@/types/gameProps";

export type GameConnection = GameBoardProps & {
  /** Only set for mode "local": the in-browser machine actor (AI driver). */
  actor: Actor<typeof gameMachine> | null;
  /** False while an online game hasn't received its first sync yet. */
  isReady: boolean;
};

interface LocalParams {
  mode: "local";
  setupData: GameSetupData;
  /** Seat the human controls ("0" vs AI) or null for hotseat. */
  playerID: string | null;
}

interface OnlineParams {
  mode: "online";
  session: MultiplayerSession;
}

export type GameConnectionParams = LocalParams | OnlineParams;

const MOVE_NAMES: MoveName[] = [
  "placeCard",
  "minionAttack",
  "heroAttack",
  "useHeroPower",
  "resolveBattlecry",
  "cancelBattlecry",
  "drawCard",
  "endTurn",
  "mulliganConfirm",
];

export function useGameConnection(params: GameConnectionParams): GameConnection {
  const isLocal = params.mode === "local";

  // ----- local host: one actor per mount (remounts via gameKey) -----
  // Created inside the effect (not a useState initializer) so React
  // StrictMode's mount → cleanup → remount cycle gets a FRESH actor instead
  // of a permanently stopped one.
  const [actor, setActor] = useState<Actor<typeof gameMachine> | null>(null);
  const setupDataRef = useRef(
    params.mode === "local" ? params.setupData : null,
  );

  useEffect(() => {
    if (!isLocal || !setupDataRef.current) return;
    const nextActor = createActor(gameMachine, {
      input: { setupData: setupDataRef.current },
    }).start();
    setActor(nextActor);
    return () => {
      nextActor.stop();
      setActor(null);
    };
  }, [isLocal]);

  const localSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (!actor) return () => {};
      const sub = actor.subscribe(onStoreChange);
      return () => sub.unsubscribe();
    },
    () => (actor ? actor.getSnapshot() : null),
  );

  // ----- online host: mirror the server's state over the WS -----
  const session = params.mode === "online" ? params.session : null;
  const [remote, setRemote] = useState<{ G: GameState; ctx: GameCtx } | null>(
    null,
  );
  // Keep the latest session in a ref so socket handlers don't go stale.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!session) return;

    const joinMatch = () => {
      matchmakingWebSocketService.send({
        type: "game_join",
        matchID: session.matchID,
        playerID: session.playerID,
        credentials: session.playerCredentials,
      });
    };

    const unsubscribeMessages = matchmakingWebSocketService.subscribe(
      (message) => {
        if (
          message.type === "game_sync" &&
          message.matchID === sessionRef.current?.matchID
        ) {
          setRemote({ G: message.G, ctx: message.ctx });
        } else if (
          message.type === "game_error" &&
          message.matchID === sessionRef.current?.matchID
        ) {
          console.warn("Game error from server:", message.error);
        }
      },
    );

    // Re-join whenever the underlying socket reconnects mid-game.
    const unsubscribeOpen =
      matchmakingWebSocketService.subscribeOpen(joinMatch);

    // (Re)arm the connection — PlayScreen disconnects the socket when it
    // unmounts into the game view. If the socket is still opening, the
    // subscribeOpen handler above performs the join once it's ready.
    matchmakingWebSocketService.connect();
    if (matchmakingWebSocketService.isOpen()) {
      joinMatch();
    }

    return () => {
      unsubscribeMessages();
      unsubscribeOpen();
    };
  }, [session?.matchID]);

  // ----- unified moves object -----
  const moves = useMemo<GameMoves>(() => {
    const dispatch = (move: MoveName, args: unknown[]) => {
      // mulliganConfirm carries an optional acting seat as its 2nd argument
      // (hotseat only) — it's routing metadata, not an engine argument.
      let seatOverride: string | undefined;
      if (move === "mulliganConfirm") {
        seatOverride = args[1] as string | undefined;
        args = [(args[0] as string[]) ?? []];
      }

      if (isLocal && actor) {
        // Hotseat/AI-host: the human always acts as the current player; the
        // machine validates legality either way.
        const seat =
          seatOverride ??
          (params as LocalParams).playerID ??
          actor.getSnapshot().context.ctx.currentPlayer;
        const event = moveCommandToEvent(move, args, seat);
        if (event) actor.send(event);
      } else if (sessionRef.current) {
        matchmakingWebSocketService.send({
          type: "game_move",
          matchID: sessionRef.current.matchID,
          playerID: sessionRef.current.playerID,
          credentials: sessionRef.current.playerCredentials,
          move,
          args,
        });
      }
    };

    return Object.fromEntries(
      MOVE_NAMES.map((name) => [
        name,
        (...args: unknown[]) => dispatch(name, args),
      ]),
    ) as unknown as GameMoves;
  }, [actor, isLocal]);

  if (isLocal) {
    return {
      G: localSnapshot?.context.G as GameState,
      ctx: localSnapshot?.context.ctx as GameCtx,
      moves,
      playerID: (params as LocalParams).playerID,
      actor,
      isReady: !!localSnapshot,
    };
  }

  return {
    G: remote?.G as GameState,
    ctx: remote?.ctx as GameCtx,
    moves,
    playerID: session?.playerID ?? null,
    actor: null,
    isReady: !!remote,
  };
}
