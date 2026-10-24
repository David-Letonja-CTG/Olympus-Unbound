## ADDED Requirements

### Requirement: Weapon evolutions
Evolutions SHALL be defined in data: the weapon they evolve, requirements (as for fusions), one more step of weapon numbers, a splash on hit, and a name, description and icon.

An evolution SHALL be valid as a level-up offer, with a high weight, when:
- its weapon is held at its top level;
- every requirement is met;
- the weapon has not evolved yet.

Taking it SHALL transform the held weapon: it shows the evolution's name and icon and gains the extra numbers and the splash. It SHALL keep its weapon identity for fusions, synergies and the damage record. A weapon SHALL evolve at most once. An evolution of a weapon the god can never wield SHALL never be offered or shown. The build panel SHALL list every evolution the god can reach with what it still needs, and offers that count toward one SHALL name it.

#### Scenario: Spear of Olympus
- **WHEN** a god holds `thunder_spear` at level 6 and the relic `zeus_eye`, and levels up
- **THEN** `spear_of_olympus` may be offered, and taking it turns the spear into the Spear of Olympus, whose hits burst in thunder

#### Scenario: Not at the top yet
- **WHEN** `thunder_spear` is at level 5 and the god holds `zeus_eye`
- **THEN** `spear_of_olympus` is never offered

#### Scenario: Only once
- **WHEN** the spear has evolved
- **THEN** `spear_of_olympus` is never offered again

#### Scenario: Fusions still count
- **WHEN** `war_hammer` has evolved into `hammer_of_hephaestus` and `flaming_sword` is at level 6
- **THEN** `forge_of_hephaestus` may still be offered

#### Scenario: Another god's weapon
- **WHEN** `zeus` opens the build panel
- **THEN** `bident_of_tartarus` is not shown
