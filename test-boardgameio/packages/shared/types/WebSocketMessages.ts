import type { Card, Hero } from "../game";


export type WebSocketMessage =
    | MatchFoundMessage
    | FindMatchMessage
    | SearchingForMatchMessage 
    | CancelMatchSearchMessage
    | ConnectMessage
    | ActivePlayersCountMessage;


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