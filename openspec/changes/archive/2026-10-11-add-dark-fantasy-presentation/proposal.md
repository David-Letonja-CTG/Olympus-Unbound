# Proposal

## Why

The vertical slice plays well but looks like a children's game: bright flat colours, simple shapes, no lighting, a plain UI. OLYMPUS UNBOUND's pillar is *mythological dark fantasy* (product vision, pillar 6), and the owner wants the grim, painterly, atmospheric feel of classic gothic action-RPGs. The game also has no story framing: a run starts without telling the player why Olympus is at war. This change gives the game its intended look and an opening scene, and builds the asset pipeline that lets real artwork (licensed packs now, commissioned art later) replace the code-drawn placeholders without touching gameplay.

## What Changes

- **Art direction:** a written art direction (`docs/art-direction.md`): dark palette, warm/cold lighting, materials, silhouettes, UI language, and IP rules (inspired by the genre's mood, nothing copied from any game).
- **Asset pipeline:** an asset manifest maps every sprite key the game uses to either a packaged asset (texture atlas frames and animations from a licensed pack) or the code-drawn fallback. Assets load behind a loading screen with progress. Every external file is listed with its source, author and licence; a test fails if an asset lacks a licence entry. A missing or broken asset falls back to the code-drawn sprite instead of breaking the game.
- **Atmosphere:** dynamic lighting (darkness beyond the player's light, light from lightning, fire, projectiles, braziers and the boss), self-shadowed sprites, soft drop shadows, ground fog, embers and dust, colour grading, vignette and bloom on bright effects. Darker, desaturated realm palette with high-contrast player, enemies and telegraphs.
- **Better code-drawn art:** higher-resolution, shaded, rim-lit sprites with normal maps, walk/idle bobbing and attack/hit poses, so the game looks good before any pack is added.
- **Graphics quality setting:** Low / Medium / High (lights, fog, bloom, particle density), defaulting from a quick capability check; readability effects (telegraphs, enemy outlines) stay on at every level.
- **Dark ornate UI:** carved stone, dark iron and gold-leaf frames; a redesigned HUD (health vessel, experience bar, skill/ability slots, boss banner), menus, level-up cards, pause menu and run summary in the same style; serif display typography bundled with the game.
- **Intro cutscene (in-engine):** a scripted ~45–60 s scene made with the game's own sprites, lighting and effects: Olympus at night, the hordes breaking through, the gods falling, Zeus taking up the thunder. Captions narrate. It plays the first time the game is opened, can be skipped at any moment, and can be replayed from the main menu.
- **Save format v2:** remembers whether the intro has been seen and the graphics quality; v1 saves migrate.

**Playable outcome:** first launch → loading screen → the intro scene (skippable) → a dark, ornate main menu → a run in a moody, lit Olympus where lightning lights up the night, the horde emerges from fog, and the HUD reads like an artefact rather than a web page; the same flow works with code-drawn art and with an installed asset pack.

## Capabilities

### New Capabilities

- `asset-pipeline`: Asset manifest, loading with progress, fallbacks, licence registry.
- `visual-atmosphere`: Lighting, shadows, fog, post-processing, graphics quality levels and readability guarantees.
- `intro-cutscene`: The opening scene: when it plays, skipping, replaying, captions.

### Modified Capabilities

- `meta-progression`: Settings gain graphics quality; the save remembers the intro; save v2 migration.
- `run-setup`: First launch plays the intro before the main menu; the main menu offers replaying it.
- `hud`: Presentation requirements for the redesigned HUD (health vessel, ability slot, boss banner) while keeping all existing information.

## Non-goals

- Choosing, buying or downloading specific asset packs: the owner selects packs; this change makes them pluggable and ships with improved code-drawn art.
- Pre-rendered video cutscenes, voice acting, music (sound remains synthesized effects).
- New gameplay, gods, realms, enemies or balance changes.
- Copying any game's UI layouts, icons, fonts or assets — only the general mood of the genre.
- Mobile layouts.

## Impact

- New: `client/src/engine/assets/` (manifest, loader, fallbacks), `client/src/engine/phaser/` lighting/post-processing/cutscene scene, `client/src/content/cutscenes/intro.ts`, `client/src/content/assets.ts` (manifest + licences), `client/public/assets/` (pack files when added), bundled display font (SIL Open Font License), `docs/art-direction.md`.
- Changed: textures, world view, effects, HUD and every Angular screen's styles; settings; save model (v2).
- Performance budget unchanged: 60 fps with ~300 enemies at 1080p on the reference GPU at High; Low must keep CI/software rendering usable.
- New decisions in `docs/decisions.md`: D12 (asset pipeline and licensing), D13 (lighting and quality levels), D14 (cutscenes are in-engine scripts).
