## ADDED Requirements

### Requirement: Save format version 9
The save's settings SHALL also hold the player's name: up to 16 characters, empty when none was given. It is the name used in co-op lobbies (shown as "Hero" when empty) and on the share picture. The Settings screen and the Co-op screen SHALL both edit it, and it SHALL persist. Saves of version 8 SHALL be migrated to version 9 keeping everything, with no name. An invalid name SHALL read as none; a long one SHALL be shortened.

#### Scenario: The name persists
- **WHEN** the player types the name "Ada" on the Co-op screen and reloads the page
- **THEN** the Co-op screen and Settings show "Ada"

#### Scenario: An older save
- **WHEN** a version 8 save is loaded
- **THEN** it becomes version 9 with everything kept and no name
