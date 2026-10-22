## MODIFIED Requirements

### Requirement: Creating a room
The main menu SHALL offer *Co-op*. A player SHALL be able to create a room. The room SHALL get a code of five characters, using letters and digits that cannot be confused with each other, and its creator SHALL be the host in the first seat.

Rooms SHALL connect through the game's own server (spec: game-server), which passes every message between the host and each guest without reading or changing it. They SHALL therefore work on any network from which the server can be reached, including two devices behind the same home router. The host's game SHALL remain the only authority over the run (D16).

#### Scenario: A new room
- **WHEN** a player creates a room
- **THEN** the lobby shows a five-character room code and the player as host

#### Scenario: Two devices in one house
- **WHEN** two players on the same home network create and join a room
- **THEN** both lobbies list both players, as they would from different places

#### Scenario: No game server
- **WHEN** the game server cannot be reached
- **THEN** creating or joining a room says the game server is unavailable, and nothing else in the game is affected
