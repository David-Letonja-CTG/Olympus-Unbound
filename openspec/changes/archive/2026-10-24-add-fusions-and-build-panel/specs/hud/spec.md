## ADDED Requirements

### Requirement: The build panel
During a run the player SHALL be able to open and close a build panel with Tab, a gamepad's Back/Select button, or a button on a touch screen. The run SHALL go on while it is open; it SHALL also open over a level-up choice. The panel SHALL show the player's own build:

- weapons, armour, relics, skills, fusions and ascensions, with their levels and top levels;
- the tree of every fusion and synergy the god can reach, by tier. Each entry SHALL show its requirements, each met one marked and each unmet one showing the level still needed. Each entry SHALL show whether it is active (and its level), ready to be offered, or locked.

Fusions and synergies the god can never reach SHALL not be shown. The panel SHALL update with the HUD, not per frame. In a room each player SHALL see their own build.

#### Scenario: Opening the panel
- **WHEN** the player presses Tab during a run
- **THEN** the build panel opens, the run keeps going, and pressing Tab again closes it

#### Scenario: What is missing
- **WHEN** the god holds `flaming_sword` at level 6 and `war_hammer` at level 4
- **THEN** the panel shows `forge_of_hephaestus` as locked, with `flaming_sword` met and `war_hammer` needing level 6

#### Scenario: Ready
- **WHEN** every requirement of `forge_of_hephaestus` is met and it has not been taken
- **THEN** the panel shows it as ready to be offered

#### Scenario: On a phone
- **WHEN** the player taps the build button on a touch screen
- **THEN** the panel opens, and a close button closes it

#### Scenario: Another god's tree
- **WHEN** `hades` opens the panel
- **THEN** `sky_father` is not shown
