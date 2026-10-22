# Proposal

## Why

The owner (2026-10-22):
- **Co-op fails between devices at home.** Co-op worked between two windows on one computer, but not between two machines in the same house.
  - **The cause:** peer-to-peer rooms need a relay when browsers can't connect directly, and the free public relays the game relied on (PeerJS's TURN servers, Open Relay) no longer exist.
  - A colleague's game works everywhere because players connect to its server.
- **The owner's decision:** a server of the game's own, built like Slovion's but without .NET, giving working co-op, **world leaderboards** and **matchmaking** in one change (D1 revised, D16 revised, D21).

## What Changes

- **A game server** (`server/`, Node.js and TypeScript, PostgreSQL):
  - **Hosting:** Docker Compose with Caddy on an Oracle Cloud Always Free VM, deployed by the release workflow.
  - **The game** stays on GitHub Pages and talks to the server's address.
- **Rooms through the server.** Every room message travels through the server, so co-op works on any network that reaches the internet. The host's game is still the authority, and lobbies, codes and invites are unchanged. PeerJS is removed.
- **Matchmaking:**
  - **Public rooms:** a host can make the lobby public.
  - **Open rooms:** Co-op lists the public rooms waiting for players, with their host, god, realm and seats.
  - **Quick Play** joins the fullest open room, or opens a public room and waits for others.
- **World leaderboards:**
  - **Submitting:** every finished run that enters a table in the Hall of Glory is also sent to the world board of the same kind: solo, with allies, co-op, quick. Each Daily Trial run goes to that day's world board.
  - **Showing:** the Hall shows **This device** and **World** for each table and for today's trial.
  - **Names:** players appear under the name they chose (Settings).
  - **Checks:** scores are recomputed and checked on the server, each run counts once, and runs finished offline are sent later.
- **Without the server** (a build without one, or the server down): co-op and the world boards say the game server is unavailable, and everything else plays as before.

## Capabilities

### New Capabilities

- `game-server`: availability, what is stored, limits.
- `matchmaking`: public rooms, open rooms, Quick Play.
- `world-leaderboards`: submitting runs, world tables, the daily world board.

### Modified Capabilities

- `rooms`: rooms connect through the game server.
- `glory`: the Hall shows world tables beside this device's.
- `installable-app`: online features need a connection.

## Non-goals

- Accounts, cloud saves, friends lists, chat, and reconnecting to a run after a drop.
- Running game rules on the server.
- Moving the game off GitHub Pages.
