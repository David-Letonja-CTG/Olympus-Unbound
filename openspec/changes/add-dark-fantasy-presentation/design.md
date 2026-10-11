# Design

## Context

Builds on the archived `add-vertical-slice`: Angular app, Phaser 4 layer (`ArenaScene`, `WorldView`, `Effects`), Phaser-free simulation, typed content, code-drawn sprites (`engine/art/sprites.ts`), versioned save v1. Motivation: see proposal.md. Requirements: the six spec deltas.

Relies on D2 (gameplay truth in the simulation — nothing here changes rules), D3 (session boundary), D4 (content as typed data), D5 (determinism — cosmetic randomness only in the Phaser layer), D7 (HUD split), D8 (versioned save), D9 (original assets). Adds D12–D14.

## Goals / Non-Goals

**Goals:**
- A dark, lit, atmospheric look that stays readable and holds the performance budget at High, and stays usable with software rendering at Low.
- External art plugs in by editing the asset manifest only.
- A data-driven, skippable intro rendered in-engine.

**Non-Goals:**
- An animation editor, a cutscene editor, or support for every pack format: the manifest supports images, Phaser/TexturePacker JSON atlases and uniform sprite sheets; other formats are converted outside the game.
- Changing simulation rules or content balance.

## Decisions

### 1. Asset manifest and loading (D12)

`client/src/content/assets.ts` exports an `AssetManifest` (schema in `engine/data/assets.ts`):

```ts
files:   { id, type: 'image' | 'atlas' | 'spritesheet', url, normalMap?, frameSize?, licence: { source, author, licence, url } }[]
sprites: Record<spriteKey, { file, frame? , animation?: { frames | prefix+range, fps }, scale?, anchor?, facing?: 'left' | 'right' }>
```

- A Phaser `LoadingScene` queues every file used by the session, reports progress through a new `loadProgress` session event, then registers textures: manifest sprites first, code-drawn fallbacks for every other key (and for keys whose file failed — Phaser loader `FILE_LOAD_ERROR` → fallback, logged once).
- Views ask a `SpriteResolver` for `{ texture, frame, animation, scale, origin }` per sprite key; animated keys use Phaser animations (`walk`, `idle`, `attack`, `death` when the pack provides them; otherwise the single frame with procedural bob).
- Asset files live in `client/public/assets/<pack>/`. `client/scripts/check-assets.mjs` (`npm run assets:check`, part of `npm run check` and CI) fails when a file under `public/assets` has no manifest entry with a licence, when an entry has no file, or when a licence is not on the allow-list (CC0, CC-BY 3.0/4.0, OFL, or "commercial licence on file" with a receipt reference). CC-BY attributions are rendered on a Credits panel in Settings.
- *Alternatives:* importing images through the bundler (hashing, but no runtime fallback or per-pack manifest); one hard-coded loader per pack (does not scale).

### 2. Lighting: light map plus selective shading (D13)

- **Light map (all levels):** a screen-sized `DynamicTexture` cleared to the realm's ambient colour each frame; every active light draws a soft radial sprite into it with ADD blend; the texture is drawn over the world with MULTIPLY blend. Lights are cheap, so many (player, braziers, strikes, fire, glowing projectiles, boss) are possible. Budget per level: Low 16, Medium 48, High 96 visible lights; nearest to the camera win.
- **Shading (High):** Phaser 4 per-sprite lighting (`setLighting(true)`) with normal maps on player, enemies, boss and obstacles, driven by up to 8 scene lights mirroring the strongest light-map lights. Code-drawn sprites get generated normal maps (height from luminance + alpha distance, Sobel); packs may ship their own.
- **Readability above the darkness:** the order is ground → world (lit) → light map (multiply) → *readability layer* → effects. The readability layer holds telegraphs, enemy projectiles, pickups, the player marker, elite/boss bars and a faint silhouette copy of every enemy (same frame, `TintModes.FILL`, alpha 0.18–0.3 by quality) so enemies stay visible in the dark with any art. Ambient is never darker than 30% brightness.
- *Alternative considered:* Phaser lights only — rejected: a hard light budget (shader uniforms), no cheap darkness, and it breaks batching for everything lit.

### 3. Atmosphere and post-processing

- Soft elliptical shadow sprites under characters and obstacles (one batched texture).
- Ground fog: two large `TileSprite`s of a generated noise texture drifting at different speeds, alpha by quality (off at Low); fog is below the readability layer.
- Embers/dust: one particle emitter following the camera; density by quality.
- Camera filters: `ColorMatrix` grade (slight desaturation, warm highlights, cold shadows) and `Vignette` at all levels; bloom via `Phaser.Actions.AddEffectBloom` on a dedicated *glow layer* (lightning, fire, crit sparks) at Medium/High only — bloom on the whole camera would wash out the dark palette.
- Darker, desaturated terrain palette and detail texture for Mount Olympus (content change only).

### 4. Graphics quality

`GameSettings.quality: 'low' | 'medium' | 'high'`. Default on first launch from `detectQuality()` (Angular core): renderer string matching SwiftShader/llvmpipe/Software/Basic Render → Low; `hardwareConcurrency ≥ 8` and no software renderer → High; else Medium. `updateSettings` applies it live: the Phaser layer toggles fog, bloom, shading, light budget and particle density. E2E runs pin Low.

### 5. Code-drawn art upgrade

Sprites are drawn at 2× resolution and displayed at 0.5 scale; characters get gradient shading, rim light, darker materials (bronze, bone, cloth, stone), and silhouettes that read at small size; enemies get a slight per-frame bob/lean from movement (view-only, from velocity). Projectiles and orbs become emissive (drawn on the glow layer). Icons move to a darker, engraved style matching the UI.

