## ADDED Requirements

### Requirement: Public rooms
A host SHALL be able to make the lobby **public**; rooms are private by default.

- **Listing:** while a lobby is public, has a free seat and its run has not started, the game server SHALL list it with the host's name, god, the chosen realm, the number of players and the seats.
- **Leaving the list:** it SHALL leave the list as soon as it is private, full, started or closed.
- **Version:** only rooms of the same game version SHALL be listed to a player.

#### Scenario: Making a room public
- **WHEN** the host turns on Public in a lobby with one player
- **THEN** other players see the room among the open rooms with 1 of 4 seats taken

#### Scenario: Started rooms leave the list
- **WHEN** the host of a public room starts the run
- **THEN** the room is no longer listed

### Requirement: Open rooms
The Co-op screen SHALL show the open rooms with their host, god, realm and seats, and a way to refresh them. Joining one SHALL work like joining by its code. When there are none, it SHALL say so.

#### Scenario: Joining from the list
- **WHEN** a player picks an open room
- **THEN** they join its lobby

#### Scenario: Nothing open
- **WHEN** no public room is waiting
- **THEN** the list says there are no open rooms and offers Quick Play

### Requirement: Quick Play
The Co-op screen SHALL offer **Quick Play**. It SHALL join the open room with the most players. If that room has just filled or started, it SHALL try the next one. If none can be joined, it SHALL open a public room with the player as host, which then waits for others.

#### Scenario: A room is waiting
- **WHEN** a public room with two players is open and a player taps Quick Play
- **THEN** they join that room

#### Scenario: Nobody is waiting
- **WHEN** no room is open and a player taps Quick Play
- **THEN** a public room opens with them as host, listed for others
