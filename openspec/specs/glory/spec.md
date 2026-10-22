# glory Specification

## Purpose
Defines how a run is scored and remembered: the glory score, the solo and co-op high scores, achievements, daily quests and the Hall of Glory.

## Requirements

### Requirement: Glory score
Every finished run SHALL have a glory score: kills + 2 × seconds survived + 10 × level reached + 1,000 × realms cleared. Abandoned runs SHALL score like any other run.

#### Scenario: Scoring a run
- **WHEN** a run ends with 300 kills after 400 seconds at level 12 with 1 realm cleared
- **THEN** its score is 300 + 800 + 120 + 1,000 = 2,220

### Requirement: High scores
The game SHALL keep the ten best scores for solo runs and, separately, the ten best for co-op runs (a party of two or more). Each entry SHALL show the god, the starting realm, realms cleared, time, kills, level, score and the date. A run SHALL enter a table at most once. The Hall of Glory SHALL show both tables and SHALL filter them by god.

#### Scenario: A new best solo run
- **WHEN** a solo run scores more than every entry of the solo table
- **THEN** it is first in the solo table, the co-op table is unchanged, and the run summary says "New high score · #1"

#### Scenario: A full table
- **WHEN** the solo table holds ten entries and a run scores less than all of them
- **THEN** the table is unchanged

#### Scenario: Co-op counts apart
- **WHEN** a guest's co-op run ends
- **THEN** it may enter the co-op table on the guest's own save, never the solo table

#### Scenario: Filtering by god
- **WHEN** the player filters the Hall's solo table by `hades`
- **THEN** only Hades's runs are listed

### Requirement: Achievements
Achievements SHALL be content data: a name, a description, a goal and a gold reward. A goal SHALL measure kills, seconds survived, level, realms cleared, gold collected, active synergies or runs played, either within one run or added up over every run, optionally only for one god or only in solo or co-op play. A goal over every god SHALL be met when each god has met it. An achievement SHALL unlock once, when a run meets its goal, and SHALL pay its gold once. The Hall SHALL list every achievement, unlocked ones with their date, locked ones with progress where progress adds up.

#### Scenario: First realm
- **WHEN** a run clears its first realm
- **THEN** `first_gate` unlocks, its gold is added, and the summary names it

#### Scenario: Lifetime kills
- **WHEN** a player who has slain 9,800 foes over earlier runs slays 300 in a run
- **THEN** `slayer_10000` unlocks; before that run the Hall showed its progress as 9,800 / 10,000

#### Scenario: Every god
- **WHEN** `pantheon` asks for a realm cleared with every god and only Athena has not cleared one yet
- **THEN** it unlocks when Athena clears a realm, not before

#### Scenario: Never twice
- **WHEN** a later run meets an unlocked achievement's goal again
- **THEN** no gold is paid again

### Requirement: Daily quests
Each local calendar day SHALL have three different quests, chosen from the quest content by the date alone, so the same date always gives the same quests, and at most one of them SHALL ask for a particular god. Quest goals SHALL use the achievement goal vocabulary; within-run goals count the best run of the day, added-up goals add the day's runs. A completed quest SHALL pay its gold once. At local midnight the next day's quests SHALL replace them with no progress. The Hall SHALL show the day's quests with progress and the time until new quests; the main menu SHALL show how many of today's quests are done.

#### Scenario: Same date, same quests
- **WHEN** the quests of 2026-10-19 are chosen twice
- **THEN** they are the same three quests both times

#### Scenario: Progress over the day
- **WHEN** today's quest asks for 600 kills and two runs today slay 350 and 300
- **THEN** the quest completes after the second run and pays its gold

#### Scenario: A new day
- **WHEN** the game is opened on the next day
- **THEN** three quests for that date are shown with no progress

### Requirement: Hall of Glory

The main menu SHALL lead to the Hall of Glory, which shows the high scores (solo, With allies, co-op and Quick) for this device and for the world (spec: world-leaderboards), the achievements, the day's quests and today's Daily Trial with the player's best score today and the world's.

#### Scenario: Opening the Hall

- **WHEN** the player opens Glory from the main menu
- **THEN** the solo and co-op tables, every achievement, today's three quests and today's Daily Trial are shown

### Requirement: Runs with allies
A solo run with bot allies SHALL go to its own high-score table, *With allies*, kept like the others (the ten best, at most once per run), shown in the Hall of Glory beside Solo and Co-op. Such a run SHALL NOT count as co-op for high scores, achievements or quests; every other goal SHALL count as usual. The run summary SHALL say the run was played with allies.

#### Scenario: A run with allies
- **WHEN** a run with the player and two allies ends with a score above the table's lowest
- **THEN** it enters the With allies table, not the solo or co-op table

#### Scenario: Not co-op
- **WHEN** a run with allies clears a realm
- **THEN** `brothers_in_arms` (clear a realm in co-op) does not unlock, and `first_gate` does

### Requirement: Quick run high scores

The game SHALL keep the ten best scores of quick runs (spec: quick-runs) in their own table, whatever the party. The entries are like the other tables', with the party size shown. The Hall of Glory SHALL show it as **Quick**, filterable by god.

#### Scenario: The Quick table

- **WHEN** the player opens the Hall of Glory and chooses Quick
- **THEN** only quick runs are listed, best first
