import type { Card, Hero } from "../game";


export type WebSocketMessage =
    | MatchFoundMessage
    | FindMatchMessage
    | SearchingForMatchMessage 
    | CancelMatchSearchMessage
    | ConnectMessage;


export interface ConnectMessage {
    type: "connect";
    playerID: string;
}

export interface MatchFoundMessage {
    type: "match_found";
    matchID: string;
    playerID: string;
    playerCredentials: string;
    opponent: {
        playerID: string;
        OpponentHero: Hero;
        OpponentDeck: Card[];
        skillLevel?: number;
    };
}

export interface FindMatchMessage {
    type: "find_match";
    playerID: string;
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