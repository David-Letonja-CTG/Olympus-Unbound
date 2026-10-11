# player-control Specification

## Purpose
Defines how the player moves and acts in the arena with keyboard or gamepad, how the camera follows them, how the world blocks movement, and how gameplay is paused.

## Requirements

### Requirement: Movement input
The player SHALL move with WASD, the arrow keys, a gamepad's left stick or its d-pad, at the god's movement speed modified by run stats. Diagonal movement SHALL NOT be faster than straight movement. Analog input below the dead zone SHALL be ignored.

#### Scenario: Diagonal speed
- **WHEN** the player holds W and D for one second with movement speed 200
- **THEN** the player travels 200 units (±1) diagonally

#### Scenario: Stick dead zone
- **WHEN** the left stick is tilted less than the dead zone
- **THEN** the player does not move

### Requirement: Collision with the world
The player and enemies SHALL NOT pass through obstacles or leave the map bounds; they SHALL slide along obstacles instead of stopping dead.

#### Scenario: Walking into a column
- **WHEN** the player walks diagonally into a column
- **THEN** the player ends up outside the column's collision circle and keeps moving along it

#### Scenario: Map edge
- **WHEN** the player keeps walking toward the map edge
- **THEN** the player stops at the playable bounds

### Requirement: Divine ability
Each god SHALL have one active ability triggered by Space or the gamepad's south button. The ability SHALL only fire when its cooldown is ready, and its remaining cooldown SHALL be shown.

#### Scenario: Zeus's ability
- **WHEN** `zeus` uses `wrath_of_olympus` with enemies nearby
- **THEN** lightning strikes several nearby enemies and the ability goes on cooldown

#### Scenario: Ability on cooldown
- **WHEN** the player presses Space while the ability is cooling down
- **THEN** nothing fires

#### Scenario: Hades's ability
- **WHEN** wounded `hades` uses `gates_of_tartarus` with enemies around him
- **THEN** every enemy within its radius is damaged, stunned and slowed, Hades regains health, and the ability goes on cooldown

#### Scenario: Poseidon's ability
- **WHEN** `poseidon` uses `tidal_wave` with enemies in front of him
- **THEN** a wide arc of waves passes through them, damaging, pushing back and slowing each, and the ability goes on cooldown

#### Scenario: Athena's ability
- **WHEN** `athena` uses `gorgons_gaze` with enemies around her
- **THEN** every enemy within its radius is damaged and turned to stone (stunned) for 2.5 seconds, and the ability goes on cooldown

#### Scenario: A quick tap still counts
- **WHEN** the player taps Space so briefly that it is released before the next frame
- **THEN** the ability still fires (if ready) on the next simulation step

### Requirement: Camera
The camera SHALL keep the player centred while moving and SHALL show a similar amount of the world regardless of window size, so the window size gives no large advantage.

#### Scenario: Following the player
- **WHEN** the player moves across the arena
- **THEN** the view stays centred on the player

### Requirement: Pausing
Escape, P or the gamepad's Start button SHALL pause the run; the simulation, timers and spawns SHALL stop while paused. The game SHALL also pause when the browser tab is hidden or the window loses focus. Resuming SHALL continue exactly where the run stopped.

#### Scenario: Pause and resume
- **WHEN** the player presses Escape at 01:30 and resumes ten seconds later
- **THEN** the run timer still reads 01:30 at the moment of resuming

#### Scenario: Losing focus
- **WHEN** the window loses focus during play
- **THEN** the run is paused and the pause menu is shown
