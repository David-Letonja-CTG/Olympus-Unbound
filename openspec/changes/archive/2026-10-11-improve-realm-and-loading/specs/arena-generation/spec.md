# Spec Delta

## MODIFIED Requirements

### Requirement: Realm-themed content
An arena SHALL only use the terrain types, obstacles, decorations and points of interest that its realm definition lists. Mount Olympus SHALL contain grass and earth terrain, marble plazas, temple ruins (column rings), a temple, ruined walls, roads, statues, olive groves, scattered decoration and an impassable cliff border.

#### Scenario: No foreign objects
- **WHEN** `mount_olympus` is generated with any seed
- **THEN** every obstacle and decoration kind is one listed by the `mount_olympus` realm definition

## ADDED Requirements

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
