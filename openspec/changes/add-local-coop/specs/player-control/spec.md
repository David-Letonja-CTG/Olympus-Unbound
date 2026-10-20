## ADDED Requirements

### Requirement: Controls per local player
With more than one local player, each SHALL use the controls chosen for them: keyboard left (WASD to move, Space ability, left Shift sprint, E dash), keyboard right (arrow keys to move, Enter or numpad 0 ability, right Shift sprint, right Ctrl or numpad 1 dash), or one of gamepads 1–4 (left stick or d-pad, A or right trigger ability, left bumper or trigger sprint, B dash). A key or button SHALL only drive the player it belongs to. A player alone SHALL keep the keyboard and any gamepad together, as before.

#### Scenario: Keys belong to one player
- **WHEN** player 2 on keyboard right presses the arrow keys
- **THEN** only player 2's god moves

#### Scenario: A gamepad player
- **WHEN** player 3 on gamepad 1 tilts its stick
- **THEN** only player 3's god moves
