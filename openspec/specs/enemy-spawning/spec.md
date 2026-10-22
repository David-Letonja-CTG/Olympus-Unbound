# enemy-spawning Specification

## Purpose
Defines the enemies of a realm, how they behave, and how the spawn timeline raises pressure fairly over a run while keeping the browser responsive.

## Requirements

### Requirement: Data-driven enemies with reusable behaviors
Each enemy type SHALL be defined by data (health, speed, damage, size, XP, gold, knockback resistance, behavior). Behaviors SHALL be reusable: chaser, fast chaser, swarm, tank, ranged attacker (keeps distance, fires projectiles, optionally with its own projectile sprite), charger (telegraphs, then dashes, only at a god it can see) and summoner (periodically calls other enemies). Mount Olympus SHALL have eight enemy types.

#### Scenario: Ranged attacker keeps distance
- **WHEN** a `centaur_archer` is closer to the player than its preferred range
- **THEN** it moves away and fires projectiles at the player on its cooldown

#### Scenario: Charger telegraphs
- **WHEN** a `minotaur` comes within charge range of a god it can see
- **THEN** it stops, shows its charge direction for its wind-up time, then dashes in a straight line

#### Scenario: No charge through a wall
- **WHEN** a `minotaur` is within charge range of a god behind a wall
- **THEN** it does not wind up, and walks around the wall instead

### Requirement: Spawn timeline
A realm SHALL define a spawn timeline of phases (time range, spawn rate, enemy weights, maximum alive) and timed events (hordes, elites, boss). The pressure SHALL rise over time through enemy mix, rate and density; enemy health and damage SHALL scale by at most the realm's configured cap.

#### Scenario: Early run
- **WHEN** the run is at 00:20 in `mount_olympus`
- **THEN** only enemies from the first phase spawn

#### Scenario: Later run
- **WHEN** the run reaches 04:00
- **THEN** enemies spawn at a higher rate and from a larger pool than at 00:20

### Requirement: Fair spawn positions
Enemies SHALL spawn outside the visible area, inside the map, and not inside obstacles. If no valid position is found, the spawn SHALL be skipped rather than placed unfairly.

#### Scenario: Player in a corner
- **WHEN** the player stands in a map corner
- **THEN** enemies appear only from the open sides, never inside the view

### Requirement: Entity caps
The number of living enemies SHALL never exceed the current phase's maximum, and never exceed the global cap of 400. Enemy projectiles, player projectiles and pickups SHALL also be capped; XP beyond the pickup cap SHALL be merged into existing gems so no XP is lost.

#### Scenario: Spawn cap
- **WHEN** the number of living enemies equals the phase maximum
- **THEN** no new regular enemy spawns until one dies

### Requirement: Elites
Timed elite events SHALL spawn an elite version of an enemy: larger, much tougher, more dangerous, visually marked with a health bar, and guaranteed to drop a treasure chest.

#### Scenario: First elite
- **WHEN** the run reaches the first elite event in `mount_olympus` (02:00)
- **THEN** an elite enemy spawns and the player is notified

### Requirement: Finding the way
Enemies that walk toward a god SHALL find a way around obstacles and walls, including shifting walls while they stand:

- An enemy that can see a god walks straight at it.
- One that cannot see a god follows the shortest way around the obstacles toward the nearest god by path.
- One with no way to any god walks straight at the nearest god.

The way SHALL follow the gods as they move and the walls as they rise and sink. It SHALL cost no more per enemy as the horde grows, and stay deterministic (D5).

#### Scenario: Around a wall
- **WHEN** a god stands on the far side of a straight wall from a chaser, with the wall's end open
- **THEN** the chaser walks round the end of the wall and reaches the god, instead of staying at the wall

#### Scenario: Through the Labyrinth
- **WHEN** a god waits in a corridor of the Labyrinth while enemies spawn out of sight
- **THEN** the enemies come down the corridors and through breaches, and do not gather at walls

#### Scenario: In the open
- **WHEN** a chaser can see the god across open ground
- **THEN** it walks straight at the god, as before
