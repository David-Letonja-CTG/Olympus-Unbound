## ADDED Requirements

### Requirement: Ambient life
Realms SHALL feel alive through decoration that never changes play:
- weather particles on the realm's wind;
- lightning flashes with distant thunder where the realm has storms;
- cloud shadows over the ground;
- glints on water;
- smoke from fires;
- creatures near the gods that flee when one comes close;
- swaying trees and reeds.

None of it SHALL be known to the simulation, and none of it SHALL hide what the player must react to. On Low it SHALL be off entirely; Medium SHALL show a reduced amount; High SHALL show all of it.

#### Scenario: Doves take flight
- **WHEN** a god walks up to doves on `mount_olympus` at High quality
- **THEN** they fly off and are gone

#### Scenario: Zeus's storm
- **WHEN** a run on `mount_olympus` goes on for a minute at Medium or High quality
- **THEN** the realm flashes with lightning at least once, and thunder follows

#### Scenario: Phones keep their frame time
- **WHEN** the graphics quality is Low
- **THEN** no weather, lightning, cloud shadows, glints, smoke, wildlife or swaying is drawn
