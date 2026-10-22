## Why

The owner wants everything on the VM: the game itself should no longer live on GitHub Pages while its server lives elsewhere. One address for the game and its server also removes cross-site calls, and lets the server accept only its own site (D21).

## What Changes

- The game server serves the game's files too: the game, its deep links and the shared addresses' own pages, with caching fit for updates (D18).
- The game is built to reach its server at its own address.
- Releases deploy only to the VM; GitHub Pages no longer hosts the game and is switched off. No forwarding from the former address: nobody plays there yet, and its saves stay with that address.
- The server lets in clients that send no browser origin (tools, the deploy's smoke test), and still refuses other sites.
- The deploy reads the host stack's names from GitHub settings; nothing in the repository names another project.

## Capabilities

### New Capabilities

### Modified Capabilities

- `game-server`: the server also serves the game, at one address with its API and rooms.
- `installable-app`: installs from the game's address; still relative, so other hosts and sub-paths work.

## Impact

- `server/src/api/client-files.ts` (new), `app.ts`, `main.ts`, `rooms-socket.ts`; `@fastify/static`.
- `client/src/app/core/game-server.ts` (`same-origin`), `client/src/index.html` (link preview address).
- `deploy/` (image with the game, compose, install, Caddy site, smoke test, stand-in host), `.github/workflows/` (no Pages), docs (hosting, D1, D18, D21, architecture, README).
