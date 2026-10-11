# Design

## Context

The asset pipeline (D12) maps sprite keys to sheet frames and animations, with code-drawn fallbacks. The world view plays `idle`, `walk` and `death` for the player and every enemy (the boss is an enemy); the cutscene plays `idle` and `walk` for actors. Content and manifest changes need no engine work; only walk timing and menu portraits touch code.

## Decisions

1. **One collection, our own renders (D15).** Flare's Blender sources (Clint Bellanger's hero and heroine with all equipment layers, VWolfdog's troll, VWolfdog's horse on _canyon's rig; all CC-BY 3.0) are opened in Blender 4.5 and rendered with the files' own orthographic camera and sun. `flare_render.py` converts the 2.49-era Blender Internal materials to Principled BSDF in linear colour, gives the sun a 4° disc (the converted one is 90°, which erases shadows), and uses a shadow catcher; frames are 512 px (troll 1024) and packed to 128 px (256) in halving steps.
2. **Characters are scripts.** Each character is a short Python script on `flare_lib.py`: recolour materials, append heads and weapons from the hero's layer files, attach new meshes (beards, horns, wings, an eye) rigidly to bones measured in the rest pose. Weapons keep their original grip: `measure_grip.py` records each weapon's matrix relative to the hand in world space with scale removed, because the weapon files' armatures are scaled and rotated differently from the body files'.
3. **Centaur:** the horse loses its neck and head (vertex groups); the hero's armature, frozen in the bow-drawing frame of its action, and its body cut below the hips ride on the horse's `rib` bone at 1.4× scale, with a coat-coloured mass over the seam.
4. **Stymphalian bird:** modelled from primitives in the hero file's scene (so camera and light match), keyframed wingbeat and tumbling death.
5. **Walk follows movement.** `SpriteAsset.stride` is the ground one walk cycle covers (world px at the sprite's scale). The view passes each figure's actual speed (from the interpolation positions; for cutscene actors, from the sprite's movement) and sets `anims.timeScale = cycle × speed / (stride × scale)`, clamped to 0.2–3 (`walkRate`, unit-tested). Enemies flip facing only when the sideways part of their heading exceeds 0.35.
6. **Portraits.** `ItemIcon` shows, for sprite keys with a sheet, frame 0 trimmed to the figure's opaque bounds (alpha > 160 leaves out the shadow) and fitted with the feet at the bottom; it falls back to code-drawn art while loading, in tests, and on failure.
7. **Roster.** The original Greek roster returns (`satyr`, `harpy`, `stymphalian_bird`, `corrupted_hoplite`, `centaur_archer`, `fallen_oracle`, `marble_sentinel`, `cyclops`); only `bronze_bull` becomes `minotaur` because the Minotaur is the Greek figure with art that fits. Stats and timeline are unchanged.

## Risks

- **Modelling quality:** additions are simple primitives; at 30–60 px on screen they read clearly (checked in play at High and Low), but close-up portraits are modest. Improving a character means editing its script and re-rendering.
- **Licence drift:** sources, authors and URLs at download time are recorded in `art/blender/README.md`, `content/assets.ts` and `docs/content.md`.
- **Render time:** about 5 minutes per character; only needed when art changes.
