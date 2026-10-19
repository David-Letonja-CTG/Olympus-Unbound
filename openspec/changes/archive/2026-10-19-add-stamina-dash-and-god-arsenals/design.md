# Design

## Simulation

- `Player` gains `stamina`, `staminaRest` (seconds since stamina was last spent), `dashTime` (seconds of dash left), `dashCooldown` and `dashX`/`dashY`. The rules live in `sim/movement.ts` as one step function over a small `Mover` shape, so the host's players and a guest's prediction run the same code (D16).
- `PlayerInput` gains `sprint` (held) and `dash` (held or tapped since the last step, like `ability`). `NO_INPUT` has both false.
- Balance in `balance.stamina`: max 100, regen 32/s after 0.7 s rest, sprint ×1.55 speed and 30/s drain, dash cost 35, 0.18 s at 830 units/s (≈150 units), recovery 0.35 s. Dash invulnerability is `max(invulnerable, dashTime + 0.05)`, so the existing hit checks (`invulnerable > 0`) need no change and the damage pipeline is untouched.
- A `dash` `SimEvent` (player id, position, direction) lets the views draw a streak and play a whoosh; it reaches guests with the frame's events.
- `HudSnapshot` gains `stamina { value, max, dashCost, dashRecovery }`; weapon `HudItem`s gain `cooldown`/`remaining`.

## God arsenals

- `WeaponDefinition.gods?: readonly string[]`: absent means common to all. `offerCandidates` skips a weapon whose `gods` exclude the player's god. `ContentIndex` validates that the IDs exist and that each god's starting weapon is allowed. Pure data (D4); no god-specific conditionals.

## Net

- The guest's `input` message gains `sprint` and `dash` (`NET_VERSION` 2). The snapshot's player record gains stamina (u8 share of max) and a dashing flag (`SNAPSHOT_FORMAT` 3). The guest's prediction keeps its own mover state, stores stamina in its history and corrects it by the host's error at the acknowledged input, as it does for position.

## HUD

- The ability sweep moves smoothly between the 10 Hz snapshots with a CSS transition on a registered `@property --share` (no per-frame Angular updates, D7). The ready flash is a CSS animation on the `ready` class. Weapon slots get the same conic sweep. The stamina bar is a thin bronze-framed bar beneath the amphora with a dash pip at its end.

## Input

- Keyboard: Shift held = sprint, E (also tapped) = dash, Space = ability. Gamepad: LB / L2 = sprint, B = dash, A / R2 = ability. Angular dialogs are unaffected (no capture).

## Risks

- Dash invulnerability could trivialise bosses; the cost (35 of 100) limits it to about two dashes in a row and the recovery to one every 0.35 s.
