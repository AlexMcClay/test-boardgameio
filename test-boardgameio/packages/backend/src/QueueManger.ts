import { randomUUID } from "node:crypto";
import { Card, Hero } from "../../shared/game";


export type queueItem = {
  matchID: string;
  playerID: string;
  playerDeck: Card[]; 
  playerHero: Hero;
  skillLevel?: number; // Optional: can be used for skill-based matchmaking eventually
};


export class QueueManager {
  // string of match IDs
  private queue: queueItem[] = [];

  addToQueue(playerID: string, playerDeck: Card[], playerHero: Hero, skillLevel?: number) {
    const matchID = randomUUID();
    this.queue.push({ matchID, playerID, playerDeck, playerHero, skillLevel });
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