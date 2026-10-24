## ADDED Requirements

### Requirement: Splash on hit
A weapon with a splash SHALL, on every hit, also strike every other living enemy within the splash radius of the target for the splash fraction of the weapon's damage. Splash strikes SHALL go through the one damage pipeline (might, element, critical hits, the target's damage taken), count toward the weapon's damage, and SHALL not themselves splash.

#### Scenario: A crowd
- **WHEN** the Spear of Olympus hits a satyr with two more satyrs within its splash radius
- **THEN** both are struck for half the spear's damage before multipliers, and a burst shows where

#### Scenario: No chain of bursts
- **WHEN** a splash strike hits an enemy
- **THEN** that strike does not splash again
