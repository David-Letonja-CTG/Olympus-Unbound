# Spec Delta

## MODIFIED Requirements

### Requirement: Settings
The settings screen SHALL let the player change sound effect volume, screen shake on/off, damage numbers on/off and graphics quality (Low, Medium, High). Changes SHALL apply immediately, including to a running game, and SHALL persist.

#### Scenario: Muting
- **WHEN** the player sets sound effect volume to 0
- **THEN** no sound effects play and the setting is kept after reload

#### Scenario: Graphics quality persists
- **WHEN** the player sets graphics quality to High and reloads the page
- **THEN** graphics quality is still High

## ADDED Requirements

### Requirement: Save format version 2
The save SHALL also record whether the intro has been seen. Saves of version 1 SHALL be migrated to version 2 keeping all their progress; the intro counts as not seen, and graphics quality takes the capability-based default.

#### Scenario: Migrating a version 1 save
- **WHEN** a version 1 save with 300 gold and `vitality` level 2 is loaded
- **THEN** it becomes version 2 with 300 gold, `vitality` level 2 and the intro not yet seen
