## ADDED Requirements

### Requirement: God arsenals
A weapon MAY belong to some gods only; such a weapon SHALL never be offered to another god, at level-up or anywhere else. Weapons that belong to no god in particular SHALL be offered to every god. Every god's starting weapon SHALL belong to that god, and every god SHALL be able to find at least four weapons in a run. Synergies that need weapons of one god SHALL only be reachable by that god.

#### Scenario: Zeus's thunderbolt
- **WHEN** `hades` levels up, at any point of a run
- **THEN** `thunderbolt` is never offered

#### Scenario: Common weapons
- **WHEN** any god levels up with free weapon slots
- **THEN** `divine_bow`, `war_hammer` and `flaming_sword` may be offered

#### Scenario: Shared between two gods
- **WHEN** `athena` levels up with free weapon slots
- **THEN** `lightning_orb` may be offered, but `soul_scythe` is not
