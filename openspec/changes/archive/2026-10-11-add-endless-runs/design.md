# Design

## Simulation

- **The realm chain:** `RunState` gains `depth` (realms cleared), `realmTime` (seconds in the current realm) and `gate`. `realm`, `arena` and `collision` become replaceable.
  - `realmAt(realms, startId, depth)` and `realmSeed(seed, depth)` (`sim/realms.ts`) give the realm and arena seed for any depth. Guests use the same functions.
  - Depth 0 keeps the run's seed, so solo runs start in exactly the arena they do today.
- **Realm time:** `SpawnDirector`, `RunState.scaling()` and the boss time read `realmTime`, and a new director is made per realm. `time` stays the run's clock (HUD, results).
- **Depth scaling** (`balance.endless`, fractions per realm cleared): `enemyHealth`, `enemyDamage`, `spawnRate`, `maxAlive`, `bossHealth` and `bossDamage`. It multiplies on top of the realm's own scaling and the party scale.
  - Enemy health and damage are applied in `spawnEnemy`.
  - Spawn rate and maximum alive are applied in the director. Caps still apply.
  - Boss attack damage is applied where hazards and dashes are made.
- **The gate:** when the boss dies, `killEnemy` sets `bossDefeated`. The next step adds `realm.rewards.bossGold` to the run's gold and opens `gate = { x, y, radius: 70, standing: 0, closesIn: 60, to }` at the boss's position. It emits `gateOpened` (sound and announcement) once.
  - `updateGate`: `standing` accumulates while any living god is inside and resets when nobody is. Travel happens at `standing ≥ 2` or `closesIn ≤ 0`.
- **Travel** (`RunSimulation.travel`):
  1. Collect every pickup for the first living god with the normal `collect`.
  2. Clear entities and hazards, and raise fallen gods who have not left (half health).
  3. Generate the next arena and swap realm, arena and collision.
  4. Place the party on the plaza, reset `realmTime`, the boss, the gate and the director.
  5. Emit `realmEntered { realmId, depth }`.
- **Endings:** `RunOutcome` becomes `'defeat' | 'abandoned'`. `RunResult` replaces `bossDefeated` with `realmsCleared` and adds `realmReached` (realm ID). Rewards count gold only, because boss gold is already in it. `stats.victories` keeps its save key and now counts realms cleared: an old victory is exactly one realm cleared, so no migration is needed.
- **Revive** (`sim/revive.ts`, after players move): this applies to each fallen god who has not left, in a party.
  - `revive` grows by `dt / balance.revive.seconds` while a living god is within `balance.revive.radius`, and drains at the same rate otherwise.
  - At 1 the god rises with `balance.revive.health` × max health and `balance.revive.invulnerable` seconds of invulnerability. This emits `playerRevived` and an announcement naming the reviver.
- **Debug:** a new `travel` action for tests and E2E opens and passes the gate at once.

## Presentation

- **`WorldFrame`:**
  - Players gain `revive` (0–1) and `left`. Fallen gods who are still in the run are drawn as a pale, translucent spirit with a ring that fills.
  - New `gate` field: a swirling ring with light, drawn above the light map, with the boss pointer reused in a gold colour. It also adds `depth`.
- **Scene:** on `realmEntered` the scene restarts itself (`scene.restart()`), so `create` builds the new realm through the same loading stages (`realm`, `scene`, `party`). Assets are already loaded.
  - `LocalDriver` stops stepping until the scene has loaded again (`markLoaded`).
  - `RoomHost` marks every guest unloaded until they report `loaded { depth }`.
- **Rooms:** the snapshot header carries `depth`, a `waiting` flag (the host is waiting for the party) and the gate. A guest that sees a deeper snapshot:
  1. rebuilds its realm, arena and collision from `realmAt`/`realmSeed`;
  2. drops its buffered frames and prediction;
  3. emits its own `realmEntered`, so its scene restarts the same way. The host's forwarded `realmEntered` is ignored.
  A guest's run is `started` only while frames are not `waiting`.
- **Angular:**
  - On `realmEntered`, `PlayScreen` shows `RunLoading` again for that realm, with "Realm N" and its seed, until `ready`.
  - The HUD shows the realm's name and number under the timer, and a gate banner (where it leads and the countdown).
  - The summary shows realms cleared and the realm reached. Progression says *Realms cleared*.
  - The `ending` overlay has no victory text.
- **Sound:** the existing victory sting plays when the gate opens.

## Balance (initial, to tune with autopilot runs)

`balance.endless`: enemy health +60%, enemy damage +25%, spawn rate +12%, max alive +12%, boss health +70% and boss damage +25% per realm cleared. `balance.revive`: radius 70, 3 s, half health, 2 s invulnerable. Mount Olympus `bossGold` stays at 250.

## Tests

- **Engine:** chain determinism and wrapping; gate opening, standing, timeout, and reset on leaving; travel keeps the build and gathers spoils; depth scaling; revive (progress, drain, rise, left players, defeat when all are down); a guest following a realm change; autopilot reaching realm 2.
- **App:** rewards without victory and realms-cleared statistics; summary; play screen reloading between realms.
- **E2E:** the vertical slice goes from the boss to the gate, realm 2 and death, then the summary with one realm cleared. In co-op, one player falls and the other revives them.
