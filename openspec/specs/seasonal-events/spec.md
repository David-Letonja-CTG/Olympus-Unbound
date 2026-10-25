# seasonal-events Specification

## Purpose
TBD - created by archiving change add-night-of-hecate. Update Purpose after archive.

## Requirements

### Requirement: Event dates
Seasonal events SHALL be content data with a yearly window of month-days, which may wrap the new year. An event SHALL be on while the device's local date is inside its window, every year. The hidden admin page SHALL offer a switch for that browser only: by the calendar, one event forced on, or all off. The switch SHALL persist in that browser. When windows overlap, the first event in content order SHALL be on.

#### Scenario: Halloween
- **WHEN** the device's date is October 31
- **THEN** `night_of_hecate` is on

#### Scenario: After the season
- **WHEN** the device's date is November 8
- **THEN** no event is on

#### Scenario: Forced on
- **WHEN** the admin switch forces `night_of_hecate` on in July
- **THEN** the event is on in that browser only

### Requirement: In the menus
While an event is on, the main menu SHALL show its button with the days left, leading to god selection with the event's realm chosen. The realm lists for solo runs and co-op rooms SHALL show the event's realm first. Event realms SHALL not be shown while their event is off. The Daily Trial SHALL never pick an event realm.

#### Scenario: The event button
- **WHEN** the Night of Hecate is on with 6 days left and the player opens the main menu
- **THEN** a "The Night of Hecate · 6 days left" button leads to choosing a god for `crossroads_of_hecate`

#### Scenario: Out of season
- **WHEN** no event is on
- **THEN** `crossroads_of_hecate` is in no realm list and the menu shows no event button

### Requirement: Event runs and items
A run SHALL carry the event that was on when it began, and a room's run SHALL carry its host's. Weapons and relics of an event SHALL be offered only in runs of that event. Event weapons SHALL not count toward a god's arsenal.

#### Scenario: Hecate's Torches
- **WHEN** a run of `night_of_hecate` offers a new weapon
- **THEN** `hecates_torches` may be among the offers

#### Scenario: Out of season
- **WHEN** a run without an event levels up
- **THEN** `hecates_torches` and `key_of_hecate` are never offered

### Requirement: The Night of Hecate
The event `night_of_hecate` SHALL run from October 24 to November 7.

Its realm `crossroads_of_hecate` SHALL be a moonlit graveyard where three roads meet, lit by gourd lanterns. It SHALL spawn `restless_dead`, `empusa`, `lampad_of_hecate` (throws fire from afar) and `hound_of_hecate` (charges), with hordes and elites.

After 7 minutes `hecate` SHALL appear:
- Three torches, each a damageable part, SHALL guard her: while any burns she SHALL take a third of the damage, and a quenched torch SHALL relight after 18 seconds.
- Ghost fire SHALL fall on circles under the players, and she SHALL call the dead.
- Below half health it SHALL be announced that the three roads close. Rings of stone SHALL then rise round her with three ways out, and she SHALL call her hounds.

Its items SHALL be `hecates_torches` and `key_of_hecate`. Its achievements SHALL be `queen_of_crossroads` (clear the realm) and `night_walker` (survive 10 minutes from it).

#### Scenario: Torches guard her
- **WHEN** a god strikes Hecate while one of her torches burns
- **THEN** she takes a third of the damage

#### Scenario: The three roads close
- **WHEN** Hecate falls below half health
- **THEN** "The three roads close!" is announced and stone rings with three gaps rise round her

#### Scenario: Queen of the Crossroads
- **WHEN** a run that started at `crossroads_of_hecate` clears it
- **THEN** `queen_of_crossroads` unlocks; the same clear from another starting realm does not count

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
