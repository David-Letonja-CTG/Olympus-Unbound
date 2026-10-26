# Design

The same shape as the earlier events (`content/events/`, one `EventPack` each). No engine changes.

## Bosses: existing mechanics

- **Medusa:** two damageable parts with `order` 1 and 2 (only the next can be hurt) and `regrow` 18, `guard` 0.2, `exposed` 7 s × 1.6. Her gaze is a `sweep` with a long wind-up (1.4 s) and heavy damage (40). Phase 2 adds `walls` (four gaps) and a `summon`.
- **Dionysus:** two damageable panther parts without `regrow` (gone for good once slain), `guard` 0.3; `sweep`, `boulder`, `summon`. Phase 2 adds `walls` (five gaps) and `charge`.
- **Erysichthon:** `slam`, `boulder`, `charge` with `chargeStun` 1.5, `summon`. Phase 2: `devour` (his hunger), `walls` (three gaps).

## Realms

- Isle of the Gorgons: shallows with `footing.speed` 0.75, many statues, pale `lightning` for falling stars, and `fireflies` for starlight.
- Vineyards of Naxos: rows of `vine_trellis` laid out by the `walls` point of interest; vine leaves on the wind.
- Grove of Demeter: wheat that sways, stumps, haystacks; russet leaves on the wind; braziers to light.

## Cast (recoloured sheets)

| Event | Sheets |
| --- | --- |
| Perseus | swamp serpent, lamia (and ×1.25 sisters, ×2.4 Medusa), fallen oracle, marble sentinel |
| Dionysus | drowned sailor, orthrus ×0.9 (panthers), siren, centaur, Hades ×2.3 (Dionysus) |
| Erysichthon | shade, Stymphalian bird ×0.85, snake priestess, cyclops, ally warrior ×2.5 (Erysichthon) |

## Art (code-drawn)

- `seasonal.ts`:
  - `vine_trellis`, `fallen_grapes`, `autumn_oak`, `tree_stump`, `haystack`, `wheat_tuft`, `leaf_litter`;
  - currencies `meteor_stone`, `grapes`, `wheat_sheaf`;
  - missiles `grey_eye`, `pinecone_shot`, `sickle_shot`, `thyrsus_staff`.
- `landmarks.ts`: `gorgoneion`, `ivy_ship`, `felled_oak`.
- `props.ts`: `prop_amphora_wine`. `creatures.ts`: `leaf_vine`, `leaf_autumn`.
- `sprites.ts`: icons, with a new `horn` symbol for the Cornucopia.
- Sounds: `mirror`, `thyrsus`, `sickle`.

## Tests

- Every month has an event day; no overlaps; each holiday puts its event on.
- Boss mechanics:
  - Medusa's sisters fall in order and expose her;
  - Dionysus' panthers never return;
  - Erysichthon's hunger pulls.
