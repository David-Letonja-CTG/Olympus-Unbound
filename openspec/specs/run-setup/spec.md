# run-setup Specification

## Purpose
Lets the player get from opening the game to a running arena: main menu, choosing a god, choosing a realm and seed, and starting the run.

## Requirements

### Requirement: Main menu

Opening the game SHALL show the main menu with the actions Play, Daily Trial, Co-op, Progression, Glory, Settings and Intro, after the intro on first launch. Every visible action SHALL work; the menu SHALL be operable with mouse and keyboard. Under the actions, the menu SHALL show the player's **next goal**: one line naming the nearest unfinished thing, linked to the screen where it lives. The candidates, in this order, are:

1. The Daily Trial, if the player has not played it today.
2. A blessing the player can afford now.
3. The unfinished daily quest closest to done.
4. The unfinished achievement whose progress is known and closest to done.

#### Scenario: First visit

- **WHEN** the player opens the game for the first time and the intro ends or is skipped
- **THEN** the main menu shows Play, Daily Trial, Co-op, Progression, Glory, Settings and Intro and the player's gold (0)

#### Scenario: Keyboard navigation

- **WHEN** the player tabs to Play and presses Enter
- **THEN** god selection opens

#### Scenario: Next goal is the trial

- **WHEN** the player has not played today's Daily Trial
- **THEN** the next goal invites them to today's trial and opens it

#### Scenario: Next goal is a blessing

- **WHEN** today's trial is played and the player has 150 gold and Vitality's next level costs 100
- **THEN** the next goal names Vitality and its price, and opens Progression

#### Scenario: Next goal is a quest

- **WHEN** nothing is affordable and today's quest "Defeat 500 enemies" stands at 320
- **THEN** the next goal reads that quest with 320 / 500 and opens the Hall of Glory

### Requirement: God selection
God selection SHALL list every playable god defined in content with its name, title, description, starting weapon, divine ability and base statistics. Choosing a god SHALL continue to realm selection with that god selected.

#### Scenario: Choosing Zeus
- **WHEN** the player selects god `zeus` and continues
- **THEN** realm selection opens with `zeus` as the selected god

#### Scenario: Only defined gods are offered
- **WHEN** god selection opens
- **THEN** `zeus`, `hades`, `poseidon` and `athena` are offered and no disabled placeholder buttons are shown

#### Scenario: Choosing Hades
- **WHEN** the player selects god `hades`, continues and starts a run
- **THEN** the run starts as `hades` with the weapon `bident`

#### Scenario: Choosing Poseidon
- **WHEN** the player selects god `poseidon`, continues and starts a run
- **THEN** the run starts as `poseidon` with the weapon `trident`

#### Scenario: Choosing Athena
- **WHEN** the player selects god `athena`, continues and starts a run
- **THEN** the run starts as `athena` with the weapon `spear_of_athena`

### Requirement: Realm selection and seed

Realm selection SHALL list every playable realm with its name and description and SHALL show the seed the run will use. A new random seed SHALL be proposed each time; the player MAY enter their own whole-number seed. It SHALL offer the run's length: **Full** or **Quick** (spec: quick-runs), remembered for the visit. Starting SHALL begin a run with the selected god, realm, seed and length.

#### Scenario: Starting a run with a chosen seed

- **WHEN** the player selects `mount_olympus`, enters seed `847291` and starts
- **THEN** a run starts as `zeus` in `mount_olympus` with seed `847291`

#### Scenario: Invalid seed input

- **WHEN** the player enters `abc` or a negative number as the seed
- **THEN** starting is disabled and the field explains that the seed must be a whole number from 0 to 4294967295

#### Scenario: A quick run

- **WHEN** the player chooses Quick and starts
- **THEN** the run is a quick run

### Requirement: Play requires a complete setup
Opening the play screen without a selected god and realm SHALL redirect to god selection instead of starting a run.

#### Scenario: Direct link to play
- **WHEN** the player navigates directly to the play screen after a page reload
- **THEN** god selection opens and no run is started

### Requirement: Title screen
When the game opens while the browser still allows no sound, it SHALL show a title screen above every other screen until the player taps, clicks or presses a key.

- **What it shows:** the crest and the game's name rising into a golden glow, embers drifting up, and a pulsing prompt: "Tap to enter" on touch devices, "Click or press any key" elsewhere.
- **Entering:** the first tap, click or key SHALL enter. A flash of light SHALL dissolve the title screen into the screen the game opened on, and the Hall theme SHALL begin (spec: music / the hall theme).
- **When it is skipped:** it SHALL NOT show where the browser already allows sound.
- **The intro:** an intro that would play SHALL wait for the title screen to be entered.
- **Reduced motion:** with reduced motion preferred, it SHALL appear and leave without movement.
- **Automated browsers:** a browser under automation SHALL skip it. An address with `gate` SHALL show it in any browser (tests, review).

#### Scenario: Opening on a phone
- **WHEN** a returning player opens the game on a phone
- **THEN** the title screen shows "Tap to enter", and their tap reveals the main menu as the Hall theme fades in

#### Scenario: Opening by a link
- **WHEN** a friend opens a challenge link
- **THEN** the title screen shows first, and entering reveals the challenge

#### Scenario: First launch
- **WHEN** a new player opens the game for the first time
- **THEN** the intro starts only after they enter, with its sound

#### Scenario: Sound already allowed
- **WHEN** the player returns to the menu after a run
- **THEN** no title screen shows
