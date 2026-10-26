# Design

## Content layout

- `content/events/` replaces `content/events.ts`: one file per event exporting an `EventPack`:
  - `event`, `realm`, `boss`, `enemies`, `weapons`, `relics`, `rewards`, `achievements`.
  - `content/events/index.ts` lists the packs in calendar order and merges them.
- `content/index.ts` spreads the packs into the content lists: event realms last, event achievements after the others.
- `content/events/shared.ts` holds what the packs share:
  - the boss attack builders (moved out of `bosses.ts`, which imports them);
  - the map frame every event realm uses (64 × 64 tiles, the boss arena, roads);
  - the standard eight-phase spawn timeline and its hordes and elites, from four monster ids (fodder, quick, ranged, heavy). Hecate keeps her own, tuned numbers.
- The Night of Hecate moves to `content/events/night-of-hecate.ts` unchanged.
- Event monster sheets: entries in `assets.ts` like Hecate's, a base sheet with its own scale and `recolor`; a `beast()` helper for the wolf, serpent and crab layout.

## Engine

- `EventDefinition.currency.sprite`: the currency's picture key, drawn on the ground and used as its icon.
  - `RunDriver.eventId` (local: the run config's; guest: the room's run) lets the arena scene hand the sprite to `WorldView`. A `token` pickup draws that sprite; the plain `token` sprite is the fallback.
  - The run summary and the event shops use it in place of the fixed `honey_cake`.
- Weather kind `snow`: slow, drifting white flakes (view only, `Ambience`).
- No new simulation rules. The bosses use existing mechanics:
  - Nyx: guard parts with `regrow`, a slowing `zone` on Hypnos, `walls`.
  - Boreas: `charge` with `chargeStun`, `sweep`, `walls`.
  - Eros: guard parts with `exposed`, `charge` from phase 2.
  - Ladon: `anchored`, attack-only head parts (two from phase 2 via `fromPhase`).
- Ice is the existing `footing.grip`; hot springs and pools are `spring` features.
- A part's zone with `dps` 0 only slows: `damagePlayer` hurts at least 1, so the zone skips it (a fix for Hypnos).
- Lamps on snow shine at about half strength: the bright ground throws the light back (seen in the playtest).
- The initial bundle's warning budget rises to 720 kB: event content loads up front, as before.

## Art (code-drawn, D9/D15)

- Landmarks (`engine/art/landmarks.ts`):
  - `cave_of_nyx`: a cave mouth in a snowy hill under stars;
  - `ice_throne`: Boreas' frozen throne between ice pillars;
  - `shell_of_aphrodite`: a great scallop shell in sea foam;
  - `atlas_holding_sky`: Atlas kneeling under the celestial sphere.
- `seasonal.ts` (new, spread into `SPRITES`):
  - tree and bush painters with colour parameters: `snowy_pine`, `myrtle_tree`, `rose_bush`, `apple_tree`;
  - `ice_spire`;
  - lamps: `star_lantern`, `rose_lamp`;
  - decorations: `snow_drift`, `holly`, `ice_shards`, `rose_petals`, `clover`, `windfalls`;
  - currency pickups: `star_shard`, `hailstone`, `rose`, `golden_apple` (Hecate's `token` becomes `honey_cake`);
  - enemy and weapon projectiles: `night_star`, `ice_shard`, `heart_bolt`, `apple_shot`, `gust`, `love_arrow`, `falling_apple`;
  - the boss parts `golden_arrow`, `leaden_arrow`, `ladon_head`; the fallback `token`.
- `props.ts`: `prop_gift` (a wrapped offering), `prop_urn_frost`, `prop_amphora_rose`, `prop_amphora_gold`.
- `features.ts`: `hot_spring`, `rose_pool`.
- `creatures.ts`: petal and blossom particles.
- `sprites.ts`: icons for the new items, with new `star` and `apple` symbols.
- Sounds: one cue per new weapon (`stars`, `gust`, `heartstring`, `apple`).

## Tests

- No two event windows overlap; the winter holidays put their events on.
- Every sprite key used by content resolves to a sheet or a code-drawn painter.
- Each new event: the calendar puts it on; its items are offered only in its runs; content validation passes.
- Boss mechanics through existing boss tests where needed: Hypnos' zone slows; Ladon stays anchored.
- e2e: one new event from the admin switch to a run in its realm.
