## MODIFIED Requirements

### Requirement: Main menu

Opening the game SHALL show the main menu with the actions Play, Daily Trial, Co-op, Progression, Glory, Settings and Intro, after the intro on first launch. Every visible action SHALL work; the menu SHALL be operable with mouse and keyboard. Under the actions, the menu SHALL show the player's **next goal**: one line naming the nearest unfinished thing, linked to the screen where it lives. The candidates, in this order, are:

1. The Daily Trial, if the player has not played it today.
2. A blessing the player can afford now.
3. The unfinished daily quest closest to done.
4. The unfinished achievement whose progress is known and closest to done.

#### Scenario: First visit

- **WHEN** the player opens the game for the first time and the intro ends or is skipped
- **THEN** the main menu shows Play, Daily Trial, Co-op, Progression, Glory, Settings and Intro and the player's gold (0)

#### Scenario: Keyboard navigation

- **WHEN** the player tabs to Play and presses Enter
- **THEN** god selection opens

#### Scenario: Next goal is the trial

- **WHEN** the player has not played today's Daily Trial
- **THEN** the next goal invites them to today's trial and opens it

#### Scenario: Next goal is a blessing

- **WHEN** today's trial is played and the player has 150 gold and Vitality's next level costs 100
- **THEN** the next goal names Vitality and its price, and opens Progression

#### Scenario: Next goal is a quest

- **WHEN** nothing is affordable and today's quest "Defeat 500 enemies" stands at 320
- **THEN** the next goal reads that quest with 320 / 500 and opens the Hall of Glory

### Requirement: Realm selection and seed

Realm selection SHALL list every playable realm with its name and description and SHALL show the seed the run will use. A new random seed SHALL be proposed each time; the player MAY enter their own whole-number seed. It SHALL offer the run's length: **Full** or **Quick** (spec: quick-runs), remembered for the visit. Starting SHALL begin a run with the selected god, realm, seed and length.

#### Scenario: Starting a run with a chosen seed

- **WHEN** the player selects `mount_olympus`, enters seed `847291` and starts
- **THEN** a run starts as `zeus` in `mount_olympus` with seed `847291`

#### Scenario: Invalid seed input

- **WHEN** the player enters `abc` or a negative number as the seed
- **THEN** starting is disabled and the field explains that the seed must be a whole number from 0 to 4294967295

#### Scenario: A quick run

- **WHEN** the player chooses Quick and starts
- **THEN** the run is a quick run
