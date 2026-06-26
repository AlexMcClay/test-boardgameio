import { Card, Hero, randomIDGen } from "@project/shared";
import {  WebSocket } from "ws";
export type queueItem = {
  matchID: string;
  playerID: string;
  playerUsername: string;
  playerDeck: Card[];
  playerHero: Hero;
  skillLevel?: number; // Optional: can be used for skill-based matchmaking eventually
};

export class QueueManager {
  // string of match IDs
  private queue: queueItem[] = [];
  private activePlayers: number = 0;
  private socketsByPlayerId: Map<string, WebSocket> = new Map();


  updateActivePlayersCount(): void {
    this.activePlayers = this.socketsByPlayerId.size;
    this.sendMessageToallSockets({
      type: "active_players_count",
      count: this.activePlayers,
    });
  }

  getActivePlayersCount(): number {
    return this.activePlayers;
  }

  getSocketByPlayerId(playerID: string): WebSocket | undefined {
    return this.socketsByPlayerId.get(playerID);
  }

  removeSocketByPlayerId(playerID: string): void {
    this.socketsByPlayerId.delete(playerID);
    this.updateActivePlayersCount();
  }

  addSocketByPlayerId(playerID: string, socket: WebSocket): void {
    this.socketsByPlayerId.set(playerID, socket);
    this.updateActivePlayersCount();
  }

  sendMessageToallSockets(message: any): void {
    const messageString = JSON.stringify(message);
    this.socketsByPlayerId.forEach((socket) => {
      socket.send(messageString);
    });
  }

  addToQueue(
    playerID: string,
    playerUsername: string,
    playerDeck: Card[],
    playerHero: Hero,
    skillLevel?: number,
  ) {
    const matchID = randomIDGen();
    this.queue.push({ matchID, playerID, playerUsername, playerDeck, playerHero, skillLevel });
    return matchID;
  }

  isPlayerInQueue(playerID: string): boolean {
    return this.queue.some((item) => item.playerID === playerID);
  }

  removeFromQueue(matchID: string) {
    this.queue = this.queue.filter((item) => item.matchID !== matchID);
  }

  findMatch(playerID: string, skillLevel?: number): queueItem | null {
    // For simplicity, we just match the first player in the queue
    // Can be enhanced to consider skillLevel and avoid matching the same player with themselves
    if (this.queue.length >= 1) {
      const match = this.queue.slice(0, 1);
      this.queue = this.queue.slice(1);
      return match[0]; // Return the first player as the "match"
    }
    return null;
  }
}
