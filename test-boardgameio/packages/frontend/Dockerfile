FROM node:lts-alpine3.24 AS base

WORKDIR /app

# This Dockerfile expects the build context to be the monorepo root.
# Example: docker build -f packages/backend/Dockerfile .
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json
RUN npm ci --workspace packages/shared --workspace packages/frontend

COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

RUN npm run build --workspace packages/frontend
WORKDIR /app/packages/frontend
CMD ["npm", "start"]