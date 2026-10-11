# Decision Log

Cross-cutting product and architecture decisions. OpenSpec changes may refine them in their `design.md`; when a decision changes, update the entry here and note the date.

Status values: **Accepted**, **Superseded**, **Deferred**.

---

## D1 — Frontend-only, static game (Accepted, 2026-10-10)

The game runs entirely in the browser and deploys as static files. No backend, REST API, database, accounts, cloud saves, networking or online multiplayer. Persistent data lives in browser storage (D8).

## D2 — Three layers: Angular, Phaser, simulation (Accepted, 2026-10-10)

| Layer | Owns | May import |
|---|---|---|
| **Angular** (`client/src/app`) | Menus, god/realm selection, HUD overlay, level-up and pause dialogs, run summary, progression, settings, saves | Engine public surface (`engine/index.ts`), content |
| **Phaser layer** (`client/src/engine/phaser`) | Frame loop, input devices, camera, drawing, particles, sound triggering | Phaser, the simulation |
| **Simulation** (`client/src/engine/*` except `phaser/`, `audio/`) | All gameplay rules and run state: movement, collision, spawning, combat, leveling, bosses, run phases | Nothing framework-specific |

Gameplay truth lives in the simulation; Phaser objects only mirror it. The simulation runs in Node tests without a browser. Enforced by ESLint `no-restricted-imports`.

*Alternative considered:* Phaser Arcade Physics bodies as gameplay state — rejected: not deterministic across frame rates, not testable without Phaser, and it would spread rules over scene code.

## D3 — Narrow Angular ↔ engine boundary (Accepted, 2026-10-10)

Angular talks to a running game only through `GameSession` (`send(command)`, `subscribe(event)`, `destroy()`), created by `createGameSession`. Only `PlayScreen` holds a session. Frequent state reaches Angular only as HUD snapshots at ≤ 10 Hz. Angular never touches Phaser objects; Phaser never touches Angular.

## D4 — Content as typed TypeScript data (Accepted, 2026-10-10)

Gods, weapons, armour, relics, skills, synergies, enemies, bosses, realms, permanent upgrades and balance live in `client/src/content/` as typed TypeScript (`engine/data/types.ts`), checked by the compiler and by `validateContent` in a unit test. The engine never imports content; it receives it through `createGameSession`. New content reuses behaviors (weapon: projectile/chain/orbit/nova/sweep/strike; enemy: chaser/ranged/charger/summoner; boss attacks: slam/boulder/charge/summon).

*Alternatives considered:* JSON files (no types, a loader, a schema validator to maintain); a root-level `content/` folder (a second TypeScript project for no gain).

## D5 — Determinism (Accepted, 2026-10-10)

All gameplay randomness comes from the seeded `Rng` (mulberry32) with forked streams per purpose (`arena`, `spawn`, `combat`, `loot`, `offers`). The simulation advances only through `step(1/60 s)`; it never reads clocks or `Math.random()` (lint-enforced). Same seed + content + inputs ⇒ same run. Cosmetic effects in the Phaser layer may use non-deterministic randomness.

## D6 — Lightweight circle collision (Accepted, 2026-10-10)

Players, enemies, projectiles and obstacles are circles. Static obstacles sit in a spatial grid; enemies are re-bucketed into a spatial hash each step for hits, separation and area queries. Revisit only with a concrete need (e.g. long walls).

## D7 — HUD split (Accepted, 2026-10-10)

Angular renders HUD bars, counters, loadout, synergies, boss bar, announcements and dialogs from throttled snapshots. Phaser renders everything tied to the world: damage numbers, elite health bars, telegraphs, the off-screen boss pointer, particles, hit flashes and camera shake.

## D8 — Versioned browser save, idempotent rewards (Accepted, 2026-10-10)

One `localStorage` key (`olympus-unbound/save`) holds a versioned `SaveData` record. Loading never throws: field-by-field validation, unknown IDs dropped, older versions migrated, unreadable data replaced by a fresh save, in-memory fallback when storage is blocked. Run rewards are applied by a pure function keyed by a unique run ID (the last 20 IDs are remembered), so a run is never rewarded twice. IndexedDB is deferred until saves outgrow `localStorage`.

