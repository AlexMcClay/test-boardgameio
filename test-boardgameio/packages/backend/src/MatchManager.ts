// Hosts one XState gameMachine actor per online match and owns the game-side
// WebSocket protocol: seat credentials, move validation, and state broadcast.
//
// Moves resolve atomically on the actor; after each move both clients receive
// a full authoritative game_sync. Animation staggering happens client-side by
// replaying G.gameEvents — the server never delays state.

import { createActor, type Actor } from "xstate";
import {
  gameMachine,
  moveCommandToEvent,
  randomIDGen,
  type GameSetupData,
  type GameSyncMessage,
  type MoveName,
} from "@project/shared";
import type { WebSocket } from "ws";

type SeatID = "0" | "1";

interface Seat {
  credentials: string;
  socket: WebSocket | null;
}

interface Match {
  id: string;
  actor: Actor<typeof gameMachine>;
  seats: Record<SeatID, Seat>;
  /** Set when both sockets are gone; used by the sweeper. */
  emptySince: number | null;
  /** stateVersion of the last broadcast, so the subscription can dedupe. */
  lastBroadcastVersion: number;
}

/** Matches with no connected sockets for this long get discarded. */
const EMPTY_MATCH_TTL_MS = 10 * 60 * 1000;

export class MatchManager {
  private matches = new Map<string, Match>();

  constructor() {
    const sweeper = setInterval(() => this.sweep(), 60_000);
    // Don't keep the process alive just for cleanup
    sweeper.unref?.();
  }

  /** Creates and starts a match; returns seat credentials for both players. */
  createMatch(setupData: GameSetupData): {
    matchID: string;
    seats: Record<SeatID, { playerID: SeatID; playerCredentials: string }>;
  } {
    const matchID = randomIDGen();
    const actor = createActor(gameMachine, { input: { setupData } });
    actor.start();

    const match: Match = {
      id: matchID,
      actor,
      seats: {
        "0": { credentials: randomIDGen(), socket: null },
        "1": { credentials: randomIDGen(), socket: null },
      },
      emptySince: Date.now(),
      lastBroadcastVersion: -1,
    };
    this.matches.set(matchID, match);

    // Broadcast every state change, including the machine's own delayed
    // death-wave transitions (which happen AFTER the triggering game_move
    // returns) — each wave reaches both clients as its own game_sync.
    actor.subscribe((snapshot) => {
      const version = snapshot.context.G.eventHistory.length;
      if (version !== match.lastBroadcastVersion) {
        match.lastBroadcastVersion = version;
        this.broadcast(match);
      }
    });

    return {
      matchID,
      seats: {
        "0": { playerID: "0", playerCredentials: match.seats["0"].credentials },
        "1": { playerID: "1", playerCredentials: match.seats["1"].credentials },
      },
    };
  }

  /**
   * Attaches (or re-attaches after reconnect) a socket to a seat and sends the
   * full authoritative snapshot. Returns an error string or null on success.
   */
  joinSocket(
    matchID: string,
    playerID: string,
    credentials: string,
    socket: WebSocket,
  ): string | null {
    const match = this.matches.get(matchID);
    if (!match) return "match-not-found";
    const seat = this.authSeat(match, playerID, credentials);
    if (!seat) return "invalid-credentials";

    seat.socket = socket;
    match.emptySince = null;
    this.send(socket, this.syncMessage(match));
    return null;
  }

  /** Validates and applies a move, then broadcasts the new state to both seats. */
  handleMove(
    matchID: string,
    playerID: string,
    credentials: string,
    move: MoveName,
    args: unknown[],
  ): string | null {
    const match = this.matches.get(matchID);
    if (!match) return "match-not-found";
    const seat = this.authSeat(match, playerID, credentials);
    if (!seat) return "invalid-credentials";

    const snapshot = match.actor.getSnapshot();
    if (snapshot.context.ctx.gameover) return "game-over";

    const event = moveCommandToEvent(move, args ?? [], playerID);
    if (!event) return `unknown-move:${String(move)}`;

    // The machine + engine enforce turn ownership and move legality. The
    // actor subscription (see createMatch) broadcasts each resulting
    // snapshot — including any resolution steps (battlecry, death waves)
    // that run asynchronously after this call returns.
    const versionBefore =
      match.actor.getSnapshot().context.G.eventHistory.length;
    match.actor.send(event);
    const versionAfter =
      match.actor.getSnapshot().context.G.eventHistory.length;

    // Rejected/no-op moves (invalid target, wrong machine state, ...) change
    // nothing and broadcast nothing — tell the mover so clients aren't left
    // waiting on a sync that will never come.
    if (versionAfter === versionBefore) {
      return "move-not-applied";
    }
    return null;
  }

  /** Called when any websocket closes: detach it from whatever seat holds it. */
  detachSocket(socket: WebSocket) {
    for (const match of this.matches.values()) {
      let touched = false;
      (Object.keys(match.seats) as SeatID[]).forEach((seatId) => {
        if (match.seats[seatId].socket === socket) {
          match.seats[seatId].socket = null;
          touched = true;
        }
      });
      if (
        touched &&
        !match.seats["0"].socket &&
        !match.seats["1"].socket
      ) {
        match.emptySince = Date.now();
      }
    }
  }

  private authSeat(
    match: Match,
    playerID: string,
    credentials: string,
  ): Seat | null {
    if (playerID !== "0" && playerID !== "1") return null;
    const seat = match.seats[playerID];
    if (seat.credentials !== credentials) return null;
    return seat;
  }

  private syncMessage(match: Match): GameSyncMessage {
    const { context } = match.actor.getSnapshot();
    return {
      type: "game_sync",
      matchID: match.id,
      G: context.G,
      ctx: context.ctx,
      stateVersion: context.G.eventHistory.length,
    };
  }

  private broadcast(match: Match) {
    const message = this.syncMessage(match);
    (Object.keys(match.seats) as SeatID[]).forEach((seatId) => {
      const socket = match.seats[seatId].socket;
      if (socket) this.send(socket, message);
    });
  }

  private send(socket: WebSocket, message: GameSyncMessage) {
    // readyState 1 = OPEN (avoid importing the ws enum for a constant)
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  }

  private sweep() {
    const now = Date.now();
    for (const [id, match] of this.matches) {
      const finished = !!match.actor.getSnapshot().context.ctx.gameover;
      const abandoned =
        match.emptySince !== null &&
        now - match.emptySince > EMPTY_MATCH_TTL_MS;
      if (abandoned || (finished && match.emptySince !== null)) {
        match.actor.stop();
        this.matches.delete(id);
      }
    }
  }
}
