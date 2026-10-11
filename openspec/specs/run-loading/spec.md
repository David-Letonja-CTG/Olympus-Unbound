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
The loading screen SHALL list every player taking part in the run with their name and god. A run without a room SHALL show only its local player ("You") and SHALL NOT show empty seats, room codes or other multiplayer controls.

#### Scenario: Solo run
- **WHEN** a single player starts a run as `hades`
- **THEN** the party shows one entry, "You — Hades", and nothing about rooms

### Requirement: Lore and tips
While loading, the screen SHALL show one line of lore or a gameplay tip from the realm's content, changing to another line every few seconds.

#### Scenario: A tip while waiting
- **WHEN** the loading screen is shown for `mount_olympus`
- **THEN** it shows a line from the realm's tips
