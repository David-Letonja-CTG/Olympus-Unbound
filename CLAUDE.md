# OLYMPUS UNBOUND — Agent Guide

OLYMPUS UNBOUND is an original mythological horde-survival roguelite: the player is a god fighting ever-growing hordes in procedurally generated mythological realms, building weapons, armour, relics and synergies, defeating a boss, and earning lasting progress. You are the lead architect and development agent. Fun first, sound architecture second, extensible without unnecessary complexity.

- Vision and roadmap: `docs/product-vision.md`
- Binding decisions (D1–D11): `docs/decisions.md` — if a task conflicts with one, raise it; do not silently override
- How it is built (diagrams, boundaries, frame, state ownership, performance): `docs/architecture.md`
- Rules and formulas: `docs/systems.md`; the game as players see it: `docs/gameplay.md`; content files, packs, cutscenes and checklists: `docs/content.md`; the look: `docs/art-direction.md`
- Releases and hosting (GitHub Pages): `docs/hosting.md`
- Specs and changes: `openspec/`

Read the relevant doc before working on a feature.

## Hard rules

1. **Frontend-only** (D1, D16). No backend of our own, REST, database, accounts, cloud saves or data stored online. Static build only. Co-op rooms connect browsers directly (WebRTC via PeerJS, only in `app/core/rooms/peer-network.ts`); the host's simulation is the authority.
2. **Layer boundaries** (D2, D3) — lint-enforced:
   - Angular (`client/src/app`) imports the engine **only** via `client/src/engine/index.ts`, never Phaser.
   - Only `client/src/engine/phaser/` imports Phaser. The simulation (`engine/*` except `phaser/`, `audio/`) imports no Angular, RxJS, Phaser or app code.
   - The engine never imports `client/src/content/`; content arrives through `createGameSession`. Content imports only engine types.
   - Only `PlayScreen` holds a `GameSession`. No Angular component per enemy/projectile/pickup; no per-frame Angular updates (HUD ≤ 10 Hz).
3. **Gameplay truth lives in the simulation.** Phaser objects mirror state; rules (damage, spawning, leveling, bosses, run phases) never live in scenes or views.
4. **Determinism** (D5): gameplay randomness only through the seeded `Rng` streams; the simulation advances only by `step(1/60)`. No `Math.random()`, `Date` or `performance` in the simulation (lint-enforced).
5. **One damage pipeline**: player damage to enemies goes through `hitEnemy`/`resolveHit`; never compute damage in a weapon or view.
6. **Data-driven content** (D4): new content is data plus, at most, one new reusable behavior. No god-, weapon- or enemy-specific conditionals in systems.
7. **Saves** (D8): explicit versioned `SaveData`; never serialize runtime objects; loading never throws; rewards are idempotent per run ID. Format change ⇒ bump `SAVE_VERSION` + migration + tests.
8. **Original IP** (D9, D12): no copied sprites, textures, sounds, music, UI or code from other games. External art and fonts go through `client/src/content/assets.ts` with an allowed licence (`npm run assets:check`); follow `docs/art-direction.md`.
9. **No placeholders that pretend to work**: every visible button does something; unavailable things are not shown.
10. **No speculation**: no system, dependency or abstraction without a spec requiring it. Prefer a small, playable, well-structured game over a framework.
11. **Readable darkness** (D13): anything the player must react to (telegraphs, enemy projectiles, pickups, enemies) stays readable above the light map at every quality level; check new visuals at Low and High.

## Commands

```bash
cd client
npm ci
npm start                 # http://localhost:4200 (add ?debug for test hooks; /dev/art shows all code-drawn art)
npm run check             # prettier check, eslint, asset licence check, unit tests (Vitest), production build
npm run assets:check      # every external file in public/assets and public/fonts has an allowed licence entry
npm test                  # unit tests only (engine + Angular)
npm run lint
npm run format            # prettier --write
npm run e2e               # Playwright: plays the vertical slice in Chromium (starts its own dev server on :4321)
E2E_NO_GPU=1 npm run e2e  # the same with software WebGL, as on the GPU-less CI runners
npx playwright install chromium   # once per machine
node scripts/docs-media/capture.mjs   # regenerate docs/images from the running game (npm start first; see the script)
node scripts/perf/phone.mjs           # frame times of a full horde under phone emulation (npm start first; see the script)
node scripts/serve-dist.mjs 4322      # serve the production build (npm run build first): the service worker only runs there
node scripts/pwa-icons.mjs            # re-render the installed app's icons (public/icons)
```

Unit tests are `*.spec.ts` next to the code (Vitest through `ng test`, jsdom). Test-only helpers live in `engine/testing/` (fixtures, autopilot) and are excluded from the app build. Engine tests may use the real content (`engine/testing/content.ts`).

## Conventions

- TypeScript strict; Angular standalone components, signals, `OnPush`, zoneless; prettier (100 columns, single quotes).
- Engine modules are plain functions/classes over `RunState`; `RunSimulation` only orchestrates the step order and the run phase.
- Content IDs are stable `snake_case`; specs and tests refer to IDs, never display names.
- Comments explain *why* and reference the spec or decision (`spec: combat / one damage pipeline`, `D5`).
- Performance: keep caps (enemies, projectiles, pickups), use the spatial hash for proximity, pool images in views, avoid per-frame allocation in hot loops, measure before optimizing (see `docs/architecture.md#performance`).

## Workflow: SPEC → PLAN → IMPLEMENT → VALIDATE → PLAYTEST → ITERATE

OpenSpec CLI (`spec-driven` schema). Capability specs live in `openspec/specs/`; work happens in changes under `openspec/changes/<change-id>/` (`proposal.md`, `specs/` deltas, `design.md`, `tasks.md`) and is archived to `openspec/changes/archive/`. Commands: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`; validate with `openspec validate <change> --strict`.

A change is required for anything that alters player-visible behavior, rules, content structure, save format or architecture. Typos, refactors without behavior change, balance tweaks recorded in `docs/content.md`, and dependency bumps do not need one.

- **Spec:** what should exist, why, what the player experiences, acceptance scenarios with IDs, edge cases. No class names.
- **Plan:** affected systems, interfaces, state ownership, Angular/Phaser boundary, content changes, tests, performance risks, migrations.
- **Implement:** only the approved plan; if it proves wrong, say so and update the plan explicitly.
- **Validate:** `npm run check` and `npm run e2e`; review the full changed-file set against the spec scenarios and the hard rules; keep docs current.
- **Playtest:** run the game (`npm start`, the browser) and play the changed behavior; for balance, headless autopilot runs (`engine/testing/autopilot.ts`) help. A gameplay feature is not done until it has been seen working in the running game.
- Never weaken a valid requirement to match an implementation; fix the implementation or propose a spec change.

## Agent behavior

- Inspect before changing; follow existing conventions.
- Ask only when a decision materially affects the product and cannot be made from the docs; otherwise make and record an assumption.
- Report honestly what is implemented, tested, and still missing.
