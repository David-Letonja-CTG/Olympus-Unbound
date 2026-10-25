# Design

## Data

`RealmDefinition.atmosphere.ambience?`:

- `weather?: { kind: 'leaves' | 'ash' | 'fireflies' | 'spray' | 'dust', rate, color, wind }`: particles per second at High; wind is px/s sideways.
- `lightning?: { every: [min, max], color }`
- `clouds?: number`: cloud shadow opacity.
- `glints?: { terrain: string[], color }`
- `smoke?: number`: the smoke's colour.
- `wildlife?: { kind: 'bird' | 'bat' | 'hopper' | 'crawler', sprite, count }`

`ObstacleKind.sway?: number` and `decorations[].sway?`: sway amplitude in radians.

## View

All of it is in `phaser/ambience.ts`, class `Ambience`, owned by `ArenaScene`. The simulation never sees it. Its randomness is the view's own: cosmetic, not D5.

- **Weather:** one particle emitter over the view, like the embers, at `rate × profile.ambience` per second. Each kind has its own drift, life and spin:
  - leaves tumble;
  - ash falls slowly;
  - fireflies wander and glow (ADD);
  - spray streaks along the wind;
  - dust floats.
- **Lightning:** a countdown in `every`. A flash is a view-wide light added to the light map for 0.12 s, twice. Thunder is the `rumble` cue 0.5–1.2 s later.
- **Clouds:** one tile sprite of the fog texture over the ground, under the world, scrolling slowly. MULTIPLY at `clouds` opacity; High only.
- **Glints:** the arena's water tiles, listed once. Each frame some tiles in the view get a short-lived glint particle (ADD).
- **Smoke:** a soft particle emitter. Each frame it puffs above some fire lights in the view, chosen by the light's flicker: fire flickers, soul lights hardly do. Lava vents count.
- **Wildlife:** a pool of `count × profile.ambience` sprites placed 260–520 px from the focus, inside the view and off obstacles.
  - When a god comes within 140 px, a creature flees: a bird or bat flies off up the view and fades; a hopper or crawler runs off along the ground and fades.
  - Fled or far-off creatures are placed again.
  - Wings flap by y-scale.
- **Sway:** obstacle and decoration sprites with `sway`, in the view, rock by `sin(time + seed)`; High only.

## Quality

`QualityProfile` gains `ambience` (Low 0, Medium 0.5, High 1) and `clouds` / `sway` (High only).

## Content

| Realm | Ambience |
|---|---|
| Olympus | leaves, lightning, clouds, doves, olive trees sway |
| Underworld | ash, bats, smoke |
| Marsh | fireflies, glints on deep water and bog, frogs, reeds and cypresses sway |
| Aegean | spray, clouds, glints on the shallows and sea, gulls |
| Labyrinth | dust, rats, smoke |
| Othrys | ash, lightning (red), crows, smoke |
| Crossroads | leaves (dead), bats, smoke |

## Art

Code-drawn creatures in `engine/art/creatures.ts`:

- `dove`, `gull`, `crow` (one bird painter);
- `bat`;
- `frog`;
- `rat`.

## Performance

- **Low:** nothing is created.
- **High:** at most about 60 weather, 30 glint and 30 smoke particles; 8 creatures; one tile sprite.
- **Sway:** the sprites in view only.

Measured (phone emulation, full horde): Olympus and the marsh, median 33 / 50 ms and p95 33 / 67 ms (Low / High). That is the same as before.

## Tests

Unit tests:

- the quality profile scales: Low creates nothing;
- creatures flee within range and are placed again;
- lightning keeps to its interval.

Then play it on Olympus and the marsh.
