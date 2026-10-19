## ADDED Requirements

### Requirement: Glory in the run summary
The run summary SHALL show the run's glory score, its place when it entered a high-score table, every achievement it unlocked and every daily quest it completed, each with its gold. That gold SHALL count in the run's total like the run's own gold, and like it SHALL be granted once per run ID.

#### Scenario: A rewarding run
- **WHEN** a run unlocks `first_gate` (100 gold) and completes a quest (150 gold) and keeps 220 gold of its own
- **THEN** the summary lists both, and the total gold gained is 470

#### Scenario: Showing the summary again
- **WHEN** the same run's result is recorded a second time
- **THEN** nothing is unlocked, completed or paid again
