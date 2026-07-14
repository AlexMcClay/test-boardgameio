import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { QueueManager } from "./QueueManger";
import type { queueItem } from "./QueueManger";
import { MatchManager } from "./MatchManager";
import type { WebSocketMessage } from "@project/shared";

const PORT = Number(process.env.PORT || 8000);

const queueManager = new QueueManager();
const matchManager = new MatchManager();

// Helper function to create and start a match between two players on the
// XState match host. Seat "0" = the queued player, seat "1" = the requester
// (same order the old boardgame.io lobby joined them in).
function createAndStartMatch(
  playerA: queueItem,
  playerB: {
    playerID: string;
    playerUsername: queueItem["playerUsername"];
    playerDeck: queueItem["playerDeck"];
    playerHero: queueItem["playerHero"];
  },
) {
  console.log(
    "Creating match between:",
    playerA.playerUsername,
    playerB.playerUsername,
  );

  const { matchID, seats } = matchManager.createMatch({
    player0: {
      deck: playerA.playerDeck,
      hero: playerA.playerHero,
      playerUsername: playerA.playerUsername,
    },
    player1: {
      deck: playerB.playerDeck,
      hero: playerB.playerHero,
      playerUsername: playerB.playerUsername,
    },
  });

  return {
    matchID,
    playerASeat: seats["0"],
    playerBSeat: seats["1"],
  };
}

// Plain HTTP server (health check only — all game traffic runs over the WS).
const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// Single WebSocket endpoint for matchmaking AND game traffic. Clients keep the
// same socket after match_found and speak the game_join/game_move protocol.
const wss = new WebSocketServer({
  server: httpServer,
  path: "/matchmaking-ws",
});

wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket client connected");
  let queuedMatchID: string | null = null;
  let connectedPlayerID: { playerID: string; playerUsername: string } | null =
    null;

  const sendError = (matchID: string, error: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "game_error", matchID, error }));
    }
  };

  ws.on("message", (message: Buffer) => {
    let request: WebSocketMessage;
    try {
      request = JSON.parse(message.toString());
    } catch {
      console.warn("Ignoring malformed WS message");
      return;
    }

    if (request.type === "connect") {
      connectedPlayerID = {
        playerID: request.playerID,
        playerUsername: request.playerUsername,
      };
      queueManager.addSocketByPlayerId(request.playerID, ws);
    }

    // -------------------- game protocol --------------------
    else if (request.type === "game_join") {
      const error = matchManager.joinSocket(
        request.matchID,
        request.playerID,
        request.credentials,
        ws,
      );
      if (error) sendError(request.matchID, error);
    }

    else if (request.type === "game_move") {
      const error = matchManager.handleMove(
        request.matchID,
        request.playerID,
        request.credentials,
        request.move,
        request.args,
      );
      if (error) sendError(request.matchID, error);
    }

    // -------------------- matchmaking --------------------
    else if (request.type === "find_match") {
      if (queueManager.isPlayerInQueue(request.playerID)) {
        console.log(
          `Player ${request.playerUsername} (ID: ${request.playerID}) is already in the matchmaking queue.`,
        );
        return;
      }
      console.log(
        `Player ${request.playerUsername} (ID: ${request.playerID}) is searching for a match with skill level: ${request.skillLevel}`,
      );
      connectedPlayerID = {
        playerID: request.playerID,
        playerUsername: request.playerUsername,
      };
      queueManager.addSocketByPlayerId(request.playerID, ws);

      const queuedOpponent = queueManager.findMatch(
        request.playerID,
        request.skillLevel,
      );

      if (!queuedOpponent) {
        queuedMatchID = queueManager.addToQueue(
          request.playerID,
          request.playerUsername,
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
      console.log(
        `Match found between ${request.playerUsername} and ${queuedOpponent.playerUsername}`,
      );

      // Create the match on the XState host, then notify both players with
      // their seat + opponent info.
      try {
        const { matchID, playerASeat, playerBSeat } = createAndStartMatch(
          queuedOpponent,
          request,
        );

        const currentPlayerResponse: WebSocketMessage = {
          type: "match_found",
          matchID,
          playerID: playerBSeat.playerID,
          playerUsername: request.playerUsername,
          playerCredentials: playerBSeat.playerCredentials,
          opponent: {
            playerUsername: queuedOpponent.playerUsername,
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
          playerUsername: queuedOpponent.playerUsername,
          playerCredentials: playerASeat.playerCredentials,
          opponent: {
            playerUsername: request.playerUsername,
            playerID: request.playerID,
            OpponentHero: request.playerHero,
            OpponentDeck: request.playerDeck,
            skillLevel: request.skillLevel,
          },
        };

        const opponentSocket = queueManager.getSocketByPlayerId(
          queuedOpponent.playerID,
        );
        if (opponentSocket && opponentSocket.readyState === WebSocket.OPEN) {
          opponentSocket.send(JSON.stringify(queuedOpponentResponse));
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(currentPlayerResponse));
        }
      } catch (error) {
        console.error("Failed to create/start match", error);
      }
    }

    else if (request.type === "cancel_search") {
      if (queuedMatchID) {
        console.log(`Player ${request.playerID} canceled matchmaking search.`);
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
      queueManager.removeSocketByPlayerId(connectedPlayerID.playerID);
    }
    matchManager.detachSocket(ws);
    console.log("WebSocket client disconnected");
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Game server listening on http://0.0.0.0:${PORT}`);
  console.log(
    `🚀 WebSocket matchmaking + game protocol at ws://localhost:${PORT}/matchmaking-ws`,
  );
});
