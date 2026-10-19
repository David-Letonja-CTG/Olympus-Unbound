## ADDED Requirements

### Requirement: Save format version 5
The save SHALL also hold the With allies high-score table, and run records SHALL say how many of the gods were bots. Saves of version 4 SHALL be migrated to version 5 keeping everything, with an empty With allies table and no bots in older records.

#### Scenario: An older save
- **WHEN** a version 4 save with three solo high scores is loaded
- **THEN** it becomes version 5 with the same three solo high scores and an empty With allies table
