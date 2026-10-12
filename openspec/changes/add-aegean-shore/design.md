# Design

- **Content:**
  - `AEGEAN_SHORE` follows `LERNAEAN_MARSH` in `REALMS`. Its scenery reuses Olympus's marble pieces and beacon braziers, plus new shipwreck and amphora obstacles and shell, seaweed and sand decorations.
  - Enemies: `drowned_sailor` is a chaser; `siren` is ranged with `projectileSprite: 'siren_song'`; `triton` is a charger; `giant_crab` is reused.
  - **Scylla** uses existing boss attack kinds:
    - phase 1: slam (`six_hounds`), boulder (`charybdis` whirlpools), charge (`tentacle_lash`);
    - phase 2: summon (`the_drowned_rise`), more boulders, a faster charge, a wider slam.
- **Art:**
  - `scaled_tail()` in `flare_lib` (the Triton's fish tail).
  - `hound_heads()` and `tentacles()` in `beasts.py`:
    - Head geometry is cut from the wolf, unrigged and attached to the heroine's hip.
    - The snakes lie radially on the stage, with their slither baked over the heroine's 32 frames.
  - Scylla's stage camera is widened (×1.3) and rendered at 1024 px for 256 px frames.