### 6. Braziers (arena content)

`ObstacleKind` gains optional `light: { radius, color, flicker }`. A new point-of-interest rule `plazaLights: { kind, count, inset }` places light-bearing obstacles evenly around each plaza edge (deterministic, after the plaza is stamped; the spawn plaza and boss arena included). Generation stays pure; the view creates lights for obstacles with `light`.

### 7. Intro cutscene (D14)

- **Data:** `client/src/content/cutscenes/intro.ts` — a `CutsceneDefinition { id, realmId, seed, duration, actors[], cues[], captions[] }`. Cues are time-stamped and declarative: `camera` (pan/zoom/shake/fade), `actor` (spawn/move/face/remove, sprite key), `horde` (spawn N actors along a path), `strike` (lightning at a point), `light` (add/remove/flicker), `effect` (burst/fire). Captions: `{ at, duration, text }`.
- **Engine:** pure `CutsceneTimeline` (`engine/cutscene/timeline.ts`) answers "which cues fire between t0 and t1", "camera state at t" and "active captions at t" — unit-tested. A `CutsceneScene` in the Phaser layer reuses the world rendering (arena from the realm and the cutscene's seed, lighting, effects) and plays the timeline. No simulation runs.
- **Boundary:** `createCutsceneSession({ parent, content, cutsceneId, settings })` → `{ subscribe(loadProgress | caption | ended), skip(), destroy() }`, lazy-loaded like the game session.
- **Angular:** route `/intro` (`IntroScreen`): loading progress, captions (DOM text: crisp, accessible), skip prompt after 1 s ("Press Esc to skip" + gamepad glyph), handles Esc/Enter/Space/click; gamepad south/Start arrive as `uiInput`. On end or skip it sets `introSeen` (first time) and navigates to `/`. The root route's guard sends a player with `introSeen === false` to `/intro` once per page load. Main menu gains "Intro".

### 8. UI language

- Hand-authored SVG ornaments (corner filigree, carved stone panel, iron frame, gold divider) in `client/public/ui/` used through CSS `border-image` and backgrounds; colours from CSS custom properties.
- HUD: a round **health vessel** (SVG with a clip-path fill and a liquid gradient) bottom-left, experience bar as an engraved strip along the bottom, ability slot and loadout slots in iron frames bottom-centre/right, timer and gold in a top plaque, boss banner top-centre. Contrast ≥ 4.5:1 checked in a unit test on the CSS tokens.
- Display typography: a serif display face under the SIL Open Font License, bundled in `client/public/fonts/` and recorded in the licence registry; body text stays system sans. Until the font file is added, the stack falls back to installed serifs.

### 9. Save v2

`SaveData v2` adds `introSeen: boolean` and `settings.quality`. `MIGRATIONS[1]` sets `introSeen: false`; quality absent → `detectQuality()`. Tests cover v0 → v2 and v1 → v2.

## Implementation notes (2026-10-11)

Deviations from the plan above, all within the specs:

- **No per-sprite (normal-map) shading at High.** Combined with the light map it darkened scenes twice, broke batching, and Phaser's light budget is small; shading is painted into the art instead (rim light, gradients). Recorded in D13. The manifest therefore has no normal-map field.
- **Readability layer uses the enemy's own colours** at partial opacity instead of a pale silhouette: a flat tint turned dark creatures into white ghosts in the first playtest screenshots.
- **Health is an amphora** (an original take on the genre's health vessel), drawn as inline SVG; the ability sweep is driven by a CSS custom property.
- **The display font is not bundled yet** (download needs the owner's go-ahead); the stack falls back to installed serifs. The licence registry and Credits panel already handle fonts.
- **Development art gallery** at `/dev/art` (development builds only) for reviewing code-drawn art and packs.
- `viewAround()` computes the camera's view rectangle from its target, because `camera.worldView` updates during rendering and the light map lagged one frame behind.
- The licence check is a Node script (`npm run assets:check`) because unit tests run bundled for the browser and cannot read the asset folder.

## Validation and performance (2026-10-11)

- `npm run check` (format, lint, asset check, 140 unit tests, build) and `npm run e2e` (6 scenarios, with and without GPU) pass.
- Browser checks (GPU Chromium): screenshots of the arena at Low and High, the intro at nine story beats, every screen; a manifest entry pointing to a missing file falls back to code-drawn art with one warning while the run plays.
- Performance, 331 enemies, lighting and atmosphere on: High 1920×1080 **79 fps** (worst frame 14 ms), Medium **78 fps** (GTX 1660); software rendering at Low 960×540 **~9 fps** with the simulation in real time — enough for CI, not a player target.
- Open: a full unassisted run at High and Low and an intro watch by the owner (8.4).

## Risks / Trade-offs

- [Software rendering in CI gets slower with lighting] → E2E pins Low; Low skips fog, bloom and shading; the light map at Low draws ≤ 16 lights.
- [Darkness hurts readability] → readability layer above the light map, ambient floor of 30%, telegraphs and projectiles unlit; playtest at all three levels.
- [Pack formats vary] → manifest supports the common formats; conversion is a documented manual step in `docs/content.md`.
- [Bloom/filters cost on mid GPUs] → bloom only on the glow layer, Medium/High only; measure at High with 300 enemies (target 60 fps on the reference GPU).
- [IP drift toward a specific game's look] → art direction lists what may be referenced (genre mood, lighting, material palettes) and what may not (layouts, icons, fonts, assets); review screenshots against it.

## Migration Plan

Save v1 → v2 migration on load (no data loss). No other migration; static deploy as before.
