## ADDED Requirements

### Requirement: Save format version 7

The save's high scores SHALL also hold the Quick table. Saves of version 6 SHALL be migrated to version 7 keeping everything, with an empty Quick table.

#### Scenario: An older save

- **WHEN** a version 6 save with three solo high scores is loaded
- **THEN** it becomes version 7 with the same three solo high scores and an empty Quick table

### Requirement: Save format version 8

The save SHALL also hold the Daily Trial of the last day played: its date, the number of attempts and the best result (score, time, kills, level, realms cleared). Saves of version 7 SHALL be migrated to version 8 keeping everything, with no trial played. A trial record of another day SHALL read as no trial played today.

#### Scenario: An older save

- **WHEN** a version 7 save is loaded
- **THEN** it becomes version 8 with everything kept and no Daily Trial played

#### Scenario: Yesterday's trial

- **WHEN** a save's Daily Trial record is dated yesterday
- **THEN** today's best is empty and the trial counts as not played today
