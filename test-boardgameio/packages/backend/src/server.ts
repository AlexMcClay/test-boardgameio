import * as game from "@project/shared";
import { createRequire } from "node:module";
import type { Context } from "koa";
import type Router from "@koa/router";
import { WebSocketServer, WebSocket } from "ws";
import { QueueManager } from "./QueueManger";
import type { queueItem } from "./QueueManger";
import type { WebSocketMessage } from "@project/shared";

const require = createRequire(import.meta.url);
const { Server, Origins } = require("boardgame.io/server") as {
  Server: (opts: any) => {
    app: any;
    db: any;
    auth: any;
    router: Router;
    transport: any;
    run: (port: number) => Promise<any>;
    kill: (servers: any) => void;
  };
  Origins: {
    LOCALHOST: RegExp;
  };
};

const queueManager = new QueueManager();
const socketsByPlayerId = new Map<string, WebSocket>();

// Defaut Server configuration
const server = Server({
  games: [game.HeathStoneGame],
  origins: [Origins.LOCALHOST],
});

// Default Lobby API configuration - can be customized as needed (Kept for example and if we want to use it )
const lobbyConfig = {
  apiPort: 8080,
  apiCallback: () => console.log("Running Lobby API on port 8080..."),
};

// Helper function to create and start a match between two players using the Boardgame.io REST API
async function createAndStartMatch(
  playerA: queueItem,
  playerB: {
    playerID: string;
    playerDeck: queueItem["playerDeck"];
    playerHero: queueItem["playerHero"];
  },
) {
  const gameName = game.HeathStoneGame.name;
  const apiBase = `http://127.0.0.1:${lobbyConfig.apiPort}`;

  const createResponse = await fetch(`${apiBase}/games/${gameName}/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      numPlayers: 2,
      setupData: {
        playerDeck: playerA.playerDeck,
        playerHero: playerA.playerHero,
        opponentDeck: playerB.playerDeck,
        opponentHero: playerB.playerHero,
      },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create match: ${await createResponse.text()}`);
  }

  const { matchID } = (await createResponse.json()) as { matchID: string };

  const joinPlayer = async (playerID: "0" | "1", playerName: string) => {
    const joinResponse = await fetch(
      `${apiBase}/games/${gameName}/${matchID}/join`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerID,
          playerName,
        }),
      },
    );

    if (!joinResponse.ok) {
      throw new Error(
        `Failed to join player ${playerID}: ${await joinResponse.text()}`,
      );
    }

    return (await joinResponse.json()) as {
      playerID: string;
      playerCredentials: string;
    };
  };

  const playerASeat = await joinPlayer("0", playerA.playerID);
  const playerBSeat = await joinPlayer("1", playerB.playerID);

  return {
    matchID,
    playerASeat,
    playerBSeat,
  };
}
// Start the boardgameIO server + Lobby api's and set up WebSocket handling for matchmaking
server.run({ port: 8000, lobbyConfig } as any).then(({ appServer }) => {
  // Set up WebSocket server for matchmaking
  const wss = new WebSocketServer({
    server: appServer,
    path: "/matchmaking-ws",
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected to matchmaking");
    let queuedMatchID: string | null = null;
    let connectedPlayerID: string | null = null;

    ws.on("message", (message: Buffer) => {
      console.log("Received:", message.toString());
      const request: WebSocketMessage = JSON.parse(message.toString());
      if (request.type === "connect") {
        connectedPlayerID = request.playerID;
        socketsByPlayerId.set(request.playerID, ws);
      }

      if (request.type === "find_match") {
        if (queueManager.isPlayerInQueue(request.playerID)) {
          console.log(
            `Player ${request.playerID} is already in the matchmaking queue.`,
          );
          return;
        }
        connectedPlayerID = request.playerID;
        socketsByPlayerId.set(request.playerID, ws);

        const queuedOpponent = queueManager.findMatch(
          request.playerID,
          request.skillLevel,
        );

        if (!queuedOpponent) {
          queuedMatchID = queueManager.addToQueue(
            request.playerID,
            request.playerDeck,
            request.playerHero,
            request.skillLevel,
          );

          const response: WebSocketMessage = {
            type: "searching_for_match",
            matchID: queuedMatchID,
          };
          ws.send(JSON.stringify(response));
          return;
        }
        // Create and start the remote match (BoardGameIO Engine) , then notify both players with their match details and opponent info
        Promise.resolve(createAndStartMatch(queuedOpponent, request))
          .then(({ matchID, playerASeat, playerBSeat }) => {
            const currentPlayerResponse: WebSocketMessage = {
              type: "match_found",
              matchID,
              playerID: playerBSeat.playerID,
              playerCredentials: playerBSeat.playerCredentials,
              opponent: {
                playerID: queuedOpponent.playerID,
                OpponentHero: queuedOpponent.playerHero,
                OpponentDeck: queuedOpponent.playerDeck,
                skillLevel: queuedOpponent.skillLevel,
              },
            };

            const queuedOpponentResponse: WebSocketMessage = {
              type: "match_found",
              matchID,
              playerID: playerASeat.playerID,
              playerCredentials: playerASeat.playerCredentials,
              opponent: {
                playerID: request.playerID,
                OpponentHero: request.playerHero,
                OpponentDeck: request.playerDeck,
                skillLevel: request.skillLevel,
              },
            };

            const opponentSocket = socketsByPlayerId.get(
              queuedOpponent.playerID,
            );
            if (
              opponentSocket &&
              opponentSocket.readyState === WebSocket.OPEN
            ) {
              opponentSocket.send(JSON.stringify(queuedOpponentResponse));
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(currentPlayerResponse));
            }
          })
          .catch((error) => {
            console.error("Failed to create/start match", error);
          });
      }

      if (request.type === "cancel_search") {
        if (queuedMatchID) {
          console.log(
            `Player ${request.playerID} canceled matchmaking search.`,
          );
          queueManager.removeFromQueue(queuedMatchID);
          queuedMatchID = null;
        }
      }
    });

    ws.on("close", () => {
      if (queuedMatchID) {
        queueManager.removeFromQueue(queuedMatchID);
      }
      if (connectedPlayerID) {
        socketsByPlayerId.delete(connectedPlayerID);
      }
      console.log("WebSocket client disconnected");
    });
  });

  console.log(
    "🚀 WebSocket matchmaking available at ws://localhost:8000/matchmaking-ws",
  );
});
