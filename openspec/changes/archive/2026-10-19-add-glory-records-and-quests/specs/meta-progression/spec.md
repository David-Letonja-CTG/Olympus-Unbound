## ADDED Requirements

### Requirement: Save format version 4
The save SHALL also hold the run history, the solo and co-op high scores, unlocked achievements with their dates, achievement progress, and the day's quests with their progress. Saves of version 3 SHALL be migrated to version 4 keeping all their progress and settings, with empty records. Records SHALL be validated entry by entry like the rest of the save: an invalid entry is dropped, unknown achievement and quest IDs are dropped, and the rest loads.

#### Scenario: An older save
- **WHEN** a version 3 save with 800 gold is loaded
- **THEN** it becomes version 4 with 800 gold, no history, empty high-score tables and no achievements

#### Scenario: A broken record
- **WHEN** one of five high-score entries has no score
- **THEN** the other four load
