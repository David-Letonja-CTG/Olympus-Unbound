## ADDED Requirements

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
