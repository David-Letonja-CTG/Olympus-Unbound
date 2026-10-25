## ADDED Requirements

### Requirement: Footing
Terrain MAY change movement. A terrain's speed SHALL multiply the walking speed of every god and monster on it, bosses excepted. A terrain's grip SHALL set how quickly a god's walk follows their input, so that on low grip a god keeps sliding after letting go and turns wide. Dashes SHALL ignore footing. Ground with normal footing SHALL move exactly as without footing. The Lernaean Marsh's bog and the Aegean Shore's shallows SHALL slow movement; the Underworld's frozen Cocytus SHALL be slippery.

#### Scenario: Wading through the bog
- **WHEN** a god or a monster walks on `bog` in `lernaean_marsh`
- **THEN** they move at 80% of their speed

#### Scenario: Sliding on the Cocytus
- **WHEN** a god walking on `cocytus_ice` lets go of the controls
- **THEN** they slide on for a moment before stopping

#### Scenario: Firm ground
- **WHEN** a god walks on ground without footing
- **THEN** they start, stop and turn at once, as before
