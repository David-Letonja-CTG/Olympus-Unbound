## ADDED Requirements

### Requirement: The game server
The game SHALL have a server of its own for what players share: rooms (spec: rooms), open rooms (spec: matchmaking) and the world boards (spec: world-leaderboards). It SHALL run no rules of a run, keep no saves and need no accounts.

- **Address:** the game SHALL reach it at the address given when the game is built. A build without one SHALL not show co-op's online features or the world boards as if they worked.
- **When it is unreachable:** co-op and the world boards SHALL say the game server is unavailable, and everything else SHALL play as before.
- **Health:** it SHALL answer a health check, so a deployment can confirm it runs.

#### Scenario: Server down
- **WHEN** the server cannot be reached and the player opens Glory
- **THEN** This device's tables show as before and World says the game server is unavailable

### Requirement: What the server keeps
The server SHALL store only the world board entries: a chosen name and a run's figures. It SHALL NOT store addresses or anything that identifies a device. Rooms and their listings SHALL live only in memory while they are open.

#### Scenario: A room closes
- **WHEN** the host of a room leaves
- **THEN** the room and its listing are gone from the server, and its guests are told the host closed it

### Requirement: Limits
The server SHALL bound what one client can use: the size and rate of room messages, the number of open connections per address, and runs sent per address per hour. Messages beyond a limit SHALL be refused without affecting other players.

#### Scenario: A flood
- **WHEN** one client sends far more room messages than a game does
- **THEN** its connection is closed and other rooms play on
