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

### Requirement: Landmarks
Every realm SHALL have one landmark, a great set piece of its myth, placed on every arena:

| Realm | Landmark |
|---|---|
| `mount_olympus` | the fallen colossus of Zeus |
| `the_underworld` | the gates of Hades |
| `lernaean_marsh` | a sunken temple |
| `aegean_shore` | a beached trireme |
| `labyrinth_of_crete` | Daedalus's workshop and his wings |
| `mount_othrys` | the throne of Kronos |
| `crossroads_of_hecate` | a hekataion of the triple goddess |

A landmark SHALL stand on its own site, away from the spawn, the boss arena, the roads and the other sites. Gods and monsters SHALL walk round it. It MAY give off light and stamp its own ground. Its placement SHALL be deterministic for an arena.

#### Scenario: The colossus
- **WHEN** a `mount_olympus` arena is generated
- **THEN** exactly one landmark stands on it, off every road and clear of the spawn plaza and the boss arena

#### Scenario: Every realm
- **WHEN** an arena of any realm is generated from any seed
- **THEN** it has its realm's landmark

### Requirement: Breakable props
Every realm SHALL scatter small clusters of breakable props of its own kind (jars, urns, baskets, crates, gourds) across its arena, deterministically, at most 32. Props SHALL stand clear of obstacles, the spawn plaza, the boss arena and road centres, and SHALL not block movement. A god who walks into a standing prop SHALL break it: it shatters visibly and audibly and drops gold or XP, and rarely a heal. Each prop breaks once. Enemies SHALL not break props. In a room, every member SHALL see the same props broken.

#### Scenario: Smashing an amphora
- **WHEN** a god walks into a standing amphora on `mount_olympus`
- **THEN** it shatters, drops its loot, and stays broken for the rest of the realm

#### Scenario: Monsters leave them
- **WHEN** an enemy walks over a prop
- **THEN** the prop stays standing

#### Scenario: Same props for everyone
- **WHEN** the host breaks a prop in a room
- **THEN** every guest sees that prop broken

#### Scenario: A fair layout
- **WHEN** an arena of any realm is generated from any seed
- **THEN** its props are at most 32, and none overlaps an obstacle, the spawn plaza or the boss arena

### Requirement: Footing
Terrain MAY change movement. A terrain's speed SHALL multiply the walking speed of every god and monster on it, bosses excepted. A terrain's grip SHALL set how quickly a god's walk follows their input, so that on low grip a god keeps sliding after letting go and turns wide. Dashes SHALL ignore footing. Ground with normal footing SHALL move exactly as without footing. The Lernaean Marsh's bog and the Aegean Shore's shallows SHALL slow movement; the Underworld's frozen Cocytus SHALL be slippery.

#### Scenario: Wading through the bog
- **WHEN** a god or a monster walks on `bog` in `lernaean_marsh`
- **THEN** they move at 80% of their speed

#### Scenario: Sliding on the Cocytus
- **WHEN** a god walking on `cocytus_ice` lets go of the controls
- **THEN** they slide on for a moment before stopping

#### Scenario: Firm ground
- **WHEN** a god walks on ground without footing
- **THEN** they start, stop and turn at once, as before

### Requirement: Map hazards
Realms SHALL have hazards that hurt gods and monsters alike, warned by the same telegraphs as boss attacks:
- lava vents on Mount Othrys and in the Underworld, erupting again and again;
- teetering columns on Mount Olympus, each falling once along a line when a god comes near, then staying fallen;
- crushing walls across the Labyrinth's ways, slamming again and again.

Their damage to gods SHALL grow as monster damage grows. Their damage to monsters SHALL be a share of the monster's health, and bosses SHALL be spared. A perfect dodge SHALL avoid them. Hazards SHALL act only near the gods.

#### Scenario: A vent erupts
- **WHEN** a god stands by a lava vent on `mount_othrys`
- **THEN** the vent marks a circle and, after its warning, hurts every god and monster in it

#### Scenario: A column falls
- **WHEN** a god first comes near a teetering column on `mount_olympus`
- **THEN** it marks a line, falls along it hurting everyone under it, and never falls again

#### Scenario: Luring the horde
- **WHEN** monsters chase a god across a crushing wall's line in `labyrinth_of_crete` as it slams
- **THEN** they take damage

### Requirement: Map helpers
Realms SHALL have helpers:
- healing springs that heal a god standing in them until spent, then refill after a while;
- cold braziers that a god lights by touching them, for the rest of the realm, after which they give light and set nearby monsters burning;
- walls with breaches that make chokepoints.

In a room, every member SHALL see the same fallen columns, lit braziers and dry springs.

#### Scenario: Drinking from a spring
- **WHEN** a wounded god stands in a healing spring
- **THEN** they heal quickly until the spring runs dry, and it refills later

#### Scenario: Lighting a brazier
- **WHEN** a god touches a cold brazier in `the_underworld`
- **THEN** it lights for the rest of the realm, and monsters near it start burning