## D9 — Original placeholder art and sound (Accepted, 2026-10-10)

All sprites, tiles and icons are drawn with Canvas 2D at startup (`engine/art/`); all sound effects are synthesized with Web Audio (`engine/audio/sound-player.ts`). No third-party assets, so there are no licences to track yet. Real art plugs in through the asset manifest (D12) without touching gameplay; code-drawn art remains the fallback. Any future asset must be original or properly licensed and recorded in `docs/content.md`.

## D10 — English-only UI for the vertical slice (Accepted, 2026-10-10)

UI text lives in Angular templates and display names in content. A localization framework is deferred until a second language is planned; content keeps stable IDs so that adding one later does not change saves.

## D11 — Multiplayer-ready, single-player first (Accepted, 2026-10-10)

The simulation keeps a list of players, per-player input (`PlayerInput[]` by slot) and targets the nearest living player; the camera follows the players' centre. Only one player is created and mapped in the slice. Local co-op (shared camera, second gamepad) is a later change; online play is out of scope (D1).

## D12 — Pluggable external art with a licence registry (Accepted, 2026-10-11)

Content refers to sprite keys only. `client/src/content/assets.ts` maps keys to external files (images, Phaser/TexturePacker atlases, sprite sheets, with optional idle/walk/attack/death animations); unmapped keys and files that fail to load use the code-drawn art (D9). Every external file under `public/assets` and `public/fonts` needs a manifest entry with author, source and an allowed licence (CC0, CC-BY, CC-BY-SA, OFL, or commercial with a receipt reference); `npm run assets:check` enforces it in `npm run check` and CI. Attribution licences are listed on the Settings → Credits panel. Art direction: `docs/art-direction.md`.

## D13 — Light map lighting with quality levels (Accepted, 2026-10-11)

Darkness is a screen-sized light map (ambient colour + additive radial lights) multiplied over the world each frame; lights are cheap, so the player, braziers, strikes, fire, glowing projectiles, elites and the boss all emit light. Everything that must be read in combat is drawn above the light map, and enemies get a partly transparent copy above it. Graphics quality Low/Medium/High scales lights, light-map resolution, fog, embers, bloom, colour grading and particles; it applies live and defaults from a renderer check (software rendering → Low).

*Alternative considered:* Phaser's per-sprite lighting with normal maps — rejected for now: a hard light budget, broken batching, and combining it with darkness darkened scenes twice. Shading is painted into the art instead.

## D14 — Cutscenes are in-engine scripts (Accepted, 2026-10-11)

Cutscenes are data (`content/cutscenes/*.ts`): actors, hordes, camera moves, fades, lights, strikes and captions on a timeline. A pure `CutsceneTimeline` (unit-tested) drives a Phaser `CutsceneScene` that reuses the arena, lighting and effects of a run; Angular renders captions and handles skipping. No video files. The intro plays once on first launch (remembered in save v2), is skippable at any moment and replayable from the menu.

## D15 — The cast is rendered from one source (Accepted, 2026-10-11)

Every character (gods, enemies, bosses, cutscene actors) is drawn from sprite sheets that share one source and render setup, so the cast has one look and our own Greek designs: we render them in Blender (`art/blender/`) from the Flare collection's CC-BY 3.0 Blender sources (Clint Bellanger's hero and heroine with their equipment, VWolfdog's troll and horse), with Flare's own isometric camera and sun, recoloured and extended with simple modelled parts (beards, horns, wings, a cyclops eye). Flare sheets that already fit (Skeleton Warrior, Minotaur) are used as published. Only CC-BY and CC0 sources; no share-alike. Sheets hold the right-facing row in an 8-column grid (`client/scripts/pack-sheet.mjs`); the game mirrors it. Every character must have idle, walk and death animations (unit test), every frame must exist (`npm run assets:check`), and each sheet has a stride so the walk follows movement speed.

*Alternatives considered:* existing packs (none has the Greek roster or a god in a dark pre-rendered style); mixing packs (inconsistent, rejected by the owner); recasting the roster around Flare's generic creatures (rejected: monsters must be from Greek myth); rendering CC0 low-poly 3D models (a more stylised, toy-like look).
