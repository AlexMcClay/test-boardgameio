# Backend

Backend service for the boardgame.io match server and websocket matchmaking.

## Prerequisites

- Node.js 20+
- Install dependencies from the repo root

## Development

From the repository root:

```bash
npm run dev -w packages/backend
```

This starts the backend on port `8000`.

The boardgame.io lobby API uses port `8080`.
If `8080` is already in use, the backend will fail to start until the port is freed or changed in `src/server.ts`.

## Matchmaking

The backend exposes a websocket endpoint at:

```text
ws://localhost:8000/matchmaking-ws
```

Matchmaking messages currently support:

- `connect`
- `find_match`
- `searching_for_match`
- `match_found`

When a match is found, the backend creates a real boardgame.io match, joins both players, and sends each client the match details needed to start the game.

## Files of interest

- `src/server.ts` - backend entrypoint and matchmaking flow
- `src/QueueManger.ts` - queue management logic
- `src/types/WebSocketMessages.ts` - websocket message types
