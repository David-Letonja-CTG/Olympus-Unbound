# Spec Delta

## Purpose

Defines the realm boss: when it arrives, how its attacks are telegraphed and resolved, its phases, and what defeating it means for the run.

## ADDED Requirements

### Requirement: Boss arrival
At the realm's boss time the realm's boss SHALL appear in the boss arena, the player SHALL be notified with the boss's name, a boss health bar SHALL appear, and an indicator SHALL point to the boss while it is off-screen. Regular spawning SHALL continue at reduced intensity.

#### Scenario: The Cyclops arrives
- **WHEN** the run reaches the boss time of `mount_olympus` (07:00)
- **THEN** boss `cyclops` appears with its health bar and name shown

#### Scenario: Only one boss
- **WHEN** the boss time passes again because of a pause or a long frame
- **THEN** still only one `cyclops` exists

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
When the boss's health reaches 0 it SHALL die once, drop its rewards, and the run SHALL end in victory.

#### Scenario: Boss defeated
- **WHEN** the `cyclops` health reaches 0
- **THEN** the run ends with outcome `victory`
