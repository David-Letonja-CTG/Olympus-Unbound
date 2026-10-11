# Spec Delta

## Purpose

Playing a run together across browsers: creating and joining rooms, the lobby, how the party's games stay in step, leaving, and results.

## ADDED Requirements

### Requirement: Creating a room
The main menu SHALL offer *Co-op*. A player SHALL be able to create a room. The room SHALL get a code of five characters, using letters and digits that cannot be confused with each other, and its creator SHALL be the host in the first seat. No server of the game's own SHALL be involved: browsers SHALL connect directly, and a public signalling service SHALL be used only to introduce them.

#### Scenario: A new room
- **WHEN** a player creates a room
- **THEN** the lobby shows a five-character room code and the player as host

### Requirement: Joining a room
A player SHALL be able to join a room by typing its code. A room SHALL hold at most four players. A player SHALL NOT join a room that is full, whose run has started, or that runs another version of the game; they SHALL be told why. An unknown code SHALL be reported as not found.

#### Scenario: Joining by code
- **WHEN** a second player types the host's code
- **THEN** both lobbies list both players

#### Scenario: A full room
- **WHEN** a fifth player tries to join
- **THEN** they are told the room is full and stay outside it

### Requirement: Lobby
The lobby SHALL list every member with their name, god and whether they are ready. Each member SHALL choose their own name and god; several members MAY pick the same god. The host SHALL choose the realm, and SHALL be able to start once every other member is ready. Starting SHALL start the same run (realm, seed and party in seat order) for every member, each with their own permanent upgrades.

#### Scenario: Starting together
- **WHEN** the host starts a room of a `zeus` host and a ready `hades` guest
- **THEN** both browsers load the same realm with Zeus and Hades in the party

#### Scenario: Not everyone is ready
- **WHEN** a guest is not ready
- **THEN** the host cannot start the run

### Requirement: One authoritative game
In a room's run, the host's browser SHALL run the only simulation. Guests SHALL send their input to it and SHALL show the world it reports, smoothed between updates. A guest's own movement SHALL respond to their input without waiting for the host and SHALL be corrected to the host's position. Each player's camera SHALL follow their own god, or a living ally once their god has fallen. Every player SHALL see the same enemies, attacks, pickups and boss.

#### Scenario: A guest moves
- **WHEN** a guest holds a direction
- **THEN** their god moves at once on their screen, and the same movement appears on the host's screen

### Requirement: Choices in a room
Each player SHALL see only their own level-up or treasure choice. While the run waits for other players to choose, a player who has chosen SHALL see whom it is waiting for.

#### Scenario: Waiting for an ally
- **WHEN** the host has chosen and a guest has not
- **THEN** the host sees that the run is waiting for the guest

### Requirement: Pausing in a room
In a room's run, opening the pause menu or leaving the window SHALL NOT stop the run. The host's pause menu SHALL offer to end the run for everyone; a guest's SHALL offer to leave the room.

#### Scenario: The host opens the pause menu
- **WHEN** the host opens the pause menu
- **THEN** the run's clock keeps running for everyone

### Requirement: Leaving
When a guest leaves or loses the connection, their god SHALL leave the battle, the other players SHALL be told, and the run SHALL go on. When the host leaves or loses the connection, the run SHALL end for every guest as abandoned, keeping what they earned so far.

#### Scenario: A guest leaves
- **WHEN** a guest closes the game during a run
- **THEN** the host is told the guest left and the run goes on

#### Scenario: The host leaves
- **WHEN** the host closes the game during a run
- **THEN** each guest's run ends as abandoned with their earnings recorded

### Requirement: Results in a room
When a room's run ends, every player SHALL see and record their own result (their god and loadout, and the shared time, level, kills, gold and outcome) in their own save.

#### Scenario: Victory together
- **WHEN** a party defeats the boss
- **THEN** every player's summary shows the victory, and each player's save receives the rewards once
