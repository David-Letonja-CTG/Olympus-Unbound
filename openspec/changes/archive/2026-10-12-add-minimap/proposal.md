# Proposal

## Why

The owner asked for a minimap that shows where the monsters, the bosses and the players are (2026-10-12). The realms are large (4096 units, about three screens across), the Labyrinth's corridors hide what is round the corner, and in a room you lose sight of your friends.

## What Changes

- **A minimap in the top-right corner** under the gold and kills, during a run. It shows:
  - the realm's ground with its obstacles (the Labyrinth's walls read as corridors) and the boss arena's ring;
  - every monster as a small red dot and elites as larger gold dots;
  - the boss, once it is awake, as a large red mark, and the open gate as a pale ring;
  - every god in their seat's colour, the player's own god largest with a white rim, fallen gods as hollow rings;
  - the outline of what the screen shows.
- It updates ten times a second, scales down on narrow windows, and stays above the night's darkness so it is always readable.
- God selection: every god's card is the same size, and a wrapped last row is centred.

## Capabilities

### Modified Capabilities

- `hud`: the minimap.

## Non-goals

- Clicking or zooming the map, fog of war, markers placed by players.
