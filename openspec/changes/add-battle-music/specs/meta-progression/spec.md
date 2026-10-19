## ADDED Requirements

### Requirement: Save format version 6
The save's settings SHALL also hold the music volume (0–1, default 0.5). Saves of version 5 SHALL be migrated to version 6 keeping everything, with the default music volume; an invalid music volume SHALL take the default.

#### Scenario: An older save
- **WHEN** a version 5 save with the sound effects at 30% is loaded
- **THEN** it becomes version 6 with the sound effects at 30% and the music at 50%
