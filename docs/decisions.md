# Decision Log

Cross-cutting product and architecture decisions. OpenSpec changes may refine them in their `design.md`; when a decision changes, update the entry here and note the date.

Status values: **Accepted**, **Superseded**, **Deferred**.

---

## D1 — The game runs in the browser; a small server serves the shared parts (Accepted, 2026-10-10; revised 2026-10-11 for rooms; revised 2026-10-22 for the game server)

The game runs entirely in the browser and is built as static files. Saves, progression and every rule of a run stay in the browser (D8): there are no accounts and no cloud saves. *Revised 2026-10-11:* co-op rooms connected browsers directly (D16).

*Revised 2026-10-22:* the owner chose a server of the game's own (D21). Peer-to-peer rooms failed between devices on many home networks, and the owner wanted world leaderboards and matchmaking.
- **What it does:** carries room traffic, lists public rooms and keeps world high scores.
- **What it never does:** run game rules or hold saves.
- **Where the game lives:** the same server serves the game's files, at one address (D21).
- **Without it:** the game plays as before when the server is unreachable or a build has none (the release zip). Solo and local play, saves and the Hall's own tables need no connection; co-op and the world boards say they need the server.

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

*Amended 2026-10-12:* the owner found the synthesized sounds unlike what they depict ("Zeus's storm should be the actual storm sound"), so the cues are now made of CC0 recordings (Kenney's impact and RPG packs, lentikula's spell impacts, a thunder recording), listed as `sound` files in the asset manifest with their licences (D12) and layered in `engine/audio/recorded.ts`. The synthesized voices remain for interface sounds and as the fallback while files load.

## D10 — English-only UI for the vertical slice (Accepted, 2026-10-10)

UI text lives in Angular templates and display names in content. A localization framework is deferred until a second language is planned; content keeps stable IDs so that adding one later does not change saves.

## D11 — Multiplayer-ready, single-player first (Accepted, 2026-10-10; revised 2026-10-11)

The simulation keeps a list of players, per-player input (`PlayerInput[]` by slot) and targets the nearest living player. *Revised 2026-10-11:* a run holds a party of 1–4 players, each with their own god, upgrades, choices, HUD and result, and difficulty scales per player (spec: co-op); parties play online in rooms (D16), each camera following its own god. Local co-op (shared screen, second gamepad) is a later change.

## D12 — Pluggable external art with a licence registry (Accepted, 2026-10-11)

Content refers to sprite keys only. `client/src/content/assets.ts` maps keys to external files (images, Phaser/TexturePacker atlases, sprite sheets, with optional idle/walk/attack/death animations); unmapped keys and files that fail to load use the code-drawn art (D9). Every external file under `public/assets` and `public/fonts` needs a manifest entry with author, source and an allowed licence (CC0, CC-BY, CC-BY-SA, OFL, or commercial with a receipt reference); `npm run assets:check` enforces it in `npm run check` and CI. Attribution licences are listed in the credits, a dialog opened from Settings → Credits. Art direction: `docs/art-direction.md`.

## D13 — Light map lighting with quality levels (Accepted, 2026-10-11)

Darkness is a screen-sized light map (ambient colour + additive radial lights) multiplied over the world each frame; lights are cheap, so the player, braziers, strikes, fire, glowing projectiles, elites and the boss all emit light. Everything that must be read in combat is drawn above the light map, and enemies get a partly transparent copy above it. Graphics quality Low/Medium/High scales lights, light-map resolution, fog, embers, bloom, colour grading and particles; it applies live and defaults from a renderer check (software rendering → Low).

*Alternative considered:* Phaser's per-sprite lighting with normal maps — rejected for now: a hard light budget, broken batching, and combining it with darkness darkened scenes twice. Shading is painted into the art instead.

*Amended 2026-10-20 (phones, `add-phone-play`):* on Low, each enemy is drawn once, above the light map in y order and with a night tint, instead of lit below it with a copy above. That halves a horde's sprites, and readability is unchanged. Ordinary enemies lose their ground shadows on Low. Touch devices default to Low.

## D14 — Cutscenes are in-engine scripts (Accepted, 2026-10-11)

