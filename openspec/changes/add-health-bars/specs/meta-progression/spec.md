# Spec Delta

## MODIFIED Requirements

### Requirement: Settings
The settings screen SHALL let the player change sound effect volume, screen shake on/off, damage numbers on/off, enemy health bars on/off and graphics quality (Low, Medium, High). Changes SHALL apply immediately, including to a running game, and SHALL persist.

#### Scenario: Muting
- **WHEN** the player sets sound effect volume to 0
- **THEN** no sound effects play and the setting is kept after reload

#### Scenario: Graphics quality persists
- **WHEN** the player sets graphics quality to High and reloads the page
- **THEN** graphics quality is still High

#### Scenario: Enemy health bars persist
- **WHEN** the player turns enemy health bars off and reloads the page
- **THEN** the setting is still off

## ADDED Requirements

### Requirement: Save format version 3
The save SHALL also record whether enemy health bars are shown. Saves of version 2 SHALL be migrated to version 3 keeping all their progress and settings, with enemy health bars on.

#### Scenario: An older save
- **WHEN** a version 2 save with damage numbers off is loaded
- **THEN** it becomes version 3 with damage numbers still off and enemy health bars on
