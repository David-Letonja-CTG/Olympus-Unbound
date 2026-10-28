# boss-encounter Specification

## Purpose
Defines the realm boss: when it arrives, how its attacks are telegraphed and resolved, its phases, and what defeating it means for the run.

## Requirements

### Requirement: Boss arrival
In every realm of a run, at that realm's boss time (counted from entering the realm) the realm's boss SHALL appear in the boss arena, the players SHALL be notified with the boss's name, a boss health bar SHALL appear, and an indicator SHALL point to the boss while it is off-screen. Regular spawning SHALL continue at reduced intensity.

#### Scenario: The Cyclops arrives
- **WHEN** the party has spent 07:00 in `mount_olympus`
- **THEN** boss `cyclops` appears with its health bar and name shown

#### Scenario: Only one boss
- **WHEN** the boss time passes again because of a pause or a long frame
- **THEN** still only one `cyclops` exists in the realm

### Requirement: Telegraphed attacks
Every boss attack that deals area damage SHALL be shown as a warning shape on the ground for its wind-up time before it deals damage. Damage SHALL only apply to players inside the shape when the wind-up ends.

#### Scenario: Ground slam
- **WHEN** the `cyclops` starts `ground_slam`
- **THEN** a circle around it is marked for the wind-up time, and only a player still inside the circle when it ends takes damage

#### Scenario: Dodging a boulder
- **WHEN** a `boulder_throw` target circle appears under the player and the player leaves it before impact
- **THEN** the player takes no damage

### Requirement: Phases
A boss SHALL change phase at the health thresholds in its definition; a later phase MAY be faster and use additional attacks. Each phase change SHALL be announced once.

#### Scenario: Enraged Cyclops
- **WHEN** the `cyclops` falls below 50% health
- **THEN** it enters its second phase, moves faster, gains `rampage_charge` and summons, and the change is announced once

### Requirement: Defeating the boss
When the boss's health reaches 0 it SHALL die once and drop its rewards; the realm's boss gold SHALL be added to the run's gold, and the gate to the next realm SHALL open (see endless-run).

#### Scenario: Boss defeated
- **WHEN** the `cyclops` health reaches 0
- **THEN** the run continues, its gold grows by the realm's boss gold, and a gate opens where the Cyclops fell

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

### Requirement: Devour
A boss attack `devour` SHALL mark two circles round the boss: a wide pull ring and a smaller maw. During its wind-up every living god inside the pull ring SHALL be drawn toward the boss at a set speed, slower than a dash. When the wind-up ends the maw SHALL strike every god inside it, like any telegraphed attack, so a perfect dodge applies.

#### Scenario: Dragged in
- **WHEN** Kronos devours while a god stands inside the pull ring and does not move
- **THEN** the god is drawn toward Kronos and, inside the maw when it closes, is hit

#### Scenario: Outrun
- **WHEN** the god dashes away from Kronos as the pull begins
- **THEN** the dash carries the god out of the pull ring before the maw closes

#### Scenario: Outside the ring
- **WHEN** a god stands beyond the pull ring
- **THEN** it is not drawn in

### Requirement: The final phase shows
A boss in its last phase SHALL show glowing cracks and eyes, and shed embers, for the rest of the fight, drawn without changing its sheet or its telegraphs' readability. A boss with a single phase SHALL show it under a quarter of its health.

#### Scenario: Kronos's last phase
- **WHEN** `kronos` enters his last phase
- **THEN** he shows glowing cracks and eyes and sheds embers until he falls

#### Scenario: One phase
- **WHEN** a single-phase boss drops below a quarter of its health
- **THEN** it shows the same look
