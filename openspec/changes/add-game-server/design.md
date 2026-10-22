# Design

## Shape (D21)

```
server/
  src/domain/          pure rules: room codes, listings, score figures and their checks, boards
  src/application/     use cases and ports: RoomRelay (rooms in memory), Leaderboards, RateLimiter; ScoreStore, Clock
  src/infrastructure/  PostgresScoreStore (pg, migrations), MemoryScoreStore (tests, local play)
  src/api/             Fastify app: HTTP routes, the /rooms WebSocket, config, main
```

- **Dependencies:** `domain` imports nothing. `application` imports `domain`. `infrastructure` imports `application` and `domain`. `api` composes everything. These are lint rules, like Slovion's architecture tests.
- **Stack:** Node.js 22 and TypeScript (ESM), Fastify 5, `ws`, `pg`. Vitest runs the tests.
- **Builds:** `tsc` builds to `dist/`, and `tsx` runs development.

## Rooms over WebSocket (`/rooms`)

A client opens one WebSocket per room role. Control messages are JSON text frames, and room messages are binary frames:

| From | Text | Meaning |
|---|---|---|
| host | `{t:"host", code, version}` | open room `code` (5 characters of the room alphabet) |
| guest | `{t:"join", code}` | join room `code` |
| host | `{t:"list", room}` / `{t:"list", room:null}` | publish or withdraw the public listing `{name, godId, realmId, players, seats}` |
| host | `{t:"drop", guest}` | close one guest's link |
| server | `{t:"hosting"}` / `{t:"joined"}` | the room is open / joined |
| server | `{t:"error", reason}` | `taken`, `not-found` or `bad-request`; the socket then closes |
| server → host | `{t:"guest", guest}` / `{t:"gone", guest}` | a guest arrived / left |

- **Binary frames:**
  - The host sends `[u32 guest][payload]`, and the guest receives `payload`.
  - A guest sends `payload`, and the host receives `[u32 guest][payload]`.
  - The server never reads `payload`.
- **Closing:** when the host's socket closes, the room and its listing go, and each guest's socket closes with code `4001` (host left). When a guest's socket closes, the host gets `gone`.
- **Keeping alive:** the server pings every 20 s and drops sockets that do not answer.
- **Limits** (spec: game-server / limits):
  - a frame of at most 256 KiB;
  - at most 600 frames in any 5 s per socket (a host with three guests sends about 260);
  - at most 16 sockets per address;
  - at most 4 guests a room. Seats are the host's to refuse; the server's bound is 8.
- **Payload codec** (`client/src/app/core/rooms/wire.ts`): `PeerLink` messages are structured values whose snapshots are `ArrayBuffer`s.
  - **Encoding:** the value is JSON in which every `ArrayBuffer` is replaced by `{"$b": index}`, followed by the buffers: `[u32 json length][json][u32 n, bytes]...`.
  - **Decoding** restores the buffers as `ArrayBuffer`s.
  - There are no dependencies, and the game's own messages only use JSON-safe values plus `ArrayBuffer`.

`ServerNetwork` (`app/core/rooms/server-network.ts`) implements `RoomNetwork`:
- **`open`** returns a `RoomListing` with a new `publish(listing)` method, and one `PeerLink` per guest.
- **`join`** returns one `PeerLink`.
- **`openRooms(version)`** fetches the list.
- **Errors:** an unreachable server is `unreachable`. The lobby protocol, version and seat checks stay in `RoomService`.

## Matchmaking

- **The list:** `GET /api/rooms?version=V` returns the public, unstarted, unfull rooms of version `V`, fullest first, at most 50.
- **Publishing:** `RoomService` publishes the listing whenever the lobby or realm changes while `isPublic` is on, and withdraws it on start or leave.
- **Quick Play** (`RoomService.quickPlay`):
  1. fetch the list;
  2. try each room in turn, moving on when the host refuses (`full`, `started`) or the room has gone;
  3. otherwise `create` a room and make it public.

## World leaderboards

`POST /api/scores` takes a run ID and the board:
- **Board:** `solo`, `allies`, `coop`, `quick`, or `daily` with a `date`.
- **Fields:** the name or names, `godId`, `realmId`, `players`, `bots`, `realmsCleared`, `timeSeconds`, `kills`, `level` and the game version.

How the server handles an entry:
- **Score:** it computes the score itself (kills + 2 × seconds + 10 × level + 1,000 × realms cleared, spec: glory).
- **Checks** (`domain/score.ts`), refused with `400 {code}` when any fails:
  - all numbers are whole and ≥ 0, and seconds are at most 6 hours;
  - 1–4 players, and fewer bots than players;
  - level at most 400;
  - kills at most 60 per second;
  - realms cleared at most seconds / 90;
  - names are 1–16 characters each (at most 4), and ids are snake_case of at most 40 characters;
  - a daily date is within one day of the server's date.
