# game-server Specification

## Purpose
The game's own server (D21): what it serves (rooms, open rooms, world boards), what it keeps, its limits, and how the game behaves without it.

## Requirements

### Requirement: The game server
The game SHALL have a server of its own for what players share: rooms (spec: rooms), open rooms (spec: matchmaking) and the world boards (spec: world-leaderboards). It SHALL run no rules of a run, keep no saves and need no accounts.

- **Address:** the server SHALL also serve the game itself, at the same address, and the game SHALL reach the server at its own address. A build without a server (the release zip) SHALL not show co-op's online features or the world boards as if they worked.
- **The game's pages:** a deep link SHALL load the game; a shared address (challenge, co-op invite, Daily Trial) SHALL answer with a page of its own, found, so chat apps show its preview; a missing file SHALL be not found.
- **Updates:** the game's content-hashed files MAY be cached for good; everything else SHALL be revalidated, so a new release reaches players at their next check (spec: installable-app).
- **Other sites:** browsers on other sites SHALL NOT be able to call the server.
- **When it is unreachable:** co-op and the world boards SHALL say the game server is unavailable, and everything else SHALL play as before.
- **Health:** it SHALL answer a health check, so a deployment can confirm it runs.

#### Scenario: Server down
- **WHEN** the server cannot be reached and the player opens Glory
- **THEN** This device's tables show as before and World says the game server is unavailable

#### Scenario: A shared challenge link
- **WHEN** a challenge link at the game's address is opened or pasted into a chat app
- **THEN** it answers with the game's challenge page, found, and the game opens the challenge

#### Scenario: Another site
- **WHEN** a page on another site opens a room socket to the server
- **THEN** the server refuses it

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
