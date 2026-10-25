# visual-atmosphere Specification

## Purpose
Gives the arenas a dark, lit, atmospheric look — night, fog, firelight and lightning — without ever hiding the information the player needs to survive.

## Requirements

### Requirement: Dynamic lighting
The arena SHALL be dark outside light sources. The player SHALL carry a light; lightning attacks, fire, projectiles that glow, braziers placed by arena generation, elites and the boss SHALL emit light. Lit sprites SHALL be shaded by nearby lights.

#### Scenario: Lightning lights the night
- **WHEN** Zeus's `wrath_of_olympus` strikes an enemy in the dark
- **THEN** the area around the strike is briefly lit

#### Scenario: Braziers
- **WHEN** an arena is generated for `mount_olympus`
- **THEN** temple plazas have braziers that light their surroundings, placed deterministically from the seed

### Requirement: Atmosphere effects
The arena SHALL show ground fog, drifting embers or dust, soft shadows under characters and obstacles, colour grading and a vignette; bright effects (lightning, fire, crits) SHALL bloom.

#### Scenario: Shadows
- **WHEN** an enemy stands on the ground
- **THEN** a soft shadow is drawn beneath it

### Requirement: Readability guarantees
Atmosphere SHALL NOT reduce readability: the player, every enemy within view, enemy projectiles, pickups and boss telegraphs SHALL remain clearly visible regardless of darkness, fog or quality level. Enemies outside the player's light SHALL still be visible by a rim highlight or outline.

#### Scenario: Enemy in the dark
- **WHEN** an enemy is inside the view but outside every light
- **THEN** its silhouette remains visible against the ground

#### Scenario: Telegraph under fog
- **WHEN** a boss telegraph appears in a fogged area
- **THEN** the telegraph is drawn above the fog at full strength

### Requirement: Graphics quality levels

The settings SHALL offer graphics quality Low, Medium and High. Higher levels SHALL add more lights, fog, bloom and particles; Low SHALL stay playable with software rendering and on phones. The default SHALL be chosen from a capability check on first launch: Low on a touch device or without hardware graphics acceleration. Changes SHALL apply without restarting a run.

#### Scenario: Switching to Low during a run

- **WHEN** the player selects Low in the pause menu
- **THEN** bloom and fog are reduced at once and the run continues

#### Scenario: Software rendering

- **WHEN** the game starts in a browser without hardware graphics acceleration
- **THEN** the default quality is Low

#### Scenario: A phone's first launch

- **WHEN** the game starts for the first time on a device whose main pointer is touch
- **THEN** the default quality is Low

### Requirement: Painted ground
The ground of each run SHALL be painted from its arena data: smooth, blended transitions between terrain types, ground texture, the roads, soft shading around plazas, ruins and the cliff edge, and a rock face along the border. The painting SHALL be deterministic for an arena (same seed, same ground) and its resolution SHALL follow the graphics quality.

A terrain type MAY name a pattern, painted into its ground with the rest: stone slabs, cobbles, cracked rock, sand ripples, drifts of ash, wet mud, grass, earth or moss. A pattern SHALL fade out where its ground blends into the next. Patterns SHALL be painted once, while the realm loads, and SHALL cost nothing while playing. They SHALL never compete with what the player must read: enemies, telegraphs and pickups stay as readable as on plain ground.

#### Scenario: Same arena, same ground
- **WHEN** the same arena is painted twice
- **THEN** both paintings are identical

#### Scenario: Low quality
- **WHEN** the graphics quality is Low
- **THEN** the ground is painted at a lower resolution than at High

#### Scenario: Flagstones
- **WHEN** a Labyrinth of Crete arena is painted
- **THEN** its `flagstone` ground shows slabs with grout lines, and its `mosaic` ground shows cobbles

#### Scenario: No frame cost
- **WHEN** a run with patterned ground is measured with a full horde
- **THEN** its frame times match a run without patterns, and loading takes about as long

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
