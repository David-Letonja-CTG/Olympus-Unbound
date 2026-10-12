# Design

- **Maps (`maps/generate-arena.ts`):**
  - A new `maze` point-of-interest rule (`kind`, `spacing`, `cellPieces`, `loops`, `missingChance`). It lays a grid of square cells, each `cellPieces × spacing` wide, centred in the playable area; the cliff border closes it.
  - A randomized depth-first search over the cells (seeded `Rng`, D5) carves a perfect maze. A share `loops` of the remaining inner walls is then dropped, and each block is skipped with `missingChance`.
  - Blocks go through the shared `tryPlace`, so none stands in the spawn plaza, the boss arena or on a road (roads cut passages). Blocks inside a site's reach (ruin rings, the temple) are skipped, so those open as rooms.
  - The realm sets `minObstacleGap` (18) below a god's diameter (28). With a block spacing of 67 for 24-radius blocks, neighbouring blocks leave a 19-unit gap: walls stop everyone, a missing block is a breach. Enemies keep their straight-line steering and slide along walls (no pathfinding; proposal non-goal).
  - `ArenaRoad.toBoss` marks the road to the boss arena. `roads.thread` (a colour) makes `GroundBuilder` draw a fine wavering line along it, Ariadne's thread.
- **Content:**
  - `LABYRINTH_OF_CRETE` follows `AEGEAN_SHORE` in `REALMS`; the chain wraps to Mount Olympus as before.
  - Enemies: `curete` is a chaser in packs; `bronze_guardian` is a slow, heavy chaser; `snake_priestess` is ranged with `projectileSprite: 'serpent_hex'`; `minotaur` is reused.
  - **Asterion** uses existing boss attack kinds in three phases:
    - phase 1: slam (`labrys_sweep`), charge (`bull_rush`), boulder (`falling_stones`);
    - below 0.6: summon (`the_maze_answers`, minotaurs), faster rush, more stones, wider sweep;
    - below 0.25: speed ×1.45, the rush twice in the cycle.
- **Art:**
  - `labrys_head()` in `flare_lib` turns a held club into a double axe: it slims the haft and adds two flat blades and a spike at the far end.
  - `asterion.py` (Troll.blend, 256 px frames like the Cyclops); `curete.py`, `bronze_guardian.py` and `snake_priestess.py` (hero and heroine).
- **Risk:** walls trap enemies behind them and could make kiting too easy, or corridors too tight for the horde to feel like one. The cell size (5 × 67) and loop share (0.35) are tuned in playtest; recorded in `docs/content.md`.
