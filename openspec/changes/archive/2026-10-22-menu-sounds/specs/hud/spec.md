## ADDED Requirements

### Requirement: Menu sounds
Outside runs, pressing a button, a link or an option on a screen SHALL play a short interface sound at the Sound effects volume:

- a soft pluck for most controls;
- a brighter chime for a screen's main action (its primary button);
- nothing for a disabled control.

The sound SHALL also play for the press that first allows the browser to play sound.

#### Scenario: Choosing a god
- **WHEN** the player clicks a god on the god screen
- **THEN** a soft pluck plays

#### Scenario: Beginning a run
- **WHEN** the player presses Begin
- **THEN** the brighter chime plays as the Hall theme fades out

#### Scenario: A disabled button
- **WHEN** the player presses Begin while it is disabled
- **THEN** no sound plays

#### Scenario: Effects off
- **WHEN** the Sound effects volume is 0%
- **THEN** pressing buttons is silent, and the Hall theme still plays at the Music volume
