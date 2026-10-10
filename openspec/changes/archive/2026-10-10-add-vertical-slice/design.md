# Design

## Context

Empty repository (README only). Reference architecture: the Slovion repository (Angular app + framework-free TypeScript engine in one `client/` workspace, OpenSpec `spec-driven` changes, Vitest + Playwright, ESLint import boundaries, GitHub Actions). Its backend, content domain and canvas renderer are not reused. Motivation and scope: see proposal.md. Requirements: the ten spec deltas.

Relies on decisions D1–D11 in `docs/decisions.md` (recorded by this change).

## Goals / Non-Goals

**Goals:**
- A complete run, end to end, in a static browser build.
- Gameplay rules runnable and testable in Node without Phaser, a canvas or a DOM.
- Content additions (weapon, enemy, relic, synergy, realm) as data plus, at most, one new reusable behavior.
- Boundaries that later changes extend: Angular ↔ engine session, simulation ↔ Phaser view, content ↔ engine types, save model versions.

**Non-Goals:**
- An ECS, object pooling of simulation entities, Web Workers, physics engines.
- Generic tooling (level editor, content pipeline, asset loader for external files).

## Decisions

### 1. Three layers inside `client/`

```text
client/src/
├── app/        Angular: routes, screens, HUD overlay, save + progression services        (D2)
├── engine/     gameplay
│   ├── index.ts      public surface: createGameSession, types, validateContent
│   ├── core/         Rng, vectors, stats/modifiers, spatial grid                         (pure)
│   ├── data/         content schema (types) + ContentIndex + validation                  (pure)
│   ├── maps/         arena generation                                                    (pure)
│   ├── sim/          RunSimulation and its systems: players, enemies, spawning, weapons,
│   │                 combat, pickups, progression, bosses, synergies                     (pure)
│   ├── phaser/       Phaser game, scenes, entity views, effects, input                   (Phaser)
│   └── audio/        synthesized sound cues (Web Audio)
└── content/    typed data: gods, weapons, armour, relics, skills, enemies, bosses,
                realms, synergies, permanent upgrades                                     (D4)
```

Considered: a root-level `content/` folder (as in Slovion) — rejected because Slovion's content is served by an API; here content is compiled into the bundle, and one `src/` keeps one TypeScript project, one lint config and one test runner.

Import rules (ESLint `no-restricted-imports`):
- `engine/**` must not import `@angular/*`, `rxjs`, `app/**` or `content/**`.
- Only `engine/phaser/**` may import `phaser`.
- `app/**` may import the engine only through `engine/index.ts` (no deep imports).
- `content/**` may import only engine types.

### 2. Simulation owns gameplay state; Phaser hosts and draws it (D2, D6)

`RunSimulation` (pure TypeScript) holds the run state: players, enemies, projectiles, hostile projectiles, hazards, pickups, run phase, timer, statistics. `step(dt, inputs)` advances it by a fixed 1/60 s and returns nothing; it appends `SimEvent`s (hits, kills, pickups, level-ups, boss attacks, run end) to an event buffer the caller drains.

The Phaser `ArenaScene` owns the frame loop: it reads input devices into `PlayerInput`, accumulates real time, calls `step` in fixed increments (catch-up capped at 250 ms), then syncs sprites to entity positions (interpolated by the leftover fraction), and turns drained events into particles, flashes, damage numbers, camera shake and sounds. Phaser objects never hold gameplay truth.

Collision uses circles: obstacles are static circles in a uniform grid; enemies are re-bucketed into a spatial hash once per step for projectile hits, separation and area queries. Arcade Physics was considered and rejected: its bodies would become the state, it is not deterministic across frame rates, and it cannot run in tests without Phaser.

Systems are modules of functions operating on the simulation (`movePlayers`, `updateEnemies`, `updateWeapons`, …) called in a fixed order by `RunSimulation.step`; the class itself only orchestrates.

### 3. Reusable behaviors, data-driven content (D4)

- **Weapons:** `WeaponDefinition { behavior, element, base stats, per-level deltas, effects }`. Behaviors in a registry: `projectile`, `chain`, `orbit`, `nova`, `sweep`, `strike`. Effective stats = base + level deltas, then scaled by player stats (`resolveWeaponStats`, pure). God abilities reuse the same behaviors with their own stats, fired manually.
- **Enemies:** `EnemyDefinition { stats, behavior: { type, params } }`; behaviors `chaser`, `ranged`, `charger`, `summoner` (swarm/fast/tank are parameterisations of `chaser`). Bosses use the `boss` behavior driven by `BossDefinition.phases[].attacks[]` (`slam`, `boulder`, `charge`, `summon`).
- **Stats:** one `StatBlock`; every source (god, permanent upgrades, armour level, relics, skills, synergies) contributes `Modifier { stat, flat | percent }`; `final = (base + Σflat) × (1 + Σpercent)`, recomputed only when the loadout changes.
- **Damage:** `resolveHit(source, attackerStats, target, rng)` is the only place damage is computed (spec: combat / one damage pipeline). Status effects are a registry keyed by id (`burn`, `shock`, `stun`, `slow`).
- **Synergies:** `requirements[]` of `{ weapon | relic | armour | skill (min level) | element count }`, `modifiers[]`; evaluated after every loadout change.
- **Realms:** map generation config, enemy pool, spawn timeline, difficulty scaling, boss id, rewards.

