# test-boardgameio Deployment Guide

This repository is a Node.js monorepo using npm workspaces:

- `packages/frontend`
- `packages/backend`
- `packages/shared`

Both frontend and backend depend on `@project/shared`, so containers must be built from the monorepo root context.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2 (`docker compose`)

## Repository Layout (Relevant to Docker)

- `docker-compose.yaml`
- `packages/backend/Dockerfile`
- `packages/frontend/Dockerfile`
- `package.json` (workspace root)

## Build and Run with Docker Compose

Run all commands from the monorepo root:

```powershell
cd C:\Users\Marc\Documents\Projects\test-boardgameio\test-boardgameio
docker compose up --build
```

This will:

- Build backend image using `packages/backend/Dockerfile`
- Build frontend image using `packages/frontend/Dockerfile`
- Start both services

## Access the Services

- Frontend: `http://localhost:3000`
- Backend API / boardgame server: `http://localhost:8000`
- Backend lobby API: `http://localhost:8080`

## Stop the Stack

```powershell
docker compose down
```

To also remove volumes (if later added):

```powershell
docker compose down -v
```

## Rebuild Cleanly

Use this when dependencies or Dockerfiles changed:

```powershell
docker compose build --no-cache
docker compose up
```

## Verify Individual Image Builds

If you want to test each service image separately:

```powershell
docker build -f packages/backend/Dockerfile -t test-boardgameio-backend:dev .
docker build -f packages/frontend/Dockerfile -t test-boardgameio-frontend:dev .
```

Important: the final `.` is required. It sets build context to monorepo root so workspace packages (including `@project/shared`) are available.

## Common Monorepo Docker Pitfalls

### Error: `COPY ../shared ... not found`

Cause:

- Docker cannot copy files outside build context.

Fix:

- Use compose build context `.` from monorepo root.
- In Dockerfiles, copy paths like `packages/shared/...` instead of `../shared/...`.

### Error: cannot resolve `@project/shared`

Cause:

- Workspace dependency not installed in image build.

Fix:

- Install dependencies from root `package.json` and include workspaces during image build.

### Warning: `StageNameCasing`

Cause:

- Docker stage names should be lowercase.

Fix:

- Use stage names like `base` instead of `BASE`.

## Recommended Deployment Flow

1. Pull latest code.
2. Run `docker compose build --no-cache`.
3. Run `docker compose up -d`.
4. Check logs with `docker compose logs -f`.
5. Validate frontend and backend endpoints.

