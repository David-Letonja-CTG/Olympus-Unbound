# Proposal

## Why

The owner wants co-op: friends joining each other's runs in rooms (P2P, decided 2026-10-11), with the difficulty right for the party's size. The simulation was built multiplayer-ready (D11: a list of players and per-player input) but still assumes one god, one player's choices and one player's results. This change makes a run hold 2–4 players properly; the next change (rooms) connects them over the network.

## What Changes

- **A party per run**: the run configuration lists the players (seats: god, name, their own permanent upgrades); without one, a run is solo as before. Each player has their own god — stats, passive, ability, starting weapon, sprite and offer affinities — and starts side by side on the spawn plaza.
- **Own upgrades**: experience and level are shared; each level-up (or treasure) opens a round in which every living player gets their own three offers; the run continues when all of them have chosen.
- **Difficulty per player**: each extra player adds 65% enemy health, 50% spawn rate, 50% more enemies alive at once and 90% boss health (content: `balance.coop`).
- **Fair spawns for everyone**: enemies spawn around a random living player's view and never inside any player's view.
- **Per-player HUD and results**: the HUD and the run result can be read for any player (their health, loadout, god).

Solo runs are unchanged.

## Capabilities

### New Capabilities

- `co-op`: a run's party, own upgrades, difficulty per player, fair spawns and per-player views of the run.

## Non-goals

- Rooms, networking, a lobby or any co-op UI (the next change).
- Reviving fallen allies (a later change).
