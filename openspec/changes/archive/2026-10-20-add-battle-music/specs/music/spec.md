## ADDED Requirements

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
