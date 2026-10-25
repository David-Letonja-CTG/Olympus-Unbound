## ADDED Requirements

### Requirement: Event currency
Every event SHALL name a currency. In runs of that event the currency SHALL drop from a share of kills, a set number from every elite and from the boss. It SHALL be drawn to the gods' magnet and collected like gold, shared by the party. A finished run's currency SHALL be added to the player's balance for that event once, and the run summary SHALL show it. Runs without the event SHALL drop none.

#### Scenario: An elite at the crossroads
- **WHEN** a run of `night_of_hecate` slays an elite
- **THEN** 3 honey cakes drop, and once collected the summary shows them and the balance grows by 3

#### Scenario: Out of season
- **WHEN** a run without an event slays an elite
- **THEN** no honey cakes drop

### Requirement: Event shop
The Progression screen SHALL show each event's shop while the event is on, or while the player holds its currency or any of its rewards. A reward SHALL cost currency of its event and be bought once, for good. A reward SHALL either add stat modifiers to every run, or let one of the event's items be offered in every run, all year. A room's run SHALL use its host's unlocked items.

#### Scenario: Torchbearer
- **WHEN** the player buys `torchbearer` and later starts a run in July
- **THEN** `hecates_torches` may be offered in that run

#### Scenario: Too dear
- **WHEN** the player holds 30 honey cakes
- **THEN** `ward_of_the_crossroads` (120) cannot be bought

#### Scenario: Once
- **WHEN** the player owns `hecates_blessing`
- **THEN** it shows as owned and cannot be bought again

### Requirement: Event table
Runs that started in an event's realm SHALL enter an event table in the Hall of Glory on this device, instead of the solo, co-op or allies tables. The Hall SHALL show that table while an event is on or once it holds runs. World boards SHALL count such runs as the mode they were played in.

#### Scenario: A night at the crossroads
- **WHEN** a solo run that started at `crossroads_of_hecate` ends
- **THEN** it enters the event table, not the solo table
