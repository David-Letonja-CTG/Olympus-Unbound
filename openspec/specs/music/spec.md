# music Specification

## Purpose
Defines the battle music: its tiers from calm to metal, what makes it rise and fall, how it follows the run's state, and its volume.

## Requirements

### Requirement: Battle music
During a run the game SHALL play music it composes and synthesizes itself (D9: no external recordings). The music SHALL have five tiers of rising intensity: Calm, Stirring, Battle, Fury and Titan. Each tier SHALL be faster and heavier than the one before, from a lyre and frame drum to metal drums, bass and distorted guitars, with Titan the heaviest. A change of tier SHALL take effect at the end of the current bar.

#### Scenario: The run begins calm
- **WHEN** a run starts in the first realm with few foes near
- **THEN** the Calm tier plays

#### Scenario: On the beat
- **WHEN** the intensity crosses into the next tier mid-bar
- **THEN** the new tier begins at the start of the next bar

### Requirement: What drives the music
The music's intensity SHALL rise with the time spent in the realm toward its boss, with every realm cleared, with the number of foes around the player's own god, and SHALL reach Titan while a boss is awake. It SHALL rise promptly and fall back slowly, so it does not flicker between tiers. In a room, each player's music SHALL follow their own god's surroundings.

#### Scenario: Building toward the boss
- **WHEN** the realm's time nears the boss's arrival with an ordinary crowd
- **THEN** the music has risen to Battle or above

#### Scenario: Harder realms
- **WHEN** the party enters the third realm
- **THEN** the music starts above Calm

#### Scenario: Surrounded
- **WHEN** forty foes close in around the player's god early in a realm
- **THEN** the music rises at least one tier, and falls back after the foes are gone

#### Scenario: Boss
- **WHEN** a boss is awake
- **THEN** the Titan tier plays

### Requirement: Music and the run's state
The music SHALL duck while the game is paused, SHALL keep playing during upgrade choices and the shop, SHALL continue through a gate into the next realm, and SHALL fade out when the run ends.

#### Scenario: Paused
- **WHEN** the player pauses the run
- **THEN** the music plays much quieter until the run resumes

#### Scenario: The end
- **WHEN** the run ends
- **THEN** the music fades out within a few seconds

### Requirement: Music volume
Settings and the pause menu SHALL have a Music volume from 0 to 100%, apart from the sound effects volume; changing it SHALL apply at once, and 0% SHALL silence the music.

#### Scenario: Turning the music down
- **WHEN** the player sets Music to 0% in the pause menu
- **THEN** the music is silent and the sound effects still play

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
