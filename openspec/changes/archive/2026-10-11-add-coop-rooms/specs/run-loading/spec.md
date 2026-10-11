# Spec Delta

## MODIFIED Requirements

### Requirement: Party
The loading screen SHALL list every player taking part in the run with their name and god. In a room's run, it SHALL list every member in seat order, mark the local player and the host, and show the room's code. A run without a room SHALL show only its local player ("You") and SHALL NOT show empty seats, room codes or other multiplayer controls.

#### Scenario: Solo run
- **WHEN** a single player starts a run as `hades`
- **THEN** the party shows one entry, "You — Hades", and nothing about rooms

#### Scenario: A room's run
- **WHEN** a room of a `zeus` host and a `hades` guest starts its run
- **THEN** both loading screens list both players with their gods and show the room code