- **Duplicates:** a second post of the same run ID answers `200 {duplicate: true}`.
- **Rate limit:** 30 posts per address per hour, kept in memory and never stored.

`GET /api/leaderboards/:board?date=&god=&limit=` returns the top entries (default 10, at most 50) and leaves hidden entries out. `POST /api/admin/scores/:id/hide` needs `Authorization: Bearer <ADMIN_TOKEN>`.

**PostgreSQL** (`infrastructure/migrations/001-scores.sql`). Migrations run at startup, as in Slovion:

```sql
create table scores (
  id bigserial primary key,
  run_id text not null unique,
  board text not null,            -- solo | allies | coop | quick | daily
  board_date date,                -- daily only
  names text[] not null,
  god_id text not null,
  realm_id text not null,
  players smallint not null,
  bots smallint not null,
  realms_cleared integer not null,
  time_seconds integer not null,
  kills integer not null,
  level integer not null,
  score bigint not null,
  version text not null,
  ended_at timestamptz not null default now(),
  hidden boolean not null default false
);
create index scores_board on scores (board, board_date, score desc) where not hidden;
```

## The game

- **Address:** the build defines `OLYMPUS_SERVER` (Angular `define`):
  - `http://localhost:4330` in development and tests;
  - `--define OLYMPUS_SERVER="'https://…'"` from the repository variable `SERVER_URL` in the deploy workflow;
  - `''` otherwise, meaning no server.
- **`GameServer`** (`core/game-server.ts`) exposes `url`, `available` (configured) and `fetchJson`.
- **`WorldScores`** (`core/world-scores.ts`):
  - **Sending:** after `Progression.recordRun`, it sends the run if it entered a table (`tableOf`) or is a Daily Trial run. Co-op runs are sent by the host only, with the party's names.
  - **Offline queue:** failures go into a small queue in `localStorage` (20 runs), retried at start-up. This is not the save, so `SaveData` is unchanged.
  - **Reading:** it fetches the boards for the Hall.
- **Glory:**
  - **High scores:** a **This device | World** switch. World loads the board and filter, and shows unavailable or offline states.
  - **Trial panel:** the world's best today.
- **Co-op:**
  - **Open rooms:** a list with Refresh, Join and an empty state that offers Quick Play.
  - **Quick Play** button.
  - **Lobby:** a host's **Public** switch.
  - **No server:** co-op says the game server is unavailable instead of offering rooms.
- **PeerJS** is removed (dependency, `peer-network.ts`, lint rule). `LocalNetwork` (`?net=local`) stays for the docs capture script.

## Deployment (as Slovion, docs/hosting.md)

- **Files:** `deploy/api.Dockerfile` (multi-stage Node 22 Alpine, non-root, healthcheck), `deploy/compose.yml` (web = Caddy, api, db = PostgreSQL 18), `deploy/Caddyfile` (TLS for `SITE_ADDRESS`, proxies `/api/*`, `/rooms` and `/health`), and `deploy/bootstrap.sh`, `deploy/backup.sh` and `deploy/smoke-test.sh`, adapted from Slovion.
- **CORS:** the API allows the Pages origin (`ALLOWED_ORIGINS`) and `localhost` in development.
- **CI** adds three jobs:
  - `server`: format, lint, unit tests, and integration tests against a PostgreSQL service.
  - `stack`: builds the images, starts the stack on plain HTTP and runs the smoke test.
  - The e2e job starts the server too (memory store).
- **Deploy:** a `server` job runs before Pages when the `production` environment has `DEPLOY_HOST` set. It builds and pushes multi-arch images to ghcr.io, copies `compose.yml` and the `.env` over SSH, restarts, and waits for `https://SITE_ADDRESS/health`, rolling back on failure. The Pages build reads `vars.SERVER_URL`.

## Tests

- **Server:**
  - domain checks and the boards;
  - `RoomRelay` with fake sockets: routing, closing, limits, listings;
  - the HTTP API through `fastify.inject`;
  - the WebSocket end to end on a real port;
  - `PostgresScoreStore` against a real database when `DATABASE_URL` is set (CI).
- **Game:**
  - the codec round trip;
  - `ServerNetwork` against a fake `WebSocket`;
  - `RoomService` publishing and Quick Play with a fake network;
  - `WorldScores` sending, de-duplicating, queueing and the co-op host rule;
  - Glory's World tab.
- **E2E** (the server started by Playwright, memory store):
  - the existing co-op test through the server;
  - Quick Play pairing two players;
  - a finished run showing on the World table.
