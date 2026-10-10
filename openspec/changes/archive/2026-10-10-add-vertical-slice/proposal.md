# Proposal

## Why

The repository is empty. OLYMPUS UNBOUND needs its first **complete, playable run** — menu to run summary — so the core loop (fight → collect → level up → build → boss → reward) can be playtested, and so the architecture (Angular application, Phaser gameplay layer, Phaser-free simulation, data-driven content, browser saves) is proven by a real game rather than by an empty framework. Every later change (Hades, new realms, co-op) builds on the boundaries this change establishes.

## What Changes

- **Foundation:** Angular 22 application in `client/`, Phaser 4 for gameplay rendering/input/loop, a Phaser-free TypeScript simulation core, typed content definitions, Vitest unit tests, Playwright end-to-end test, ESLint boundary rules and a GitHub Actions CI workflow. Static build only; no backend.
- **Run setup:** main menu → god selection (Zeus) → realm selection (Mount Olympus, optional seed) → run.
- **Procedural arena:** Mount Olympus is generated deterministically from a seed — terrain, marble ruins, columns, statues, olive groves, cliff border, a clear spawn plaza and a boss arena.
- **Player control:** WASD/arrow keys and gamepad movement, a divine ability, pause; a camera that follows the player; collision with obstacles and map bounds.
- **Combat:** automatic, data-driven weapons built from reusable behaviors (projectile, chain, orbit, nova, sweep, strike), one central damage pipeline (critical hits, elements, knockback, burn/shock/stun/slow, lifesteal), on-screen hit feedback.
- **Enemies and spawning:** eight Mount Olympus enemy types from reusable behaviors (chaser, fast, swarm, tank, ranged, charger, summoner), a data-driven spawn timeline with rising pressure, spawn caps, and elite enemies that drop treasure.
- **Boss:** the Cyclops, with telegraphed attacks, two phases and a boss health bar; defeating it wins the run.
- **Run progression:** XP gems, levels, a pause-and-choose level-up with three valid upgrades (new weapons, weapon levels, armour, relics, skills), gold, and data-driven synergies.
- **Run outcome:** victory, defeat and abandoning a run, rewards calculated once, run summary screen, return to menu.
- **Meta progression:** versioned browser save (gold, permanent upgrades, discovered items, statistics, settings) with graceful handling of missing, invalid or older data; a progression screen to buy permanent upgrades and view the codex.
- **HUD and feedback:** health, level/XP, time, gold, kills, loadout, synergies and boss health; synthesized sound effects with volume settings.

**Playable outcome:** open the game → choose Zeus → enter Mount Olympus (seed shown) → fight growing hordes → level up and pick upgrades that visibly change the build → face an elite → defeat (or fall to) the Cyclops → see the run summary with rewards → spend gold on a permanent upgrade → start another run.

## Capabilities

### New Capabilities

- `run-setup`: Main menu, god and realm selection, seeds and starting a run.
- `arena-generation`: Deterministic, biome-aware procedural generation of a realm's arena.
- `player-control`: Movement, abilities, camera, collision, input devices and pausing.
- `combat`: Weapons, attacks, the damage pipeline, status effects, enemy death and drops.
- `enemy-spawning`: Enemy behaviors, the spawn timeline, difficulty growth, caps and elites.
- `boss-encounter`: Boss arrival, telegraphed attacks, phases and defeat.
- `run-progression`: XP, levels, level-up offers, loadout (weapons, armour, relics, skills), synergies and gold during a run.
- `run-outcome`: Victory, defeat, abandoning, reward calculation and the run summary.
- `meta-progression`: The browser save, permanent upgrades, codex, statistics and settings.
- `hud`: What the player sees about their run while playing, and audio/visual feedback.

### Modified Capabilities

None (first change).

## Non-goals

- **Hades** and any other god beyond Zeus; Atlantis, Egyptian Underworld and Nordic realms.
- Local co-op (the simulation supports a list of players, but only one is created and only one input device set is mapped).
- Mobile/touch controls and a phone layout for gameplay (menus are responsive; gameplay targets desktop and controller).
- Music, final art, animation sheets, localization (UI is English-only for now).
- Achievements, unlockable gods/realms, multiple save slots, cloud saves, any backend.
- Object pooling of simulation entities or an ECS — only introduced if profiling shows the need.

## Impact

- New `client/` Angular workspace with dependencies `phaser@4.2.1` and dev dependencies Playwright, ESLint (angular-eslint, typescript-eslint) and Prettier.
- New folders: `client/src/app` (Angular), `client/src/engine` (simulation + Phaser layer), `client/src/content` (typed content), `client/e2e`, `docs/`, `.github/workflows/`.
- Browser storage: one `localStorage` key holding the versioned save.
- Decisions D1–D9 recorded in `docs/decisions.md`.
