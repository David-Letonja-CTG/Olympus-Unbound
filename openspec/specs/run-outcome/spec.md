# run-outcome Specification

## Purpose
Defines how a run ends (victory, defeat or abandoning), how rewards are calculated and granted exactly once, and the run summary the player sees afterwards.

## Requirements

### Requirement: Run endings
A run SHALL end exactly once with one outcome: `victory` when the realm boss is defeated, `defeat` when every player has died without a revival left, or `abandoned` when the player abandons from the pause menu after confirming. After the run ends the simulation SHALL stop.

#### Scenario: Death and boss kill in the same step
- **WHEN** the player dies in the same step in which the boss dies
- **THEN** the run ends once, with outcome `victory`

#### Scenario: Ending twice
- **WHEN** the end of the run is triggered a second time
- **THEN** nothing changes and no second result is produced

### Requirement: Reward rules
Rewards SHALL be: all gold collected in the run, plus the realm's victory bonus on `victory`; on `abandoned` only half of the collected gold (rounded down). Every weapon, armour and relic held at the end SHALL become discovered. Statistics (runs, victories, kills, best survival time) SHALL be updated.

#### Scenario: Victory reward
- **WHEN** a run in `mount_olympus` ends in victory with 180 gold collected and a victory bonus of 250
- **THEN** the player is granted 430 gold

#### Scenario: Abandoned reward
- **WHEN** a run is abandoned with 75 gold collected
- **THEN** the player is granted 37 gold

### Requirement: Rewards granted once
Each run SHALL have a unique ID; rewards for a run ID SHALL be granted and saved at most once, even if the end of the run is reported again or the summary is reopened.

#### Scenario: Reported twice
- **WHEN** the same run result is processed twice
- **THEN** the player's gold increases only once

### Requirement: Run summary
After a run ends the game SHALL show the run summary: outcome, survival time, level, kills, gold collected, gold granted, the final loadout with levels and active synergies, and newly discovered items. From the summary the player SHALL be able to return to the main menu or start another run with the same god and realm and a new seed.

#### Scenario: Back to the menu
- **WHEN** the player chooses Main menu on the summary
- **THEN** the main menu shows the new gold total
