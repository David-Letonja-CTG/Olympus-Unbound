## ADDED Requirements

### Requirement: Signature mechanics
Every boss SHALL have a signature mechanic beyond its health. Mechanics SHALL be boss data using shared rules: sweeps (cones), lashes (lines), boss parts (attacking on their own, and optionally damageable, ordered, regrowing and holding zones), guarding and exposure, shifting walls, rage and anchoring.

#### Scenario: The Cyclops rages
- **WHEN** the `cyclops` falls below 50% health
- **THEN** it is announced as enraged, shown red, moves faster and pauses less between attacks, and sweeps three times in a row

#### Scenario: Cerberus's three heads
- **WHEN** `cerberus` fights
- **THEN** its left head breathes cones of fire, its middle head lashes and its right head rains soul-fire, each on its own rhythm, while the body pounces and bites

#### Scenario: The Hydra's heads in order
- **WHEN** the party hits the Hydra's second head while the first still lives
- **THEN** the second head takes no damage, and the first head is marked as the one to cut

#### Scenario: Regrowing heads
- **WHEN** the Hydra's first head falls and the second is not cut within 14 seconds
- **THEN** the first head grows back

#### Scenario: The Hydra exposed
- **WHEN** every head of the Hydra is down
- **THEN** the Hydra is exposed for 8 seconds and takes more damage than usual, then her heads grow back

#### Scenario: Scylla's tentacles hold the arena
- **WHEN** a god stands in a tentacle's zone
- **THEN** the god is hurt over time and slowed until they leave or the tentacle is destroyed

#### Scenario: Scylla guarded
- **WHEN** a tentacle still lives
- **THEN** Scylla takes half damage

#### Scenario: Asterion's shifting walls
- **WHEN** `asterion` fights
- **THEN** walls rise around him after a warning on the ground and are replaced by other walls again and again, and gods and monsters cannot pass through them

#### Scenario: Caught by a rising wall
- **WHEN** a wall rises where a god stands
- **THEN** the god is pushed aside and hurt

#### Scenario: Bull rush into a wall
- **WHEN** Asterion's charge runs into a wall
- **THEN** the charge stops, he is dazed for 2.5 seconds and takes extra damage meanwhile

### Requirement: Attack warnings
Every boss attack that deals damage SHALL show its shape on the ground (circle, cone, line or rising wall) for its whole wind-up, filling as it nears, and SHALL flash in its last quarter-second. Shielded parts, the next part to cut, an exposed or dazed boss and a raging boss SHALL each look distinct. Warnings SHALL stay readable above the night at every quality level (D13).

#### Scenario: The moment to dash
- **WHEN** a slam's warning has a quarter-second left
- **THEN** its outline flashes

### Requirement: Perfect dodge
A god whose dash makes them untouchable as a boss attack would hit them (a warning resolving on them, or a boss's charge or lash reaching them) SHALL perform a perfect dodge: it is announced, the dash's stamina is refunded and the god gains Surge, +30% damage for 3 seconds. A god hit while not dashing gains nothing.

#### Scenario: Dashing through a slam
- **WHEN** a god dashes so that a slam lands while they are untouchable inside it
- **THEN** they take no damage, "Perfect dodge!" is shown, their stamina gets the dash's cost back and they deal 30% more damage for 3 seconds

#### Scenario: Merely out of the way
- **WHEN** a god walks out of a slam's warning before it lands
- **THEN** they take no damage and gain no Surge
