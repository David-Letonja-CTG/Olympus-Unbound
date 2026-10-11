# Architecture

How OLYMPUS UNBOUND is put together. Binding decisions are in [decisions.md](decisions.md) (D1–D11); this page explains how they fit.

## Lineage: what came from Slovion

The structure follows the [Slovion](https://github.com/David-Letonja-CTG/Slovion) repository; its domain, backend and renderer were not reused.

| Slovion concept | OLYMPUS UNBOUND equivalent |
|---|---|
| Angular application (`client/src/app`) | Angular menus, HUD overlay, dialogs, progression, settings, saves |
| Framework-free TypeScript engine (`client/src/engine`) | Phaser-free simulation core + a Phaser layer (`engine/phaser`) for loop, input and drawing |
| Engine ↔ UI boundary (`GameCanvas` + callbacks) | `GameSession`: commands in, events out, ≤ 10 Hz HUD snapshots (D3) |
| ESLint import boundaries (no Angular in the engine) | Same, plus "only `engine/phaser` imports Phaser", "no `Math.random` in the simulation", "Angular uses only `engine/index.ts`" |
| Injectable randomness and clocks | Seeded `Rng` streams, fixed 1/60 s steps (D5) |
| Content as versioned files in `content/` | Typed TypeScript content in `client/src/content/` (D4) |
| OpenSpec `spec-driven` workflow, `/opsx:*` commands | Same workflow and tooling |
| `docs/` (vision, architecture, gameplay, content, decisions) | Same set, plus `systems.md` |
| Vitest unit tests, Playwright E2E, GitHub Actions | Same |
| *Not reused:* .NET backend, PostgreSQL, REST, save tokens, Tiled maps, species/quests/journal, Transloco | Frontend-only (D1), procedural arenas, English-only for now (D10) |

## Overview

```mermaid
flowchart LR
  subgraph Angular["Angular app (client/src/app)"]
    Menus["Menus & selection"]
    Play["PlayScreen<br/>HUD · level-up · pause"]
    Prog["Progression service<br/>save · rewards · settings"]
  end
  subgraph Engine["Engine (client/src/engine)"]
    Session["GameSession<br/>(session.ts)"]
    subgraph PhaserLayer["Phaser layer (engine/phaser)"]
      Scene["ArenaScene<br/>loop · input · camera"]
      Views["WorldView · Effects"]
    end
    Sim["RunSimulation<br/>(pure TypeScript)"]
  end
  Content[("Typed content<br/>client/src/content")]
  Storage[("localStorage<br/>versioned save")]
  Menus --> Play
  Play -- "commands" --> Session
  Session -- "events · HUD ≤10 Hz" --> Play
  Session --> Scene
  Scene -- "step(1/60, inputs)" --> Sim
  Sim -- "SimEvents" --> Scene
  Scene --> Views
  Content --> Play
  Content --> Menus
  Play -- "run result" --> Prog
  Prog <--> Storage
```

## Repository layout

```text
client/
  src/app/                 Angular
    core/                  Progression, RunSetup, SaveStore + save model/rewards, injection tokens, debug flag
    features/              main-menu, god-selection, realm-selection, game (play screen, HUD, dialogs),
                           run-summary, progression, settings
    shared/                item icons, settings controls
  src/engine/              gameplay
    index.ts               public surface — the only engine import Angular and content may use
    session.ts             GameSession contract + createGameSession (lazy-loads Phaser)
    core/                  Rng, vectors, stats/modifiers, spatial hash, collision
    data/                  content schema (types, asset manifest, cutscenes) + ContentIndex + validateContent
    maps/                  value noise + generateArena
    sim/                   RunSimulation, RunState, players, pickups, types/events
    combat/                damage pipeline, status effects
    weapons/               behaviors, stat resolution, weapon/projectile systems
    enemies/               behaviors, enemy system
    bosses/                boss behavior, telegraphed hazards
    spawning/              SpawnDirector
    progression/           loadout, stat refresh, synergies, level-up offers
    art/                   code-drawn art (Canvas 2D): canvas helpers, characters, world objects, icons
    cutscene/              CutsceneTimeline (pure timing of cutscenes)
    audio/                 synthesized sound cues (Web Audio)
    phaser/                Phaser games: ArenaScene, CutsceneScene, WorldView, Effects, LightMap + Atmosphere,
                           asset loading + SpriteResolver, InputReader, textures
    testing/               fixtures and autopilot for engine tests
  src/content/             gods, weapons, items (armour/relics/skills/synergies), enemies (+ bosses), realms, balance,
                           assets (external art manifest), cutscenes
  public/ui/               SVG ornaments for the UI (frame, divider, stone grain)
  public/assets/           external art packs (licensed, see docs/content.md)
  scripts/check-assets.mjs licence check for external files
  e2e/                     Playwright tests
docs/  openspec/  .github/workflows/  .claude/
```

## The session boundary

```ts
createGameSession({ parent, content, run: { runId, godId, realmId, seed, modifiers }, settings, debug })
  → Promise<GameSession>

GameSession.send(command)       pause | resume | chooseUpgrade(choiceId, index) | abandon | updateSettings | debug
GameSession.subscribe(listener) ready | hud | choice | choiceResolved | paused | resumed | announcement | uiInput | runEnded
GameSession.inspect()           debug sessions only (tests)
GameSession.destroy()

createCutsceneSession({ parent, content, cutsceneId, settings }) → Promise<CutsceneSession>
CutsceneSession.subscribe(listener)  loadProgress | ready | captions | uiInput | ended
CutsceneSession.skip() / destroy()
```

`createGameSession` dynamically imports the Phaser layer, so the ~1.45 MB Phaser chunk loads only when a run starts (menus: ~310 kB initial). `debug` is true only in development builds opened with `?debug` (used by Playwright).

## A frame

```mermaid
sequenceDiagram
  participant P as Phaser loop
  participant S as ArenaScene
  participant R as RunSimulation
  participant A as Angular PlayScreen
  P->>S: update(time, delta)
  S->>S: read keyboard/gamepad → PlayerInput
  loop while accumulator ≥ 1/60 s (≤ 250 ms per frame)
    S->>R: step(1/60, [input])
  end
  S->>R: events()
  S->>S: effects + sounds per event
  S->>A: choice / announcement / runEnded (via session)
  S->>S: WorldView.sync (interpolated), camera, telegraphs
  S-->>A: hud snapshot (every 100 ms)
```

## Presentation layers (D12, D13)

Drawing order in a run, back to front:

```text
ground image + grain → marble plazas → cliff shadow → decorations → shadows → elite/boss auras
→ y-sorted world (obstacles, enemies) → fog → LIGHT MAP (multiply) → embers
→ readability layer: enemy copies, telegraphs, pickups, player ring → player → projectiles → effects
→ bars, damage numbers, boss pointer → vignette          (Angular HUD above the canvas)
```

- **Assets:** each scene's `preload` queues the manifest's files and reports `loadProgress`; `SpriteResolver` answers per sprite key with the pack frame/animation or the code-drawn texture (2× resolution, shown at half scale).
- **Light map:** a screen-sized dynamic texture cleared to the realm's ambient colour; every light this frame (player, braziers, strikes, chains, novas, fire, projectiles, elites, boss, chests) is stamped additively, nearest first, up to the quality budget; the result is multiplied over the world. The view rectangle is computed from the camera target (`viewAround`) so the light map never lags a frame.
- **Atmosphere:** two drifting fog layers, embers around the camera, a vignette, and camera filters (colour grade, bloom with a high threshold) switched by quality.
- **Quality profiles** (`phaser/atmosphere.ts`): Low 16 lights at ¼ resolution, no fog/embers/bloom/grade; Medium 48 lights; High 96 lights at ½ resolution with denser fog and embers.

## Loading a run

`ArenaScene` loads in stages and emits `loadProgress` with a `stage`: `art` (Phaser's loader, the asset manifest), `realm` (`GroundBuilder` paints the arena's ground a few rows per frame within a 10 ms budget — base colours from the pure `GroundPainter` in `engine/maps/ground.ts`, then grass, roads and shading on a canvas) and `scene` (the `WorldView`, light map and atmosphere are built). Only then does it emit `ready` and start stepping the simulation, so a run starts at 00:00. `PlayScreen` shows `RunLoading` (realm, party, stage, tips) until `ready` and fades it out. The ground's resolution follows the graphics quality (`GROUND_SCALE`).

## Cutscenes (D14)

`CutsceneTimeline` answers which cues fire between two times, the eased camera and fade at a time, and the active captions. `CutsceneScene` builds the realm's arena from the scene's seed and plays cues (spawn, move, remove, horde, strike, light, burst, shake, sound) with the same `WorldView`, `LightMap`, `Atmosphere` and `Effects` as a run; no simulation runs. `IntroScreen` (route `/intro`) shows loading, captions and the skip prompt; the root route's guard sends a player who has not seen the intro there once per page load.

## Simulation step order

`RunSimulation.step` does nothing unless the phase is `playing`. Then, in order: players (movement, collision, regen, ability) → spawn director → enemies (status, behavior or boss, knockback, separation, world collision, contact damage; grid rebuilt) → weapons → projectiles → enemy projectiles → hazards → pickups → remove dead → outcome (**victory before defeat**) → open a pending level-up/chest choice.

## State ownership and phases

| State | Owner |
|---|---|
| Selected god, realm, seed; last run result and rewards | Angular `RunSetup` (memory) |
| Gold, permanent upgrades, codex, statistics, settings (incl. graphics quality), intro seen | Angular `Progression` over `SaveStore` (localStorage) |
| Run phase, timer, entities, loadout, stats, XP, run gold | `RunSimulation` |
| Sprites, particles, camera, input devices, sounds | Phaser layer |

Application states are routes (`/`, `/gods`, `/realms`, `/play`, `/summary`, `/progression`, `/settings`); guards keep `/play` and `/summary` unreachable without a setup or a result. Run phases: `playing ⇄ choosing`, `playing|choosing → paused → back`, `* → ended` (terminal, entered once).

## Data flow of a run's end

`RunSimulation.end(outcome)` (once) → `runEnded` event → `PlayScreen` ignores repeats → `Progression.recordRun(result)` → pure `applyRunResult` (skips a run ID already processed) → save written → summary.

## Testing

| Level | Tool | What |
|---|---|---|
| Simulation | Vitest (`ng test`), Node + jsdom | RNG, stats, collision, arena generation, damage/status, every weapon and enemy behavior, spawning, offers, synergies, boss attacks, run phases, deterministic replays, headless autopilot runs to victory and defeat, content validation |
| Angular | Vitest + TestBed, stubbed `GAME_SESSION_FACTORY` and storage | save parsing/migration, rewards, progression, screens, guards, PlayScreen ↔ session |
| Browser | Playwright (Chromium, dev server, `?debug`; `E2E_NO_GPU=1` for software rendering) | the intro (first launch, skip, no replay, replay from the menu), the full vertical-slice path, defeat, pause/abandon, buying upgrades and persistence |
| Assets | `npm run assets:check` | every external file has an allowed licence entry, every entry has a file |

## Performance

Targets: 60 fps at 1080p with ~300 enemies at High. Measured 2026-10-11 (GTX 1660, Chromium, 1920×1080, 331 enemies, lighting and atmosphere on): **High 79 fps, worst frame 14 ms; Medium 78 fps**. Software rendering (no GPU, Low, 960×540, 331 enemies): ~9 fps with the simulation still in real time — enough for CI, not a player target. Simulation step **0.8 ms** with ~300 enemies (Node). Means: global caps (400 enemies, 300 projectiles, 400 pickups with XP merging), spatial hashing, in-place compaction of dead entities, sprite pooling by entity in `WorldView`, a budgeted light map, ≤ 60 pooled damage numbers, separation limited to 4 neighbours, one Graphics object per effect layer, HUD at 10 Hz.
