# syntax=docker/dockerfile:1
# Một image cho cả ba lệnh (plan documents/plan-08-storage-docker.md):
#   API (mặc định):  node dist/main.js
#   worker:          node dist/worker.js
#   migration:       node dist/cli/migrate.js

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build xong thì bỏ devDependencies (nest CLI, SWC, vitest...)
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 4000
# Worker không mở cổng HTTP: chạy worker thì tắt healthcheck này (docker-compose đã tắt)
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health/live').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
