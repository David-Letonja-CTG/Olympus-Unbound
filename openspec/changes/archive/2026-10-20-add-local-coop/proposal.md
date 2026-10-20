# Proposal

## Why

The owner asked (2026-10-20) for co-op on a shared screen, so several people can play on one machine. Today co-op needs a browser per player and a room code. Choices made with the owner: player 2 can share the keyboard (arrows and keys on the right), further players use gamepads, up to four. The camera frames everyone, zooms out a little as they spread, then holds them together. Local players can also bring bot allies, up to a party of four.

## What Changes

- **God selection** gets a *Players* panel: "+ Add a player" adds a local player with their own god (up to four players, bot allies included). Each player picks their controls:
  - **Keyboard left:** WASD, Space ability, left Shift sprint, E dash.
  - **Keyboard right:** arrows, Enter (or numpad 0) ability, right Shift sprint, right Ctrl (or numpad 1) dash.
  - **Gamepad 1–4.**

  Defaults are keyboard left, keyboard right, gamepad 1, gamepad 2. A player alone keeps today's controls (keyboard and any gamepad).
- **The run is a party** with the co-op rules: difficulty per god, revives, the gate, and the run going on while any god lives. It counts as co-op for Glory when two or more people play.
- **One camera:** it frames every living player, zooming out to 70% at most as they spread apart. Beyond that, no player can walk off the screen: a soft edge holds the party together (a simulation rule, deterministic).
- **Choices:** each player answers their own level-up choice, treasure and shop in turn. The dialog names the player ("Player 2 · Level 5!"); any device may answer it. The run waits for everyone, as in rooms.
- **HUD:** the main HUD shows player 1. The party panel on the left shows every god's health, and for local players also their stamina and whether their ability is ready.
- **Pausing:** any player's pause key or Start pauses for everyone (one screen).

## Capabilities

### Modified Capabilities

- `co-op`: local co-op on one screen.
- `player-control`: controls per local player.
- `hud`: the party panel's stamina and ability for local players.

## Non-goals

- Split screen; local players inside an online room; remapping keys.
