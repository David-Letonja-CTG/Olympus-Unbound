# Spec Delta

## ADDED Requirements

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
