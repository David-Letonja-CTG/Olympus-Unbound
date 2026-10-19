## ADDED Requirements

### Requirement: Admin mode
Opening any page with `?admin` SHALL enable admin mode for the browser tab's session, in development and production builds alike; the main menu SHALL then show an Admin button leading to the statistics screen. Without admin mode, neither the button nor the screen SHALL be reachable. Admin mode SHALL only read this browser's data and SHALL send nothing anywhere (D1).

#### Scenario: Entering admin mode
- **WHEN** the player opens the game with `?admin`
- **THEN** the main menu shows Admin, and it leads to the statistics screen

#### Scenario: Without admin mode
- **WHEN** a player opens `/admin` without having opened `?admin` in this session
- **THEN** they are sent to the main menu

### Requirement: Run history
The save SHALL remember the last 100 finished runs: when the run ended, god, starting realm and the realm it ended in, party size, outcome, seed, time, level, kills, gold, realms cleared, score, and the final weapons (with level and damage dealt), relics and synergies.

#### Scenario: The 101st run
- **WHEN** a run ends with 100 runs in the history
- **THEN** the oldest run is dropped and the new one kept

### Requirement: Statistics
The statistics screen SHALL show over the run history: totals (runs, time played, kills, realms cleared, solo and co-op runs); per god the runs, average and best realms cleared, average time, average kills and best score; in which realm runs ended; per weapon how often it was in a final build, its average level and its share of damage; and the scores of the last runs as a chart. With no runs it SHALL say so.

#### Scenario: Comparing gods
- **WHEN** the history holds three Zeus runs clearing 0, 1 and 2 realms
- **THEN** Zeus's row shows 3 runs, 1.0 realms on average and 2 at best

#### Scenario: No runs yet
- **WHEN** the history is empty
- **THEN** the screen says there are no runs to report yet

### Requirement: Exports
The statistics screen SHALL export the run history as a JSON file and as a CSV file with one row per run, generated in the browser.

#### Scenario: CSV export
- **WHEN** the admin exports CSV with 12 runs in the history
- **THEN** a file with a header and 12 rows is saved

### Requirement: Balance report
The statistics screen SHALL play runs with the bot for chosen gods, a chosen number of runs each and a chosen length, on a starting realm, without blocking the page, showing progress, and SHALL tabulate per god the average realms cleared, level, kills, survival rate and the weapons taken with their share of damage. The runs SHALL be reproducible: the same choices give the same report.

#### Scenario: Two gods
- **WHEN** the admin runs the report for Zeus and Hades with 2 runs of 3 minutes each
- **THEN** a row per god shows the averages over its 2 runs, and running it again gives the same numbers
