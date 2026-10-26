# Design

The same shape as the winter events (`content/events/`, one `EventPack` each, `hostRealm`, `eventShop`, `eventAchievements`). No engine changes.

## Bosses: existing mechanics

- **Pan:** `sweep`, `boulder`, `summon`; four attack-only parts placed `from: 'arena'` (the echoes, invisible, lashing on their own rhythm); phase 2 `walls` with six gaps, a `slam`.
- **The Calydonian Boar:** `charge` with `chargeStun` 3, `slam`, `boulder` (falling trees); phase 2 `walls`, two charges in a row, `summon`.
- **Python:** `devour` (the coils), `boulder`, `sweep`, `summon`; phase 2 `walls`.
- **The Caucasian Eagle:** three damageable parts `from: 'arena'` with a burning `zone` (dps 10, slow 0.25), no attacks, `regrow` 22, `guard` 0.4; `charge` (dives), `boulder`, `summon`; phase 2 `sweep`.

## Realms

- Arcadia: ponds with `footing.speed` 0.7; reeds sway there.
- Calydon: `fireflies` under a silver moon.
- Delphi: `dust`, and `teetering` columns as on Mount Olympus.
- Caucasus: `vent`s in the ash, and `lightning` in a warm pink, coloured flashes for the fireworks.

## Cast (recoloured sheets)

| Event | Sheets |
| --- | --- |
| Pan | satyr ×1.06, ×0.85, ×1.6, ×2.4 (Pan), naiad |
| Artemis | curete, orthrus ×0.85 and ×2.6 (the boar), lampad, centaur |
| Apollo | swamp serpent ×1.05 and ×4 (Python), Stymphalian bird, fallen oracle, bronze guardian |
| Fire | shade, harpy, ally smith, cyclops, Stymphalian bird ×2.6 (the eagle) |

## Art (code-drawn)

- `seasonal.ts`:
  - `oak_tree`, `blossom_tree`, `laurel_tree`, `ferns`, `wildflowers`, `cinders`;
  - currencies `painted_egg`, `silver_arrowhead`, `laurel_leaf`, `ember`;
  - missiles `thorn_shot`, `moon_arrow`, `sun_bolt`, `ember_shot`, `sun_ray`.
- `landmarks.ts`: `shrine_of_pan`, `stag_shrine`, `delphic_tripod`, `chained_titan`.
- `sprites.ts`: icons with new `pipes` and `lyre` symbols.
- Sounds: `pipes`, `moonbow`, `sunray`, `stolenfire`.

## Tests

- The calendar puts each event on over its holiday; still no overlaps.
- Boss mechanics:
  - Pan's echoes are active and cannot be hurt;
  - the boar is dazed 3 s;
  - Python draws a god in;
  - the eagle's fires guard it and burn.
- Existing tests cover the rest for every event: offers, sprites, sounds, validation.

## Bundle

The initial bundle passes 720 kB with these four events; its warning budget rises to 780 kB, enough for the last three (event content loads up front, as before).
