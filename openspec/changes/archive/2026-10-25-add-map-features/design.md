# Design

## Data

`MapGenConfig.features?: FeatureRule[]`:

- `vent { count, radius, damage, monsters, windup, every, terrain?, visual, light? }`
- `teetering { kind, chance, trigger, length, width, damage, monsters, windup, stump, shaft }`
- `crusher { count, width, damage, monsters, windup, every, visual }`
- `spring { count, radius, heal, pool, refill, visual, light }`
- `brazier { count, radius, burn, every, visual, lit, light }`

## Generation

`generate-arena.ts`, after the obstacles and before the props, on `rng.fork('features')`. `ArenaData.features` holds `{ id (index), rule (index), x, y, angle }`, at most 32.

- Vents, springs and braziers stand on clear ground: off obstacles, the spawn, the boss arena and road middles.
- Teetering columns are chosen among the rule's obstacle kind, with a fall angle. They sit where the column stands.
- Crushers sit across a road, perpendicular to it, away from the spawn and the boss arena.
- Props keep clear of features.

## Simulation

`sim/features.ts`, `updateFeatures`, after the hazards. Per-feature numbers live in a typed array on `RunState`: a timer, or the spring's pool. The one-shot states go in a 32-bit mask, `RunState.features`: fallen, lit, dry.

- **Vents and crushers:** count down only while a god is within 900 px. Then they raise a `Hazard`: a circle, or a line across the road. Its damage is `damage × scaling().damage`, plus `monsters` × max health to non-boss monsters (`Hazard.monsters`, applied in `updateHazards` through `dealDamage`). Then a new interval from `every`, on the run's `features` stream.
- **Teetering:** the first god within `trigger` sets the bit and raises the line hazard along the fall. A `featureSprung` event follows.
- **Spring:** each god inside heals `heal`/s, as regen does, out of the pool. At 0 the dry bit is set; after `refill` it clears and the pool is full again.
- **Brazier:** a god touching it sets the lit bit (`featureSprung`). Every `every` s, a lit brazier burns monsters within `radius`: `applyStatus` with `burn` × max health per second.

## Rooms

The mask goes in the snapshot (u32, `SNAPSHOT_FORMAT` 8). Hazards already travel.

## View

`WorldView` draws one sprite per feature:

- **Teetering column:** the obstacle's sprite leans 0.12 rad toward its fall. Once fallen it swaps to the stump, with the shaft laid along the fall.
- **Spring:** dims while dry; its light only while it has water.
- **Brazier:** the cold sprite until lit, then the lit sprite and its light.
- **Vents** glow, with a small light. **Crusher slabs** stand at both ends of the line.

On a mask change (one comparison a frame) the view swaps sprites.

## Sounds

- A fall: `rumble`.
- A brazier lit: `hitFire`.

## Content

| Realm | Features |
|---|---|
| Olympus | teetering ring columns (15%), 2 springs |
| Underworld | 6 vents on ash, 4 cold soul braziers |
| Marsh | 3 springs |
| Aegean | 2 springs, plus sea `walls` |
| Labyrinth | 5 crushers, 4 cold torches |
| Othrys | 8 vents on ember ground, plus rampart `walls` |
| Crossroads | 4 cold torches |

## Performance

No allocation per step. Hazards appear only near the gods. At most about 10 extra static lights. Measured (phone emulation, full horde):

- Othrys: median 33 / 33 ms (Low / High).
- Labyrinth: median 33 / 50 ms, p95 50 / 67–83 ms. main measures the same 67–83 ms on High.

## Tests

- **Generator:** deterministic, within the cap, and placed by the rules.
- **Simulation:**
  - a vent erupts near a god and hurts gods and monsters;
  - a column falls once;
  - a crusher repeats;
  - a spring heals, runs dry and refills;
  - a brazier lights once and burns a monster.
- **Snapshot:** the mask round-trips.
