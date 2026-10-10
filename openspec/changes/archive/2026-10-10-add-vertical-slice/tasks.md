# Tasks

## 1. Foundation

- [x] 1.1 Create the Angular 22 workspace in `client/` (zoneless, routing, Vitest) with `phaser@4.2.1`; verify `npm run build` succeeds
- [x] 1.2 Add ESLint (angular-eslint, typescript-eslint) with the import boundaries from design §1 and the `Math.random` ban in the simulation, plus Prettier and `npm run check`; verify a deliberate violation is reported and the clean tree passes
- [x] 1.3 Add the CI workflow (format, lint, test, build, Playwright E2E); verify the YAML runs the same commands as `npm run check` and `npm run e2e`

## 2. Simulation core

- [x] 2.1 Implement `Rng` (seeded, forked streams, int/range/chance/pick/weighted) and vector helpers; verify unit tests for determinism, ranges and stream independence
- [x] 2.2 Implement stats and modifiers (`computeStats`) and the content type definitions with `validateContent`; verify unit tests for flat/percent stacking and for each validation error
- [x] 2.3 Implement the spatial hash and circle collision (push-out, sliding, bounds); verify unit tests for push-out, sliding along a circle and map edges

## 3. Arena generation

- [x] 3.1 Implement value noise and `generateArena` (terrain, points of interest, obstacles, decorations, spawn plaza, boss arena, cliff border); verify unit tests for every arena-generation scenario (same seed, different seeds, clear spawn over 50 seeds, gaps, realm-only kinds, 20×20 map)

## 4. Combat and enemies

- [x] 4.1 Implement the damage pipeline and status effects (burn, shock, stun, slow, knockback, lifesteal); verify unit tests for the combat scenarios (element bonus, critical, burn total, stun, armour, overkill counted once)
- [x] 4.2 Implement weapon behaviors (projectile, chain, orbit, nova, sweep, strike) with `resolveWeaponStats` and projectile pierce; verify unit tests for targeting, facing fallback, pierce limit, chain jumps and orbit re-hit interval
- [x] 4.3 Implement enemy behaviors (chaser, ranged, charger, summoner), separation, contact damage and drops; verify unit tests for ranged distance keeping, charger wind-up then dash, summoner calls, stun blocking contact damage
- [x] 4.4 Implement the spawn director (phases, events, scaling cap, fair positions, caps, elites) and pickups (magnet, XP merge cap, gold, healing, chest); verify unit tests for the enemy-spawning scenarios and XP merging without loss

## 5. Run progression and boss

- [x] 5.1 Implement XP/levels, loadout, offers (validity, build-aware weights, fallback), applying choices, synergies and chests; verify unit tests for every run-progression scenario
- [x] 5.2 Implement the boss behavior (arrival in the arena, telegraphed slam/boulder/charge, summons, phases) and hazards; verify unit tests for the boss-encounter scenarios
- [x] 5.3 Implement `RunSimulation` (step order, run phases, pause, revival, single end, run result, debug actions); verify unit tests for phase transitions, single end/victory precedence, and a headless autopilot run that reaches the boss and ends in victory, plus one that ends in defeat

## 6. Content

- [x] 6.1 Author content: `zeus` (+ ability), 8 weapons, 4 armour, 6 relics, skills, 8 Mount Olympus enemies, the `cyclops`, synergies, `mount_olympus` realm (map, timeline, rewards) and permanent upgrades; verify the content validation test passes

## 7. Phaser layer

- [x] 7.1 Implement `createGameSession` (dynamic import), the Phaser game config, generated placeholder textures and the boot scene; verify the play route lazy-loads Phaser (build output shows a separate chunk)
- [x] 7.2 Implement `ArenaScene`: fixed-step loop, keyboard and gamepad input, camera, terrain tilemap, y-sorted obstacles, entity views with interpolation, HUD snapshot throttling, pause on blur/hidden; verify in the browser that the player moves, collides and the camera follows
- [x] 7.3 Implement combat feedback: hit flash, damage numbers (setting), particles, sweep/nova/chain/strike visuals, telegraphs, elite bars, boss pointer, camera shake (setting), synthesized sounds with rate limiting; verify in the browser with screenshots

## 8. Angular application

- [x] 8.1 Implement `SaveStore`, `parseSave` with migrations, `applyRunResult`, `Progression` and `Settings` services; verify unit tests for the meta-progression and run-outcome reward scenarios (missing field, corrupt JSON, unknown ID, storage blocked, processed twice, abandoned half gold)
- [x] 8.2 Implement main menu, god selection, realm selection (seed validation), routes and the play guard; verify component tests for the run-setup scenarios
- [x] 8.3 Implement `PlayScreen` with the HUD, level-up dialog (mouse, keys, gamepad `uiInput`), pause menu (resume, settings toggles, abandon with confirmation) and announcements; verify component tests with a stubbed session
- [x] 8.4 Implement the run summary, progression (permanent upgrades, codex, statistics) and settings screens; verify component tests for buying, disabled buying and settings persistence

## 9. Documentation

- [x] 9.1 Write `CLAUDE.md`, `README.md`, `docs/product-vision.md`, `docs/architecture.md`, `docs/gameplay.md`, `docs/systems.md`, `docs/content.md`, `docs/decisions.md`; verify the documented commands run as written

## 10. Validation

- [x] 10.1 Add the Playwright E2E for the vertical-slice flow (menu → Zeus → Olympus → level-up choice → boss → victory → summary → menu with gold; defeat path; reload keeps gold); verify `npm run e2e` passes
- [x] 10.2 Run `npm run check` and `npm run e2e`; all succeed
- [x] 10.3 Playtest in the browser: a full run to the boss without debug commands, one defeat, a permanent upgrade purchase; tune balance in `content/`; record findings in design.md (browser flow with debug time skips, a defeat, a purchase and headless unassisted runs by the agent; full unassisted run played by the owner on 2026-10-10)
- [x] 10.4 Measure performance with the debug stress command (300 enemies) and record fps in design.md
- [x] 10.5 Review the full changed-file set against specs, non-goals and import boundaries; run `openspec validate add-vertical-slice --strict`; it passes
