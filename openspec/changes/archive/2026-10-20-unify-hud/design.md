# Design

## Data

- The `hud` session event gains `locals?: HudSnapshot[]`, one snapshot per player at this screen in seat order (`RunDriver.huds()`; `LocalDriver` maps its local IDs through `sim.hud`, a guest returns its own). `hud` stays player 1's, so nothing else changes. Ten times a second, as today (D7).
- `PlayScreen` passes the HUD the local snapshots and each seat's `ControlScheme`, for the key labels.

## Pieces (Angular, `features/game/hud/`)

- `Orb`: a crystal sphere on a bronze tripod filled with blood or ichor. `HealthVessel`: the orb of blood, with an optional stamina ring, seat pip and fallen state.
- `StaminaVessel`: the orb of ichor with the dash-cost mark (solo frieze).
- `DashPip`, `AbilitySlot` (icon, smooth sweep, seconds, flash, key label), `Loadout` (weapon slots with sweeps, then armour, relics and companions).
- `GodPlaque`: one player's plaque composed from the above, as `frieze-left`, `frieze-right` or `corner`.
- `Medallion`: a god not played here.
- `Hud` picks the layout: `frieze` (one player), `duo` (two) or `corners` (three or four). It draws the frieze band, the shared experience bar, the medallion column (with the synergies) and the rest as today.
- Test IDs stay as they are for player 1 (`hud-health`, `stamina-fill`, `dash-pip`, `ability-sweep`, `hud-weapon-*`); other seats add `-p2`, `-p3`, `-p4`.

## Minimap

- `ArenaScene` places the minimap below the top-right plaque when three or more players share the screen (`Minimap.top`). The gold-and-kills plaque follows it through the same offset in CSS.

## Key labels

- `keyboard` and `keys-left`: Space and E; `keys-right`: Enter and R-Ctrl; gamepads: A and B.
