# syntax=docker/dockerfile:1
# Production image: one container serves the API and the built React app on the same origin.

ARG NODE_VERSION=24

# --- Frontend: build static assets -------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Node + native build toolchain (better-sqlite3 falls back to compiling when no prebuilt matches) ---
FROM node:${NODE_VERSION}-bookworm-slim AS toolchain
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# --- Development: used by compose.dev.yaml, source is bind-mounted --------------------------------------
FROM toolchain AS dev
WORKDIR /app

# --- Backend: compile TypeScript, then keep production dependencies only ------------------------------
FROM toolchain AS api
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# --- Runtime -----------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/catalog.db \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=api --chown=node:node /app/backend/package.json ./
COPY --from=api --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=api --chown=node:node /app/backend/dist ./dist
COPY --from=web --chown=node:node /app/frontend/dist ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