Content is TypeScript (`satisfies` typed definitions) rather than JSON: type checking for free, comments for balance notes, no loader. `validateContent` checks cross-references (unknown IDs, duplicate IDs, empty pools, non-increasing timelines) and runs in a unit test.

### 4. Angular ↔ engine boundary (D3)

```ts
createGameSession(options: { parent, content, run: RunConfig, settings, debug }): Promise<GameSession>
interface GameSession { send(command: GameCommand): void; subscribe(listener): Unsubscribe; destroy(): void }
GameCommand = pause | resume | chooseUpgrade(index) | abandon | updateSettings | debug(action)
GameEvent   = ready | hud(HudSnapshot) | choice(UpgradeChoice) | choiceResolved | paused | resumed
            | announcement(text, kind) | uiInput(action) | runEnded(RunResult)
```

- `createGameSession` dynamically imports the Phaser layer, so Phaser (≈1 MB) is only loaded on the play route.
- `HudSnapshot` is emitted at most 10 times per second (D7); Angular writes it into a signal. No per-frame Angular work; the app is zoneless.
- The `PlayScreen` component owns the session; nothing else in Angular sees it. Overlays (HUD, level-up, pause) receive plain data and emit intents back to `PlayScreen`.
- Keyboard input for menus/dialogs is handled by Angular; gamepad input during choices and pause is read by Phaser and forwarded as `uiInput` events so dialogs can be driven from a controller.
- `debug` commands (grant XP, skip time, damage boss, kill player) are accepted only when the session was created with `debug: true`, which the app sets only in dev mode with `?debug` — used by Playwright.

### 5. State ownership and game states

| State | Owner |
|---|---|
| Selected god/realm/seed, last run result | Angular `RunSetup` / `RunHistory` services (memory) |
| Save: gold, permanent upgrades, codex, statistics, settings | Angular `SaveStore` + `Progression` (localStorage) |
| Run phase, entities, timer, loadout, stats | `RunSimulation` |
| Sprites, particles, camera, input devices | Phaser layer |

Application states are routes: `/` menu, `/gods`, `/realms`, `/play`, `/summary`, `/progression`, `/settings`. Run phases live in the simulation: `playing → choosing → playing`, `playing|choosing → paused → (previous)`, `* → ended` (terminal). Transitions go through one guarded function; invalid ones are ignored. The outcome is fixed on the first `end` call; `runEnded` is emitted once (spec: run-outcome).

### 6. Determinism (D5)

`Rng` = mulberry32 seeded through a string/number hash; `rng.fork(label)` derives independent streams (`map`, `spawn`, `combat`, `loot`, `offers`), so changing combat rolls does not reshuffle the map. The simulation never reads wall-clock time or `Math.random()` (lint rule `no-restricted-properties` for `Math.random` in `engine/`, except the Phaser layer's purely cosmetic particles via Phaser's own RNG). With the same seed, content and input sequence, a run replays identically — the basis for headless run tests (an autopilot plays several simulated minutes in milliseconds).

### 7. Arena generation

Pure `generateArena(realm.map, seed) → ArenaData { width, height, tileSize, terrain: Uint8Array, obstacles[], decorations[], spawn, bossArena }`:
1. Terrain from two octaves of seeded value noise, thresholded into the realm's terrain types; spawn plaza and boss arena are stamped as marble.
2. Points of interest placed with rejection sampling at minimum distances: temple ruins (rings of columns with gaps), statue pairs, olive groves (clusters).
3. Scattered obstacles by Poisson-like rejection sampling, honouring minimum gaps, clear zones and the density cap.
4. Decorations (non-colliding) chosen per terrain type by the realm's decoration rules.
5. A cliff band around the edge is impassable (playable bounds inset).

The Phaser layer renders terrain as a tilemap from generated tile textures and objects as y-sorted images.

### 8. HUD split (D7)

Angular: HUD bars and counters, loadout icons, synergies, boss bar, announcements, level-up, pause, summary — all low-frequency. Phaser: entities, damage numbers, elite health bars, telegraphs, off-screen boss pointer, hit flashes, particles, camera shake.

### 9. Persistence (D8)

