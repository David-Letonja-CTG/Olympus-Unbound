# Spec Delta

## REMOVED Requirements

### Requirement: Reward rules
**Reason**: there is no victory anymore (endless runs); boss gold is part of the run's gold.
**Migration**: replaced by "Rewards" below.

## MODIFIED Requirements

### Requirement: Run endings
A run SHALL end exactly once with one outcome: `defeat` when every player has died without a revival left, or `abandoned` when the player abandons from the pause menu after confirming. Defeating a realm's boss SHALL NOT end the run (see endless-run). After the run ends the simulation SHALL stop.

#### Scenario: Death and boss kill in the same step
- **WHEN** the player dies in the same step in which the boss dies
- **THEN** the run ends once, with outcome `defeat`, one realm cleared and the boss's gold counted

#### Scenario: Ending twice
- **WHEN** the end of the run is triggered a second time
- **THEN** nothing changes and no second result is produced

### Requirement: Run summary
After a run ends the game SHALL show the run summary: outcome, survival time, realms cleared and the realm reached, level, kills, gold collected, gold granted, the final loadout with levels and active synergies, and newly discovered items. From the summary the player SHALL be able to return to the main menu or start another run with the same god and starting realm and a new seed.

#### Scenario: Back to the menu
- **WHEN** the player chooses Main menu on the summary
- **THEN** the main menu shows the new gold total

## ADDED Requirements

### Requirement: Rewards
Rewards SHALL be all gold collected in the run, including each defeated boss's gold; on `abandoned` only half of the collected gold (rounded down). Every weapon, armour and relic held at the end SHALL become discovered. Statistics (runs, realms cleared, kills, best survival time) SHALL be updated.

#### Scenario: Defeat after a boss
- **WHEN** a run ends in defeat with 430 gold collected, 250 of it from the Cyclops
- **THEN** the player is granted 430 gold and one realm cleared is added to the statistics

#### Scenario: Abandoned reward
- **WHEN** a run is abandoned with 75 gold collected
- **THEN** the player is granted 37 gold
