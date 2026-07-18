import type { Card, Hero } from "../game";
import type { GameCtx, GameState } from "../game/types";
import type { MoveName } from "../game/engine";


export type WebSocketMessage =
    | MatchFoundMessage
    | FindMatchMessage
    | SearchingForMatchMessage
    | CancelMatchSearchMessage
    | ConnectMessage
    | ActivePlayersCountMessage
    | GameJoinMessage
    | GameMoveMessage
    | GameSyncMessage
    | GameErrorMessage;

/**
 * Client → server: (re)attach this socket to a seat in a running match.
 * Server responds with a full GameSyncMessage snapshot.
 */
export interface GameJoinMessage {
    type: "game_join";
    matchID: string;
    playerID: string; // seat: "0" | "1"
    credentials: string;
}

/** Client → server: apply a move for this seat. */
export interface GameMoveMessage {
    type: "game_move";
    matchID: string;
    playerID: string; // seat: "0" | "1"
    credentials: string;
    move: MoveName;
    args: unknown[];
}

/**
 * Server → both clients after every applied move (and on join/reconnect).
 * The authoritative state resolves atomically; clients replay G.gameEvents
 * (seq-numbered) against their visual buffer for staggered animations.
 */
export interface GameSyncMessage {
    type: "game_sync";
    matchID: string;
    G: GameState;
    ctx: GameCtx;
    /** Monotonic per-match version (eventHistory length). */
    stateVersion: number;
}

/** Server → client: a game_join/game_move was rejected. */
export interface GameErrorMessage {
    type: "game_error";
    matchID: string;
    error: string;
}


export interface ActivePlayersCountMessage {
    type: "active_players_count";
    count: number;
}

export interface ConnectMessage {
    type: "connect";
    playerID: string;
    playerUsername: string;
}

export interface MatchFoundMessage {
    type: "match_found";
    matchID: string;
    playerID: string;
    playerUsername: string;
    playerCredentials: string;
    opponent: {
        playerUsername: string;
        playerID: string;
        OpponentHero: Hero;
        OpponentDeck: Card[];
        skillLevel?: number;
    };
}

export interface FindMatchMessage {
    type: "find_match";
    playerID: string;
    playerUsername: string;
    playerDeck: Card[];
    playerHero: Hero;
    skillLevel?: number;
}


export interface SearchingForMatchMessage {
    type: "searching_for_match";
    matchID: string;
}

export interface CancelMatchSearchMessage {
    type: "cancel_search";
    playerID: string;
}