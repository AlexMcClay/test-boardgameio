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

FROM nginxinc/nginx-unprivileged:alpine AS production
COPY --from=base /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
EXPOSE 8443
CMD ["nginx", "-g", "daemon off;"]
