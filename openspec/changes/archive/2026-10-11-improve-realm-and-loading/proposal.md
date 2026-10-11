# Proposal

## Why

The owner wants the maps and the loading screen "more beautiful and advanced", and the loading screen ready for the co-op and room-based multiplayer that comes next. Today:

- **Starting a run shows a dark screen** while the cast's sheets (~4 MB) load; the spec already requires a loading screen with progress (asset-pipeline / loading with progress), which only the intro has.
- **The ground is a 64×64-pixel colour grid**, scaled up and blurred, with a tiled grain: bands of flat colour, no paths, no structure beyond round plazas and column rings.

## What Changes

- **Run loading screen**: from *Begin* until the arena is ready, a full-screen scene in the game's style: the realm's name and description over a painted backdrop of the realm (its palette, ruins, the boss's silhouette), the chosen god's portrait, staged progress with real numbers (*Summoning the gods* — art; *Shaping the realm* — map; *The horde gathers* — scene), a rotating line of lore and tips from content, and the **party**: every player of the run with their god (today one, "You"); room details appear only when a run has a room. It fades into the arena; nothing on it pretends to work.
- **Painted ground**: the arena's ground is painted per run at high resolution (half a pixel per world unit): smooth, noise-blended transitions between grass, meadow and earth, grass and soil texture, worn dirt roads, soft shading around plazas, ruins and the cliff edge, and a rock face along the border. Quality levels scale the resolution.
- **Richer layout** (deterministic, seeded): **roads** from the spawn plaza to every ruin and to the boss arena; a **temple** landmark — a rectangular stylobate with steps, a colonnade with fallen columns, and an altar with braziers; **ruined walls** (broken wall segments) around some ruins. All stay readable and fair: clear spawn and boss arena, passable gaps.
- **Content**: realm loading tips and lore; new obstacle and decoration kinds with code-drawn art.

## Capabilities

### New Capabilities

- `run-loading`: the loading screen of a run — what it shows, progress stages, party, transition.

### Modified Capabilities

- `arena-generation`: Mount Olympus gains roads, a temple and ruined walls; paths and landmarks must keep the layout fair.
- `visual-atmosphere`: the ground is painted per run with blended terrain, roads and shading, scaled by quality.

## Non-goals

- Multiplayer itself (rooms, networking) — the next change; the party panel only shows the run's players.
- New realms.
