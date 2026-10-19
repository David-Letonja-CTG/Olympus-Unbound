## ADDED Requirements

### Requirement: Runs with allies
A solo run with bot allies SHALL go to its own high-score table, *With allies*, kept like the others (the ten best, at most once per run), shown in the Hall of Glory beside Solo and Co-op. Such a run SHALL NOT count as co-op for high scores, achievements or quests; every other goal SHALL count as usual. The run summary SHALL say the run was played with allies.

#### Scenario: A run with allies
- **WHEN** a run with the player and two allies ends with a score above the table's lowest
- **THEN** it enters the With allies table, not the solo or co-op table

#### Scenario: Not co-op
- **WHEN** a run with allies clears a realm
- **THEN** `brothers_in_arms` (clear a realm in co-op) does not unlock, and `first_gate` does
