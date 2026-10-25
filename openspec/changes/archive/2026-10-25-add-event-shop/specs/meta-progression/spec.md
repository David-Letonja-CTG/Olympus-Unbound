## ADDED Requirements

### Requirement: Save format version 11
The save SHALL also hold each event's currency balance, the event rewards bought and the event high-score table. Saves of version 10 SHALL be migrated to version 11 keeping everything, with no currency, no rewards and an empty event table. Unknown events and rewards SHALL be dropped on loading.

#### Scenario: An older save
- **WHEN** a version 10 save is loaded
- **THEN** it becomes version 11 with everything kept and no event currency, rewards or event table
