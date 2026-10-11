# Proposal

## Why

The owner wants friends to play together: rooms to join, with difficulty that follows the number of players. On 2026-10-11 the owner chose peer-to-peer rooms (browsers connect directly, join by code, the host's game is the authority) and difficulty per player. The previous change (`add-coop-simulation`) made a run hold a party; this change connects the party's browsers.

## What Changes

- **Rooms**: *Co-op* on the main menu. A player creates a room and gets a short code, and friends join with it (up to 4 players). In the lobby, everyone picks a name and a god and gets ready. The host picks the realm and starts the run for everyone.
- **Playing together**:
  - The host's browser runs the one simulation. Guests send their input and see the host's world, 20 updates a second, smoothed.
  - A guest's own movement responds at once, because it is predicted locally and corrected by the host.
  - Each player's camera follows their own god, and follows an ally after they fall.
- **Choices and pause**: each player sees only their own level-up choice, plus who the run is still waiting for. In a room, the pause menu and lost focus do not stop the run. The host can end the run for everyone; a guest can leave.
- **Leaving**: a guest who leaves or loses the connection leaves the battle, and the run goes on. If the host leaves, the run ends for everyone as abandoned, keeping each player's earnings.
- **Results**: each player records their own result in their own save.
- **Loading screen**: in a room, the party lists every member with their god, plus the room code.
- **D1 revised**: the game stays static with no server of its own, but rooms may connect browsers directly. A public signalling service only introduces them, and nothing is stored. CLAUDE.md hard rule 1 and D11 follow.
- **One new dependency**: PeerJS (MIT) for WebRTC data channels and the public signalling service.

## Capabilities

### New Capabilities

- `rooms`: creating and joining rooms, the lobby, playing a run together over the network, leaving, and results.

### Modified Capabilities

- `run-loading`: the party shows the room's members and code.

## Non-goals

- Joining a run already in progress, reconnecting, or migrating the host.
- Matchmaking, public room lists, chat, accounts or anything stored online.
- Reviving fallen allies (a later change).
- Local co-op on one screen.
