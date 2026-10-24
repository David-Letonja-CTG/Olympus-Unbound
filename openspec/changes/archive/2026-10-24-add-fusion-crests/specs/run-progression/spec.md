## ADDED Requirements

### Requirement: Fusion crests and fanfare
Every fusion SHALL have its own crest icon, distinct from skills and synergies:

- a gilded rim;
- one pip per tier;
- the glyphs of the upgrades it fuses (the tier III fusion has a crown of its own).

Taking a fusion's first level SHALL be announced with a burst round the god that grows with its tier. The tier III fusion SHALL have its own fanfare, a flash and a screen shake. Later levels of a fusion SHALL not be announced again.

#### Scenario: Forge of Hephaestus taken
- **WHEN** the player takes `forge_of_hephaestus` for the first time
- **THEN** "Fusion: Forge of Hephaestus!" is announced with a tier I burst, and its crest shows one pip

#### Scenario: Apotheosis
- **WHEN** the player takes `apotheosis`
- **THEN** the tier III fanfare plays with a golden flash and the screen shakes

#### Scenario: A second level
- **WHEN** the player takes `forge_of_hephaestus` at level 2
- **THEN** nothing is announced

#### Scenario: Every fusion has a crest
- **WHEN** the content is validated
- **THEN** every fusion's icon is a crest
