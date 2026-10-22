# syntax=docker/dockerfile:1
# The game server with the game itself (D21, docs/hosting.md): one container serves the game, its rooms and its
# boards at one address. Build from the repository root:
#   docker buildx build -f deploy/api.Dockerfile --platform linux/arm64,linux/amd64 .
# The game and the server's TypeScript build once on the build machine; the runtime stage only installs pure
# JavaScript dependencies, so arm64 builds on an amd64 runner without CPU emulation.

# The game: built to find its server wherever it was loaded from.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS client
WORKDIR /client
ENV NG_CLI_ANALYTICS=false PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npx ng build --define "OLYMPUS_SERVER='same-origin'" && node scripts/entry-pages.mjs

FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /server
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0 CLIENT_DIR=/app/client
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /server/dist ./dist
COPY --from=client /client/dist/olympus-unbound/browser ./client
EXPOSE 8080
USER node
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/api/main.js"]
