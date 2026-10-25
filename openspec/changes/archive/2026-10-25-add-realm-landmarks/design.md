# Design

- **Rule:** `PointOfInterestRule` gains `{ type: 'landmark', kind, ground? }`.
- **Generator**, after the roads (`generate-arena.ts`):
  - Up to 120 tries on `rng.fork('landmark')` for a point clear of the spawn, the boss arena and the sites (`isClear`, reach = radius + 40), and of every road (radius + 12).
  - On success it stamps `ground` (not registered as a plaza), records the site so walls and groves keep away, and adds the obstacle directly.
  - In the Labyrinth, the maze also respects the site.
- **Content:** each realm has an obstacle kind `landmark` (radius 56–92, sprite, optional light) and a `landmark` rule.
- **Art:** `engine/art/landmarks.ts` holds seven painters, drawn once into textures like every code-drawn sprite.
- **Performance:** one more static sprite and at most one light per realm. Measured (phone emulation, CPU ×4, Olympus, full horde): loading 3.2 / 3.6 s (Low / High, before 3.0–3.5 / 3.4 s); median frame 33 / 50 ms, unchanged.
- **Tests:** every realm on 8 seeds has exactly one landmark, off every road, clear of the spawn and the boss arena. The existing road and temple tests still hold.
