## 1. Server

- [x] 1.1 Serve the built game from `CLIENT_DIR`: pages, shared pages, deep links, 404 for missing files, caching
- [x] 1.2 Let in sockets without an origin; still refuse other sites
- [x] 1.3 Tests for both

## 2. Game

- [x] 2.1 `same-origin` server setting, with a test
- [x] 2.2 Link preview names the game's address

## 3. Deploy

- [x] 3.1 Image builds the game and the server; Caddy site proxies everything
- [x] 3.2 Host stack names from GitHub settings; stand-in `host` stack for CI
- [x] 3.3 Deploy workflow: VM only, no Pages
- [x] 3.4 Smoke test checks the game, deep links, caching and 404s, and hides its own board entry

## 4. Docs

- [x] 4.1 hosting.md, D1, D18, D21, architecture, README, CLAUDE.md
