## ADDED Requirements

### Requirement: Quick pace

In a quick run, each realm's clock SHALL run twice as fast as the run's clock. Its spawn phases, events, the merchant's visits, enemy growth and the boss SHALL arrive at half the time: the boss at 3:30 instead of 7:00. The run's own timer SHALL show real time. Enemies SHALL spawn at the same rate per real second as in a full run. Every god of the party SHALL gain double experience, so builds keep pace with the shorter realm. Everything else (gates, deeper realms, reviving, rewards per kill) SHALL work as in a full run. The quick pace SHALL be deterministic like any run (D5).

#### Scenario: The boss comes early

- **WHEN** a quick run of `mount_olympus` reaches 3:30 on its timer
- **THEN** the Cyclops arrives

#### Scenario: Double experience

- **WHEN** a god in a quick run picks up an experience gem worth 10
- **THEN** it gains 20 experience

#### Scenario: The same quick run twice

- **WHEN** two quick runs with the same seed, god and inputs are simulated
- **THEN** they produce the same result

### Requirement: Quick runs are remembered

A quick run's result SHALL say it was quick. It SHALL enter the Quick high-score table (spec: glory), never the solo, With allies or co-op tables. It SHALL count for statistics, achievements and daily quests like any run. The run summary's Play again SHALL start another quick run.

#### Scenario: A quick run's score

- **WHEN** a solo quick run ends with the best quick score so far
- **THEN** it is first in the Quick table, and the solo table is unchanged

#### Scenario: Play again

- **WHEN** the player taps Play again after a quick run
- **THEN** a new quick run starts
