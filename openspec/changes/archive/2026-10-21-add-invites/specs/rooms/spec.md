## MODIFIED Requirements

### Requirement: Joining a room
A player SHALL be able to join a room by typing its code or by opening an **invite link**. A room SHALL hold at most four players. A player SHALL NOT join a room that is full, whose run has started, or that runs another version of the game; they SHALL be told why. An unknown code SHALL be reported as not found.

- **The host's Invite:** the lobby SHALL offer **Invite**. Where the device can share, it opens the share sheet with a link to the Co-op screen carrying the room's code; otherwise it copies the link and says so.
- **Opening the link:** it SHALL open Co-op with the code filled in and **Join room** with that code ready to tap. Nothing SHALL be joined until the player taps it, and the player's name can be changed first.
- **A broken link:** a link whose code is not a valid room code SHALL open Co-op as usual.

#### Scenario: Joining by code
- **WHEN** a second player types the host's code
- **THEN** both lobbies list both players

#### Scenario: A full room
- **WHEN** a fifth player tries to join
- **THEN** they are told the room is full and stay outside it

#### Scenario: Inviting by link
- **WHEN** the host taps Invite in room `K7M2Q` on a computer
- **THEN** a link to Co-op with the code `K7M2Q` is copied, and the lobby says so

#### Scenario: Opening an invite
- **WHEN** a friend opens the invite link for `K7M2Q`
- **THEN** Co-op shows the code `K7M2Q` filled in with "Join room K7M2Q", and nothing is joined until they tap it

#### Scenario: A broken invite
- **WHEN** a link carries the code `??`
- **THEN** Co-op opens with an empty code field
