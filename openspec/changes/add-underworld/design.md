# Design

- **Realm content** (`content/realms.ts`): `THE_UNDERWORLD` reuses the map generator (rings, temple, walls, clusters, plaza lights, scatter, decorations) with new obstacle and decoration sprites. Order in `REALMS`: Olympus, then the Underworld.
- **Enemies** (`content/enemies.ts`):
  - `shade` is a jittery chaser and `fury` a fast chaser; numbers are close to the satyr and harpy.
  - `lampad` is ranged, like the centaur, with `projectileSprite: 'soul_fire'`.
  - `orthrus` is a charger: lighter and faster than the minotaur.
  - `cerberus` uses only the existing boss attack kinds:
    - phase 1: slam (bite), boulder (hellfire), charge (pounce);
    - phase 2 (< 50%): ×1.3 speed, wider slam, more boulders, and `summon` orthrus ×3.
- **Engine**: `EnemyBehavior` ranged gains `projectileSprite?: string`, and `behaviors.ts` uses it (default `enemy_arrow`). Snapshots already carry hostile sprites by name.
- **Art**:
  - `art/blender/beasts.py` builds hounds from the wolf: extra heads copied from the neck's weighted faces, subdivided fur, ember eyes, an optional mane. Poses are baked from the model's Idle and Walking actions into Flare's frame layout (idle 1–4, walk 5–12, death 13–18).
  - `flare_lib` gains `clear_stage`, `stage_creature`, `bake_poses`, `death_fall`, `copy_by_groups`, `ghost` and `dress_all`.
  - Sources go in `FLARE_SOURCES` with the Flare files. The README and credits list Quaternius's pack (CC0).
- **Scenery** (`engine/art/world.ts`): column, broken column, altar, wall, brazier, flowers and pebbles become colour factories. The Olympus sprites keep their colours, and the Underworld ones are new keys.
- **D15 amended**: creatures Flare lacks may come from CC0 rigged models, rendered on a Flare stage with our materials.
