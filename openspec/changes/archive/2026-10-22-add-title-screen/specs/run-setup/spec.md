## ADDED Requirements

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
