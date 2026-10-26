# Design

## Decision D23

The owner chose a dial for every player, live. D1 and D21 say the server runs no rules, so this is recorded as D23:
- **What the server does:** keeps four numbers and hands them out.
- **What the games do:** apply the numbers to the runs they start. Every rule still runs in the browser (or on a room's host).
- **Offline:** a game uses the last dial it read. Without a server it uses the default.

## Engine

- `RunRules.realmGrowth`, default 1. `RunState.depthScale()` multiplies enemy and boss health and damage by `realmGrowth ** depth`, on top of `balance.endless`.
- Health, damage and spawn rate use the existing `RunRules.enemies` multipliers, the same ones a Daily Trial's twist uses.
- `balance.endless`:
  - health growth 3.5, damage 1.65;
  - boss health 2.8, boss damage 1.65;
  - spawns per realm 0.35, room per realm 0.3.

## Server

- **Domain:** `domain/difficulty.ts` holds `DifficultyDial`, the defaults, each value's limits and `checkDial`. Values are rounded to hundredths.
- **Application:** `application/difficulty.ts` (`Difficulty`) reads the dial (the default until set) and sets it after checking. The `DifficultyStore` port.
- **Infrastructure:**
  - `MemoryDifficultyStore` for tests and local play;
  - the PostgreSQL store keeps it in a new `settings` table (migration `002-settings`, key `difficulty`, a JSON value).
- **API:**
  - `GET /api/difficulty`, public, no-cache;
  - `POST /api/admin/difficulty` with `Authorization: Bearer <ADMIN_TOKEN>`. 401 for a wrong token, 400 for a bad dial, and no route at all without `ADMIN_TOKEN`, like hiding scores.
- The deploy smoke test reads the dial.

## Client

- `core/difficulty.ts`:
  - **`Difficulty` service:** `current` comes from the `localStorage` cache, else the default. `refresh()` reads the server when the main menu opens. `save()` sends the admin's dial with the token.
  - **`withDial(config, dial)`:** multiplies the run's `rules.enemies` and `rules.realmGrowth`. The default dial returns the config unchanged.
- **Where it applies:**
  - the play screen applies it to every run started here (solo, local, Daily Trial, challenge);
  - the room service applies it to the host's config;
  - guests run no simulation (D16).
- **Admin page:** "Difficulty for every player": four number fields, a password field for the token, *Save for everyone* and *Back to 1*, and a status line.
- `GameServer.post` takes extra headers.

## Tests

- **Engine:** realm growth compounds per realm and leaves the first realm alone.
- **Server:**
  - `GET` defaults; only the token sets; out-of-range is refused and changes nothing; no route without a token;
  - PostgreSQL keeps the last dial.
- **Client:**
  - `parseDial` limits;
  - `withDial` leaves the default alone and compounds with a twist;
  - refresh, cache and offline fallback.
