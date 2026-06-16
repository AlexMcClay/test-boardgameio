FROM node:lts-alpine3.24 AS base

WORKDIR /app

# This Dockerfile expects the build context to be the monorepo root.
# Example: docker build -f packages/backend/Dockerfile .
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json
RUN npm ci --workspace packages/shared --workspace packages/backend

COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

WORKDIR /app/packages/backend
CMD ["npm", "start"]
