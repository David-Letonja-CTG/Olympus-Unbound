# Spec Delta

## MODIFIED Requirements

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
