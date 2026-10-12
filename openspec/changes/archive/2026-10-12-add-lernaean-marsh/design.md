# Design

- **Content:** `LERNAEAN_MARSH` follows `THE_UNDERWORLD` in `REALMS` and reuses the map generator with new obstacle and decoration sprites.
- **Enemies:**
  - `swamp_serpent` is a fast chaser with high jitter, also spawned in packs and by the Hydra.
  - `giant_crab` is a tank chaser.
  - `lamia` is a short charger.
  - `naiad` is ranged with `projectileSprite: 'venom_spit'`.
- **The Hydra** uses existing boss attack kinds only:
  - phase 1: slam (`many_heads`), boulder (`venom_rain`), summon (`brood`);
  - phase 2: ×1.25 speed, a larger summon, more boulders, a charge (`lunge`), and a wider slam.
- **Art** (`art/blender/beasts.py`):
  - `serpent()`: the CC0 snake, a flat ribbon, is thickened about its spine and scaled to a length, with glowing eyes, and its idle and walk cycles are baked.
  - `crab()`: the CC0 crab with eyes on its shell.
  - `hydra()`: five snakes stood up as necks around a modelled body, each leaning out, each with a modelled head and its own phase of the slither.
  - The Lamia's tail is a chain of scaled spheres on the hip bone.
  - Sources: `snake/snake/snake.blend` and `crab/crab/crab.blend` in `FLARE_SOURCES`.
