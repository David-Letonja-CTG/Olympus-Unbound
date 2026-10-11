# Tasks

## 1. Direction and decisions

- [x] 1.1 Write `docs/art-direction.md` (palette, lighting, materials, silhouettes, UI language, what may and may not be referenced) and add D12–D14 to `docs/decisions.md`; verify the documents link from README and CLAUDE.md

## 2. Save v2 and settings

- [x] 2.1 Add `introSeen` and `settings.quality` to `SaveData` v2 with `MIGRATIONS[1]`, `detectQuality()`, and quality in `GameSettings`; verify unit tests for v1 → v2, v0 → v2, quality persistence, and the software-renderer default
- [x] 2.2 Add graphics quality to the settings controls (settings screen and pause menu); verify a component test that the choice persists and is sent to a running game

## 3. Asset pipeline

- [x] 3.1 Add the manifest schema (`engine/data/assets.ts`), `content/assets.ts` (empty pack list), the `SpriteResolver`, and manifest validation in `validateContent`; verify unit tests: manifest sprite wins over fallback, unknown file reference reported, fallback for unmapped keys
- [x] 3.2 Add the `LoadingScene` (Phaser loader, progress events, fallback on load error logged once) and the `loadProgress` session event; verify in the browser with a manifest entry pointing to a missing file (fallback art, one log line, run plays)
- [x] 3.3 Add `scripts/check-assets.mjs` and `npm run assets:check` to `npm run check` and CI, plus a Credits panel for attribution licences; verify the check fails for an unlisted file and a missing file, and passes on the clean tree

## 4. Atmosphere

- [x] 4.1 Implement the light map (ambient, radial lights, budget by quality), lights for the player, strikes, fire, glowing projectiles, elites and the boss; verify in the browser at all three quality levels with screenshots
- [x] 4.2 Implement the readability layer (telegraphs, enemy projectiles, pickups, bars, enemy silhouettes above the darkness, ambient floor); verify screenshots of an enemy outside every light and a telegraph in fog
- [x] 4.3 Add shadows, fog, embers, colour grading, vignette and glow-layer bloom with quality switches applied live; verify switching quality during a run in the browser
- [x] 4.4 Add light-bearing obstacles and the `plazaLights` rule; place braziers around Mount Olympus plazas; verify arena-generation unit tests (deterministic placement, inside plazas' edges, gaps respected)
- [x] 4.5 Darken the Mount Olympus palette and terrain detail; verify the content validation test and screenshots

## 5. Code-drawn art upgrade

- [x] 5.1 Redraw characters, enemies, the boss, obstacles and projectiles at 2× with shading, rim light and darker materials; generate normal maps; add view-only bob/lean from movement; verify screenshots and that every content sprite key still resolves
- [x] 5.2 Redraw item icons in the engraved style; verify the HUD, level-up cards, codex and summary in the browser

## 6. UI overhaul

- [x] 6.1 Author SVG ornaments and the UI tokens; restyle the main menu, selection screens, progression, settings and summary; verify the screen component tests still pass and screenshots of every screen at 1280×720 and 1920×1080
- [x] 6.2 Rebuild the HUD (health vessel, experience strip, ability and loadout slots, top plaque, boss banner) and the level-up and pause dialogs; verify HUD component tests for the health vessel and ability sweep scenarios and a contrast test on the colour tokens

## 7. Intro cutscene

- [x] 7.1 Implement `CutsceneTimeline` and the cutscene content types; verify unit tests: cue windows, camera interpolation, captions at t, total duration within 45–60 s
- [x] 7.2 Implement `CutsceneScene` and `createCutsceneSession`; author `content/cutscenes/intro.ts`; verify by watching the intro in the browser end to end
- [x] 7.3 Implement `IntroScreen`, the first-launch guard, skip handling and the menu's Intro action; verify component tests for first launch, returning player, skip and replay

## 8. Validation

- [x] 8.1 Update the Playwright tests (intro on first launch, skip with Escape, no intro on return, replay; existing flows pinned to Low); verify `npm run e2e` and `E2E_NO_GPU=1 npm run e2e` pass
- [x] 8.2 Run `npm run check`; it passes
- [x] 8.3 Measure performance at High (300+ enemies, 1080p, reference GPU) and at Low with software rendering; record results in design.md
- [ ] 8.4 Playtest a full run at High and Low and watch the intro; review screenshots against the art direction and the readability requirements; record findings in design.md
- [x] 8.5 Update README, architecture, gameplay, systems and content docs; run `openspec validate add-dark-fantasy-presentation --strict`; it passes
