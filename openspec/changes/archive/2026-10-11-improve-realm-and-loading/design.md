# Design

## Generation (engine/maps/generate-arena.ts)

Order: terrain → spawn plaza and boss arena → **sites** (ring ruins and the temple claim ground apart from each other, the spawn and the boss arena) → **roads** from the spawn to every ruin centre, the temple's entrance (the middle of the side facing the spawn; the altar stands at the centre) and the boss arena → the sites' obstacles, walls, groves and lights → scatter → decorations. `tryPlace` rejects any obstacle within half a road's width of a road, so ruins open a gate where their road enters and roads stay walkable; decorations also avoid roads. Roads are polylines with a waypoint every ~180 units that strays sideways by up to `wander` (none at the ends). Walls are rows of separate blocks that keep the minimum gap — "ruined" walls with breaches, which keeps the passable-gap rule. Everything is seeded (D5); layouts for a seed change once with this change.

## Ground (engine/maps/ground.ts, engine/phaser/ground-canvas.ts)

`GroundPainter` (pure, no DOM, unit-tested) computes RGBA rows: the generator's own terrain noise sampled between tile centres (so bands meet in smooth curves), blended across band edges, patch noise and grain for texture, and a cliff face beyond the bounds with a lit lip. Smooth fields are sampled every 4 px and interpolated, and the hot loop allocates nothing: ~80 ns per pixel, ~0.35 s for High's 2048×2048. `GroundBuilder` paints it into a canvas in slices within a per-frame budget, then adds grass strokes and pebbles, soft shadows under obstacles and the temple, and the roads (dark edge, packed dirt, beaten middle, loose stones), all from seeded random streams. Resolution: High 0.5, Medium 0.375, Low 0.25 px per world unit, chosen at the start of the run.

## Loading (engine/phaser/arena-scene.ts, app/features/game/run-loading.ts)

`loadProgress` gains a `stage` (`art`, `realm`, `scene`). The scene paints the ground in `update` until done, announces `scene`, builds the world the next frame, emits `ready`, and only then steps the simulation. `RunLoading` maps stages onto one bar (art 0–60%, realm 60–95%, scene 95–100%) that never goes back, shows the realm (painted SVG sky: moon, mountains, the temple on the summit, fires, mist, embers, the boss's silhouette), the party, a tip that changes every 6 s, and the seed. The party is a list the play screen computes — today only the local player; rooms will add theirs.

## Risks

- Slow devices: the ground costs ~0.1–0.35 s of painting spread over frames; Low halves the side length.
- Quality changes during a run do not repaint the ground (resolution is chosen per run).