Cutscenes are data (`content/cutscenes/*.ts`): actors, hordes, camera moves, fades, lights, strikes and captions on a timeline. A pure `CutsceneTimeline` (unit-tested) drives a Phaser `CutsceneScene` that reuses the arena, lighting and effects of a run; Angular renders captions and handles skipping. No video files. The intro plays once on first launch (remembered in save v2), is skippable at any moment and replayable from the menu.

## D15 — The cast is rendered from one source (Accepted, 2026-10-11)

Every character (gods, enemies, bosses, cutscene actors) is drawn from sprite sheets that share one source and render setup, so the cast has one look and our own Greek designs: we render them in Blender (`art/blender/`) from the Flare collection's CC-BY 3.0 Blender sources (Clint Bellanger's hero and heroine with their equipment, VWolfdog's troll and horse), with Flare's own isometric camera and sun, recoloured and extended with simple modelled parts (beards, horns, wings, a cyclops eye). Flare sheets that already fit (Skeleton Warrior, Minotaur) are used as published. Only CC-BY and CC0 sources; no share-alike. Sheets hold the right-facing row in an 8-column grid (`client/scripts/pack-sheet.mjs`); the game mirrors it. Every character must have idle, walk and death animations (unit test), every frame must exist (`npm run assets:check`), and each sheet has a stride so the walk follows movement speed.

*Amended 2026-10-11 (the Underworld):* creatures the Flare collection has no model for (hounds now; serpents and crabs next) come from CC0 rigged and animated Blender models, approved by the owner. These are Quaternius's wolf and methodical pixel's snake and crab. They are put on a Flare file's stage (its camera, sun and platform), smoothed and given our materials, and their own walk and idle cycles are baked into Flare's frame layout (`art/blender/beasts.py`), so they keep the cast's light, angle and frame layout.

*Alternatives considered:* existing packs (none has the Greek roster or a god in a dark pre-rendered style); mixing packs (inconsistent, rejected by the owner); recasting the roster around Flare's generic creatures (rejected: monsters must be from Greek myth); rendering CC0 low-poly 3D models (a more stylised, toy-like look).

## D16 — Rooms: the host's game is the authority (Accepted, 2026-10-11; revised 2026-10-22)

*Revised 2026-10-22:* rooms travel through the game server (D21) instead of WebRTC. The server relays every message between the host and each guest and understands none of them, so everything below about the host's authority, snapshots and prediction is unchanged. PeerJS is gone. The engine still sees rooms only as `PeerLink`s, and `app/core/rooms/server-network.ts` provides them.

