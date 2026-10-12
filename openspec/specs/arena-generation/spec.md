# arena-generation Specification

## Purpose
Generates each run's arena procedurally from a realm definition and a seed, so arenas vary between runs yet stay readable, themed and exactly reproducible.

## Requirements

### Requirement: Deterministic generation
Generating an arena from the same realm definition and the same seed SHALL produce identical arena data (terrain, obstacles, decorations, spawn point, boss arena). Different seeds SHALL produce different layouts. Generation SHALL NOT depend on rendering, the browser or global randomness.

#### Scenario: Same seed, same arena
- **WHEN** `mount_olympus` is generated twice with seed `847291`
- **THEN** both results are identical

#### Scenario: Different seed, different arena
- **WHEN** `mount_olympus` is generated with seeds `1` and `2`
- **THEN** the obstacle layouts differ

### Requirement: Realm-themed content
An arena SHALL only use the terrain types, obstacles, decorations and points of interest that its realm definition lists. Mount Olympus SHALL contain grass and earth terrain, marble plazas, temple ruins (column rings), a temple, ruined walls, roads, statues, olive groves, scattered decoration and an impassable cliff border.

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

### Requirement: Roads
An arena SHALL have roads, as defined by its realm, that join the spawn plaza to every ruin plaza and to the boss arena. Roads SHALL be open ground: no obstacle SHALL stand on a road.

#### Scenario: Every ruin is reachable by road
- **WHEN** `mount_olympus` is generated with any of 20 seeds
- **THEN** a road starts at the spawn plaza and ends at each ruin plaza and at the boss arena, and no obstacle overlaps a road

### Requirement: Temple landmark
A realm MAY define a temple landmark; Mount Olympus SHALL place one temple per arena: a rectangular stylobate with a colonnade (some columns fallen) and an altar with braziers, outside the spawn plaza and the boss arena, joined to the spawn by a road. Its columns SHALL keep the passable gap so the temple can be walked through.

#### Scenario: One walkable temple
- **WHEN** `mount_olympus` is generated with any of 20 seeds
- **THEN** it has exactly one temple, away from the spawn and the boss arena, whose columns keep at least the minimum gap

### Requirement: Maze
A realm MAY define a maze: walls of obstacle blocks along the edges of a grid of square cells over the playable area, carved so that every cell is reachable, with a configured share of inner walls knocked down and single blocks missing. Its blocks SHALL keep the realm's minimum gap, which a realm MAY set below a player's width so that walls block movement. No block SHALL stand on a road, in the spawn plaza, in the boss arena or within a ruin or temple site, so roads cut passages through the maze and sites open as rooms. From the spawn, a player SHALL be able to reach the boss arena and nearly all of the open floor.

#### Scenario: Solid walls
- **WHEN** `labyrinth_of_crete` is generated
- **THEN** most wall blocks stand closer to a neighbouring block than a player's width

#### Scenario: Every way leads somewhere
- **WHEN** `labyrinth_of_crete` is generated with any of 10 seeds
- **THEN** a player-sized body can walk from the spawn to the boss arena, and over 97% of the floor it could stand on is reachable from the spawn

### Requirement: The boss road's thread
A realm's roads MAY name a thread colour; the road to the boss arena SHALL then be drawn with a fine line of that colour along it.

#### Scenario: One road to the boss
- **WHEN** an arena is generated
- **THEN** exactly one road is marked as the road to the boss arena and it ends there
