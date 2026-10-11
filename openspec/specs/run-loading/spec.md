# run-loading Specification

## Purpose
The loading screen between starting a run and playing it: what it shows while the art loads and the realm is built, and how it hands over to the arena. Built for parties of several players.

## Requirements

### Requirement: Run loading screen
From the moment a run is started until its arena is ready, a loading screen SHALL cover the game, showing the realm's name and description over a backdrop of the realm, the portrait of every player's god, and the progress. The run's simulation SHALL NOT advance before the arena is ready; when it is, the screen SHALL fade out and the run SHALL start at 00:00.

#### Scenario: Starting a run
- **WHEN** the player starts a run as `zeus` in `mount_olympus`
- **THEN** the loading screen shows Mount Olympus, its description and Zeus, its progress rises to 100%, and the arena appears with the run timer at 00:00

### Requirement: Progress stages
Progress SHALL be reported in named stages, in order: loading the art (*Summoning the gods*), building the realm (*Shaping the realm*) and preparing the scene (*The horde gathers*). Each stage's progress SHALL come from the real work, and the overall progress SHALL never go backwards.

#### Scenario: Stages in order
- **WHEN** a run loads
- **THEN** the stage shown goes from *Summoning the gods* to *Shaping the realm* to *The horde gathers*, and the progress bar only grows

### Requirement: Party
The loading screen SHALL list every player taking part in the run with their name and god. In a room's run, it SHALL list every member in seat order, mark the local player and the host, and show the room's code. A run without a room SHALL show only its local player ("You") and SHALL NOT show empty seats, room codes or other multiplayer controls.

#### Scenario: Solo run
- **WHEN** a single player starts a run as `hades`
- **THEN** the party shows one entry, "You — Hades", and nothing about rooms

#### Scenario: A room's run
- **WHEN** a room of a `zeus` host and a `hades` guest starts its run
- **THEN** both loading screens list both players with their gods and show the room code

### Requirement: Lore and tips
While loading, the screen SHALL show one line of lore or a gameplay tip from the realm's content, changing to another line every few seconds.

#### Scenario: A tip while waiting
- **WHEN** the loading screen is shown for `mount_olympus`
- **THEN** it shows a line from the realm's tips

### Requirement: Loading between realms
When the party travels to the next realm, the loading screen SHALL appear again with that realm's name, description and boss, how many realms the party has cleared, and the same stages and progress rules as at the start of a run. The run SHALL resume when every player has loaded the realm.

#### Scenario: Into the second realm
- **WHEN** the party steps through the gate after clearing its first realm
- **THEN** the loading screen shows the next realm as realm 2, and the run continues once it has loaded
