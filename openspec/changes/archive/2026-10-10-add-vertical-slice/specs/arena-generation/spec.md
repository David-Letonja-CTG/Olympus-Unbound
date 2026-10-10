# Spec Delta

## Purpose

Generates each run's arena procedurally from a realm definition and a seed, so arenas vary between runs yet stay readable, themed and exactly reproducible.

## ADDED Requirements

### Requirement: Deterministic generation
Generating an arena from the same realm definition and the same seed SHALL produce identical arena data (terrain, obstacles, decorations, spawn point, boss arena). Different seeds SHALL produce different layouts. Generation SHALL NOT depend on rendering, the browser or global randomness.

#### Scenario: Same seed, same arena
- **WHEN** `mount_olympus` is generated twice with seed `847291`
- **THEN** both results are identical

#### Scenario: Different seed, different arena
- **WHEN** `mount_olympus` is generated with seeds `1` and `2`
- **THEN** the obstacle layouts differ

### Requirement: Realm-themed content
An arena SHALL only use the terrain types, obstacles, decorations and points of interest that its realm definition lists. Mount Olympus SHALL contain grass and earth terrain, marble plazas, temple ruins (column rings), statues, olive groves, scattered decoration and an impassable cliff border.

#### Scenario: No foreign objects
- **WHEN** `mount_olympus` is generated with any seed
- **THEN** every obstacle and decoration kind is one listed by the `mount_olympus` realm definition

### Requirement: Readable, fair layout
The player spawn SHALL be at the centre of a clear plaza with no obstacle within the configured clear radius. A boss arena SHALL be reserved as a clear circular area away from the spawn. Obstacles SHALL NOT overlap each other, SHALL keep a passable gap between them, and SHALL stay inside the map bounds. The total obstacle count SHALL stay within the realm's configured density.

#### Scenario: Clear spawn
- **WHEN** an arena is generated with any of 50 different seeds
- **THEN** no obstacle lies within the spawn clear radius and no obstacle lies within the boss arena

#### Scenario: Passable gaps
- **WHEN** an arena is generated
- **THEN** the distance between any two obstacles' edges is at least the configured minimum gap

### Requirement: Configurable dimensions
Map width, height and tile size SHALL come from the realm definition; changing them SHALL change the generated arena accordingly without code changes.

#### Scenario: Smaller test map
- **WHEN** a realm definition with a 20×20-tile map is generated
- **THEN** the terrain grid is 20×20 and all objects lie within it
