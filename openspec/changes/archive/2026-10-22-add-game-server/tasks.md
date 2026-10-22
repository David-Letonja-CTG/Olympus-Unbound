# Tasks

## 1. Server
- [x] 1.1 `server/` package (TypeScript ESM, Fastify, ws, pg, Vitest, ESLint layer rules, Prettier)
- [x] 1.2 Domain: room codes, listings, score figures and checks, boards; tests
- [x] 1.3 Application: `RoomRelay`, `Leaderboards`, `RateLimiter`, ports; tests
- [x] 1.4 Infrastructure: `PostgresScoreStore` with migrations, `MemoryScoreStore`; tests (Postgres when `DATABASE_URL`)
- [x] 1.5 API: health, rooms list, scores, leaderboards, admin hide, `/rooms` WebSocket, CORS, config, main; tests

## 2. Game
- [x] 2.1 `OLYMPUS_SERVER` define, `GameServer`
- [x] 2.2 Wire codec, `ServerNetwork`, PeerJS removed; tests
- [x] 2.3 `RoomService`: public lobby, publishing, open rooms, Quick Play; tests
- [x] 2.4 Co-op screen: Quick Play, open rooms, Public switch, server unavailable; tests
- [x] 2.5 `WorldScores`: sending, queue, co-op host rule; Glory World tab and trial best; tests

## 3. Deploy and docs
- [x] 3.1 `deploy/` (Dockerfile, compose, Caddyfile, bootstrap, backup, smoke test)
- [x] 3.2 CI jobs (server, stack, e2e with server); deploy workflow (server job, `SERVER_URL`)
- [x] 3.3 Docs: architecture, hosting, systems, gameplay, README, CLAUDE.md; decisions
- [x] 3.4 E2E: co-op through the server, Quick Play, World table; `npm run check`, server checks, `npm run e2e`, stack smoke test
