# Spec Delta

## Purpose

Lets the player get from opening the game to a running arena: main menu, choosing a god, choosing a realm and seed, and starting the run.

## ADDED Requirements

### Requirement: Main menu
Opening the game SHALL show the main menu with the actions Play, Progression and Settings. Every visible action SHALL work; the menu SHALL be operable with mouse and keyboard.

#### Scenario: First visit
- **WHEN** the player opens the game for the first time
- **THEN** the main menu shows Play, Progression and Settings and the player's gold (0)

#### Scenario: Keyboard navigation
- **WHEN** the player tabs to Play and presses Enter
- **THEN** god selection opens

### Requirement: God selection
God selection SHALL list every playable god defined in content with its name, title, description, starting weapon, divine ability and base statistics. Choosing a god SHALL continue to realm selection with that god selected.

#### Scenario: Choosing Zeus
- **WHEN** the player selects god `zeus` and continues
- **THEN** realm selection opens with `zeus` as the selected god

#### Scenario: Only defined gods are offered
- **WHEN** god selection opens in this slice
- **THEN** only `zeus` is offered and no disabled placeholder buttons are shown

### Requirement: Realm selection and seed
Realm selection SHALL list every playable realm with its name and description and SHALL show the seed the run will use. A new random seed SHALL be proposed each time; the player MAY enter their own whole-number seed. Starting SHALL begin a run with the selected god, realm and seed.

#### Scenario: Starting a run with a chosen seed
- **WHEN** the player selects `mount_olympus`, enters seed `847291` and starts
- **THEN** a run starts as `zeus` in `mount_olympus` with seed `847291`

#### Scenario: Invalid seed input
- **WHEN** the player enters `abc` or a negative number as the seed
- **THEN** starting is disabled and the field explains that the seed must be a whole number from 0 to 4294967295

### Requirement: Play requires a complete setup
Opening the play screen without a selected god and realm SHALL redirect to god selection instead of starting a run.

#### Scenario: Direct link to play
- **WHEN** the player navigates directly to the play screen after a page reload
- **THEN** god selection opens and no run is started
