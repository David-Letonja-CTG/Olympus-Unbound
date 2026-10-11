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
