## MODIFIED Requirements

### Requirement: Signature mechanics
Every boss SHALL have a signature mechanic beyond its health. Mechanics SHALL be boss data using shared rules: sweeps (cones), lashes (lines), boss parts (attacking on their own, and optionally damageable, ordered, regrowing and holding zones), guarding and exposure, shifting walls, rage and anchoring. A walking boss SHALL find its way like other enemies (spec: enemy-spawning / finding the way). Every gap in a ring of shifting walls SHALL be wide enough for the boss that raised it.

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

#### Scenario: Asterion leaves his walls
- **WHEN** Asterion's walls rise in rings around him and a god stands outside them
- **THEN** Asterion walks out through the gaps toward the god, rather than staying in the rings
