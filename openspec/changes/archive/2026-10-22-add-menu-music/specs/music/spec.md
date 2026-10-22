## ADDED Requirements

### Requirement: The Hall theme
Outside runs the game SHALL play a calm theme of its own, composed and synthesized like the battle music (D9). The theme SHALL be a melody over a pad that loops, its second pass fuller than the first.

- **Where it plays:** the menus, the co-op lobby, the Daily Trial and challenge screens, the Hall of Glory, progression, settings and the run summary.
- **Where it stops:** it SHALL fade out when a run or the intro starts, and fade back in when the player returns to the menus.
- **Volume:** it SHALL follow the Music volume, and 0% SHALL silence it.
- **Autoplay:** where the browser allows sound only after the player's first click, key press or touch, the theme SHALL begin then.

#### Scenario: Opening the game
- **WHEN** a returning player opens the game and clicks on the main menu
- **THEN** the Hall theme fades in

#### Scenario: Into a run
- **WHEN** the player begins a run from the realm screen
- **THEN** the Hall theme fades out and the run's battle music takes over

#### Scenario: Back from a run
- **WHEN** a run ends and the summary shows
- **THEN** the Hall theme fades back in

#### Scenario: Music off
- **WHEN** the Music volume is 0%
- **THEN** no theme plays on the menus
