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
The settings SHALL offer graphics quality Low, Medium and High. Higher levels SHALL add more lights, fog, bloom and particles; Low SHALL stay playable with software rendering. The default SHALL be chosen from a capability check on first launch, and changes SHALL apply without restarting a run.

#### Scenario: Switching to Low during a run
- **WHEN** the player selects Low in the pause menu
- **THEN** bloom and fog are reduced at once and the run continues

#### Scenario: Software rendering
- **WHEN** the game starts in a browser without hardware graphics acceleration
- **THEN** the default quality is Low

### Requirement: Painted ground
The ground of each run SHALL be painted from its arena data: smooth, blended transitions between terrain types, ground texture, the roads, soft shading around plazas, ruins and the cliff edge, and a rock face along the border. The painting SHALL be deterministic for an arena (same seed, same ground) and its resolution SHALL follow the graphics quality.

#### Scenario: Same arena, same ground
- **WHEN** the same arena is painted twice
- **THEN** both paintings are identical

#### Scenario: Low quality
- **WHEN** the graphics quality is Low
- **THEN** the ground is painted at a lower resolution than at High