*As first accepted:* co-op rooms connected the players' browsers directly over WebRTC data channels, using PeerJS (MIT) and its public signalling service to find the host by a five-character room code. The host's browser runs the only `RunSimulation`. Guests send their input each step, and receive the world as binary snapshots at 20 Hz together with the events, their own HUD, choices and result. They draw it 100 ms behind with interpolation, and predict their own movement. The scene runs on a `RunDriver` (local simulation, or a guest's replica), and the views read a `WorldFrame`, so nothing in the scene or the views knows which one it has. The room network is loaded when a room is opened, and the engine sees rooms only as `PeerLink`s. Rooms last one run, there is no joining mid-run, and a host who leaves ends the run for everyone (as abandoned).

*Alternatives considered:* lockstep, with every browser simulating and exchanging only inputs (rejected: `Math.sin`/`cos` may differ between browsers, so the runs would drift apart); a relay or game server of our own (rejected by D1 in 2026-10, then chosen in D21); host migration and reconnection (deferred).

## D17 — Phones: touch controls in the Phaser layer, runs in landscape (Accepted, 2026-10-20)

The owner prioritized phone play (`add-phone-play`). Touch is one more input device, so it lives where the keyboard and gamepads are read. `InputReader` reads a `'touch'` control scheme from `TouchControls` (`engine/phaser/touch-controls.ts`), a DOM layer that the Phaser layer puts over its own canvas. The layer is a floating stick under the left thumb and Power, Dash and Sprint buttons on the right. It reads pointer events, and drawing follows those events. Phaser's own input plugin stays off for touch.

Angular only decides that a device is touch (`TouchScreen`: the main pointer is coarse) and passes the scheme to the session. It also adds what is UI: the pause button, the "turn your phone" overlay, fullscreen on Play, and the phone layouts of the HUD and menus.

Sprint is a toggle; pushing the stick far was rejected because it sprints by accident. Runs are landscape only. Local co-op on one screen is not offered on touch-only devices. The simulation is the same on every device (D5, D16): phone tuning changes only drawing.

*Alternatives considered:*

- The controls as Angular components. Rejected: their state would have to reach the engine as commands every frame, against D3.
- Phaser's pointer input with buttons drawn in the scene. Rejected: the buttons would be zoomed with the camera and sit under the Angular HUD.
- Lower enemy caps on phones. Rejected: that changes the rules, and in a room the host's caps decide for everyone.

## D18 — An installable web app that plays offline (Accepted, 2026-10-20)

The owner asked for a PWA (`add-pwa`). The game has a web manifest (relative start page and scope, full screen, landscape, its own icons) and Angular's service worker, in production builds only. The worker keeps every file of the build in advance (about 11 MB), so menus, the intro and solo runs play offline once the game has loaded. Rooms need a connection, and the Co-op screen says so offline.

A new release downloads in the background. The player reloads into it from the main menu, never by itself and never during a run. The main menu offers installation where the browser allows it (Chrome's `beforeinstallprompt`), and explains Add to Home Screen in iOS Safari, including that the Home Screen game keeps its own saves.

The build is still static files (D1), served by the game server (D21). Saves are unchanged (D8).

*Alternatives considered:*

- A hand-written service worker. Rejected: update, hashing and navigation handling to maintain ourselves.
- Workbox. Rejected: a second build tool, where Angular's worker fits the build.
- Caching lazily, only what was seen. Rejected: realms and sounds not yet met would be missing offline.
- Reloading automatically on a new version. Rejected: it could interrupt a run.

## D19 — Daily Trial and challenges without a server (Accepted, 2026-10-20)

To bring players back each day and let them bring friends (`add-daily-play`), the game has a Daily Trial and challenge links, still with no server (D1).

- **The trial:** the day's god, realm, seed and twist come from the local date by a fixed hash, so every browser agrees. Twists are content: gods' stat changes and enemy multipliers, applied by the simulation as `RunRules` (deterministic, D5).
- **Scores** are compared by sharing: a picture of the run and a link that starts the same run with the score to beat. The link carries the score as it was made; nothing checks it, which is fine between friends.
- **Tables:** trial runs, and challenges with a twist, play by other rules, so they stay out of the high-score tables. The day's best is kept in the save (v8).

*Alternatives considered:*

- A global daily leaderboard. Rejected for now: it needs a server; a parked plan exists. *Revised 2026-10-22:* the game server (D21) now keeps a world board per day. The trial itself and challenge links are unchanged.
- One attempt a day. Rejected: it punishes a bad first try, so every attempt counts and the best is kept.
- Seeds from the UTC date. Rejected: the trial changes at local midnight like the daily quests, so players in other time zones may play a different trial at the same moment. Sharing names the date.

## D20 — Licence: MIT code, reserved name and own art (Accepted, 2026-10-20)

The owner chose to open the code and keep the game's identity. The source code (and what it generates at run time: code-drawn art, synthesized sound, the music) is MIT. The name, tagline, logo and the project's own image files (rendered character sheets, the preview image, documentation images) are all rights reserved. Third-party assets keep their own licences (D12). `LICENSE` holds the standard MIT text, so hosts recognise it, and `NOTICE.md` states the scope.

*Alternatives considered:* all rights reserved (no reuse at all); GPL-3.0 (reuse only in open-source work); MIT for everything (others could ship a near-identical game).


## D21 — A game server: rooms relay, matchmaking, world leaderboards (Accepted, 2026-10-22)

**Why.** The owner (2026-10-22) found co-op failing between two machines in one house. Browsers on such networks could not connect directly, and the free public relays (PeerJS's, Open Relay) no longer exist. The owner also wanted world leaderboards and matchmaking. All three need a server everyone can reach, so the owner chose one, layered like a modular monolith and not in .NET.

**What it is.**
- **Shape:** `server/` is one Node.js (TypeScript) service, layered as a modular monolith (`api` → `application` → `domain`, with `infrastructure` implementing the application's ports). Lint enforces the boundaries.
- **Libraries:** Fastify for HTTP, `ws` for WebSockets, PostgreSQL through `pg`.
- **Hosting:** it runs on an Oracle Cloud VM the owner already runs another stack on (the owner's choice), sharing that stack's Caddy and PostgreSQL server.
  - It is one container on that stack's network, at its own address (`olympus.<ip>.sslip.io`), with its own database and role, covered by the host's backups.
  - The release workflow deploys it over SSH with `deploy/install.sh`, with a health check and rollback (docs/hosting.md). The host's names come from GitHub settings, not the repository.
- **The game itself** is served by the same server, at the same address (*revised 2026-10-22*, the owner's choice: everything on the VM). The game calls the server at its own origin, so the server allows only that site. GitHub Pages no longer hosts the game.
  - Saves are per site in the browser (D8), so saves made on the former Pages address stayed there. Nobody was playing yet, so the move made no migration.

**What it does.**
- **Rooms** (`/rooms`, WebSocket): the host's socket holds the room code. Each guest's socket is paired with it, and the server forwards each message unread, prefixed by the guest's number on the host's side. Rooms live in memory and end when the host leaves.
- **Matchmaking** (`/api/rooms`): a host may make its lobby public. The server lists public rooms of the same game version that have not started. **Quick Play** joins the fullest one or opens a public room.
- **World leaderboards** (`/api/scores`, `/api/leaderboards`), stored in PostgreSQL:
  - **Boards:** solo, with allies, co-op and quick, as in the Hall, and one Daily Trial board per date.
  - **Checks:** the server recomputes the score from the run's figures, checks that they are plausible, takes each run once (its run ID), and limits submissions per address. An admin token can hide entries.
  - **Stored:** the player's chosen name and the run's figures; no addresses.

**What it does not do.** It runs no game rules: a run's truth stays in the host's browser (D16). It keeps no saves and needs no accounts. Its absence breaks nothing but co-op and the world boards.

*Alternatives considered:*
- **A paid or account-based TURN relay with peer-to-peer:** it fixes co-op only, and gives no leaderboards or matchmaking.
- **Serverless functions plus a hosted database** (Cloudflare Workers, as parked on 2026-10-19): rejected for the owner's existing VM and stack, which the owner asked for. Rooms also need long-lived WebSockets.
- **.NET:** the owner asked for another stack. TypeScript also lets the server and the game share the room protocol's shape and the score formula.
- **The game on GitHub Pages, the server elsewhere:** two addresses, cross-site calls and two deploys; the owner wanted everything on the VM.
- **Running the simulation on the server:** rejected, because D16's host authority already works and server simulation would cost far more CPU.

## D22 — The Director of Chaos steers choices, never numbers (Accepted, 2026-10-23)

The owner asked for a deterministic game master that makes runs reactive (`add-director-of-chaos`). It lives in the simulation (D2), draws on its own seeded stream (D5) and runs only on a room's host (D16).

- **What it may change:** which encounter starts and when, where its markers and monsters appear, and the realm state it remembers (corruption, grudge). Encounters bring their own declared strength (a hunter's ×1.6 health is part of the encounter, the same for every party).
- **What it may not:** the numbers of a fight in progress, or any monster's, hunter's or god's stats in answer to how a party plays. Adaptation only weights its choices, at most once per 90 s, and says why in its report.
- **Content:** encounters and boons are data over five reusable behaviors (D4); the lifecycle, eligibility and endings are the Director's alone.

*Alternatives considered:* dynamic difficulty that scales enemy health or damage with performance (rejected: it punishes good play and hides the rules); a scripting language for events (rejected: five behaviors cover the specified encounters, and data with typed behaviors is checked by the compiler); a director on the server (rejected by D1/D21: the server runs no rules).
