## ADDED Requirements

### Requirement: Landmarks
Every realm SHALL have one landmark, a great set piece of its myth, placed on every arena:

| Realm | Landmark |
|---|---|
| `mount_olympus` | the fallen colossus of Zeus |
| `the_underworld` | the gates of Hades |
| `lernaean_marsh` | a sunken temple |
| `aegean_shore` | a beached trireme |
| `labyrinth_of_crete` | Daedalus's workshop and his wings |
| `mount_othrys` | the throne of Kronos |
| `crossroads_of_hecate` | a hekataion of the triple goddess |

A landmark SHALL stand on its own site, away from the spawn, the boss arena, the roads and the other sites. Gods and monsters SHALL walk round it. It MAY give off light and stamp its own ground. Its placement SHALL be deterministic for an arena.

#### Scenario: The colossus
- **WHEN** a `mount_olympus` arena is generated
- **THEN** exactly one landmark stands on it, off every road and clear of the spawn plaza and the boss arena

#### Scenario: Every realm
- **WHEN** an arena of any realm is generated from any seed
- **THEN** it has its realm's landmark
