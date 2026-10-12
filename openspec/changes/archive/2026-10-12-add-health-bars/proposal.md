# Proposal

## Why

The owner asked (2026-10-12) for health bars over monsters, which can be hidden in Settings, and, when several players are in a run, everyone's health at a glance on the left.

## What Changes

- **Monster health bars:** a thin red bar over every common monster that has been hurt (unhurt ones stay clean, so a fresh horde is not a wall of bars). Elites keep their gold bar and the boss its banner.
- **Settings → Enemy health bars:** on by default; off hides the common monsters' bars. It applies at once and is saved.
- **Party health:** in a room, a panel on the left lists every god still in the run:
  - their seat's colour (the same as on the minimap), god and name, with "(you)" on your own;
  - a health bar with numbers;
  - when fallen, how far their revive has come.
- **Save format v3:** the new setting; older saves migrate with the bars on.

## Capabilities

### Modified Capabilities

- `hud`: enemy health bars and party health.
- `meta-progression`: the enemy health bars setting.

## Non-goals

- Bars over allies' heads in the world (their seat colour and the minimap mark them).
