# Design

- `TerrainType.texture?: { kind, size?, strength? }`.
- **`GroundPainter`** (`engine/maps/ground.ts`):
  - A fourth smooth field, a detail noise at 26 units, is sampled on the coarse grid with the others and interpolated.
  - `bandColor` records the dominant band's pattern, with its strength fading to 0 across the blend.
  - The pixel loop multiplies the light by `texture(kind, size, wx, wy, detail, px, py)`: a switch of plain arithmetic, with no allocation.
- **Patterns:**

  | Pattern | How it is drawn |
  |---|---|
  | slabs | running bond, 1.5 × size long, grout 0.7, per-slab tone, lit top edge |
  | cobbles | jittered grid, gap beyond 0.88 of the radius |
  | cracks | veins where the detail noise crosses 0.5, plate tones |
  | ripples | a sine across the wind bent by the noise, ±9% |
  | ash | drifts from the noise, speckle |
  | mud | sheen in the hollows |
  | grass | lit and shaded blade speckle, denser in clumps |
  | earth | pebbles of `size` |
  | moss | soft clumps |

- **Performance:** the ground is painted once into a canvas behind the loading screen, and play draws it as one image.

  | Measure (phone emulation, CPU ×4, Olympus, full horde) | Before | After |
  |---|---|---|
  | Loading, Low | 3.1 s | 3.0–3.5 s |
  | Loading, High | 3.3 s | 3.4 s |
  | Median frame, Low | 33 ms | 17–33 ms |
  | Median frame, High | 50 ms | 50 ms |

  The spread between runs is the emulation's noise.
- **Tests:** a slab floor's grout spreads a painted row's brightness beyond a plain floor's; ripples vary the light; the existing determinism tests still hold.