`SaveData v1 { version, gold, permanentUpgrades: Record<id, level>, discovered: { weapons, armour, relics }, stats: { runs, victories, kills, bestTimeSeconds }, settings, processedRunIds (last 20) }` under one `localStorage` key. `parseSave(raw, content)` validates field by field, dropping unknown IDs and defaulting invalid values; a `migrations` table upgrades older versions. `SaveStore` falls back to memory when storage throws. `applyRunResult(save, result, content)` is pure and returns the save unchanged when `result.runId` was already processed.

### 10. Audio and art (D9)

Sounds are synthesized with Web Audio (short oscillator/noise envelopes) behind `SoundPlayer.play(cue)`, with per-cue rate limiting; replacing them with files later changes only the audio module. Sprites and tiles are drawn at startup into canvas textures (original placeholder art: distinct silhouettes and colours per enemy; warm gold/white player vs. cold/red enemies). No external assets, so no licences to track yet.

### 11. Testing

- Vitest (Angular `unit-test` builder, jsdom): engine pure modules (Rng, stats, damage, status, weapons, spawning, leveling/offers, synergies, map generation, boss attacks, run phases), a headless full-run test (autopilot reaching the boss and both outcomes), content validation, save parsing/migration/rewards, Angular components with a stubbed session factory.
- Playwright (Chromium, `ng serve`): menu → Zeus → Olympus → play; level-up via debug XP and choosing with the keyboard; skip to boss; defeat boss → summary → menu with gold; defeat path; reload keeps gold.
- CI: format, lint, unit tests, build, E2E.

### 12. Performance targets

Desktop Chrome, 1080p: 60 fps with 300 enemies, 150 player projectiles and 300 pickups. Measures: global caps (400 enemies, 300 projectiles, 400 pickups with XP merging), spatial hash queries, in-place compaction of dead entities, sprite reuse in views (pooled by texture), damage numbers capped at 60, separation limited to near neighbours. Verified with a debug stress command and Chrome's FPS meter during playtest.

## Implementation notes (2026-10-10)

Deviations from the plan above, all within the specs:

- The engine's schema folder is `engine/data/` (not `engine/content/`), so the lint rule "the engine never imports `content/`" is unambiguous.
- Terrain is drawn as one smoothed image (one pixel per tile, scaled up) plus a tiled grain overlay and round marble floors, instead of a Phaser tilemap: the tilemap showed a hard tile grid. `ArenaData` gained `plazas` for this.
- `GameSession.inspect()` (debug sessions only) exposes phase, time, player position and enemy count for Playwright. The debug flag (`?debug`, development builds only) is remembered for the browser tab's session.
- The player is drawn above enemies with a gold ground ring (readability: Zeus was lost inside large hordes).
- Level-up choices carry the level they were earned at, so queued level-ups read "Level 2, 3, …".
- A repeated `runEnded` is ignored by the play screen so the summary keeps the first (real) rewards.

## Playtest and performance findings (2026-10-10)

- **Browser playtest** (dev server, 1280×720): menu → Zeus → Mount Olympus → movement (213 units in 1.02 s at speed 210) → horde combat → level-up by keyboard and by mouse → queued level-ups → elite announcement at 02:00 → Storm synergy → Cyclops at 07:00 with boss bar, off-screen pointer, slam/boulder/charge telegraphs and the enraged phase → victory → summary (+7 run gold +250 bonus) → permanent upgrade bought → reload keeps it. A defeat run (idle player) ended at 00:21 and showed the summary. No console errors.
- **Owner playtest**: the project owner played full unassisted runs in the browser and approved the slice (2026-10-10).
- **Balance** (headless kiting bot, no upgrades, 6 seeds): about half the runs win; deaths cluster at 04:00–05:00; boss fights 1.5–2.5 min. Tuning applied is listed in `docs/content.md` (balance notes).
- **Performance**: 331 enemies at 1920×1080 on a GTX 1660 in Chromium: 85 fps, worst frame 12 ms; simulation step 0.8 ms at ~300 enemies (Node).

## Risks / Trade-offs

- [Phaser 4 is new; APIs differ from v3] → Use only core APIs (scenes, images, tilemaps from data, canvas textures, particles, cameras, input); check against bundled `phaser/skills` and types.
- [Custom collision is simpler than a physics engine] → Circles only; good enough for top-down horde combat; revisit only with a concrete need.
- [Balance is guesswork before playtesting] → All numbers in `content/`; playtest and tune in this change; record the tuning pass in tasks.
- [Headless runs can hide rendering bugs] → Playwright covers the real browser path, plus manual playtest screenshots.
- [Synthesized audio may sound basic] → Acceptable for the slice; abstraction allows replacement.

## Migration Plan

None — first change. Deployment is any static host serving `client/dist/olympus-unbound/browser`.
