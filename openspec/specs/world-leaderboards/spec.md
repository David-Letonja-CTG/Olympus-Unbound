# world-leaderboards Specification

## Purpose
The world high-score boards: which runs are sent, how they are checked, and how the Hall of Glory shows them.

## Requirements

### Requirement: Submitting runs
When a run ends, a run that enters one of the Hall's tables SHALL also be sent to the world board of the same kind: solo, with allies, co-op or quick (spec: glory). A Daily Trial run SHALL be sent to that day's world board.

- **Contents:** the entry SHALL carry the player's name (Settings; "Hero" when none) and the run's god, starting realm, realms cleared, time, kills, level and number of players.
- **Co-op:** a co-op run SHALL be sent once, by the host, with the party's names.
- **Each run once:** a run SHALL count at most once (its run ID).
- **Offline:** a run that cannot be sent SHALL be kept on the device and sent later.

#### Scenario: A solo run
- **WHEN** a solo run ends with a score of 5,200
- **THEN** the world solo board holds an entry of 5,200 under the player's name

#### Scenario: Sent twice
- **WHEN** the same run is sent again
- **THEN** the world board still holds it once

#### Scenario: Offline
- **WHEN** a run ends while the server cannot be reached
- **THEN** it is sent the next time the game starts with the server reachable

### Requirement: Fair scores
The server SHALL compute each entry's score itself from the run's figures, with the same formula as the Hall (spec: glory / glory score). It SHALL refuse entries whose figures are impossible: negative or non-whole numbers, more players than a room holds, more realms cleared than the time allows, or more kills than the time allows. It SHALL limit how many runs one address may send in an hour, and an administrator SHALL be able to hide an entry.

#### Scenario: An impossible run
- **WHEN** an entry claims 10 realms cleared in 5 minutes
- **THEN** it is refused and no board changes

### Requirement: World tables
The Hall of Glory SHALL show each high-score table both for **This device** and for the **World**: the top entries with their rank, name, god, realm, realms cleared, time, kills, level and score. It SHALL filter both by god. Today's Daily Trial SHALL show the world's best today beside the player's own.

#### Scenario: World solo table
- **WHEN** the player opens Glory and picks World on the solo table
- **THEN** the best solo runs from every player are listed with their names

#### Scenario: The world's best today
- **WHEN** players have played today's Daily Trial
- **THEN** the Hall's trial panel shows the best world score today with its player's name
