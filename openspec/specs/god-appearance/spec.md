# god-appearance Specification

## Purpose
TBD - created by archiving change dressed-gods. Update Purpose after archive.

## Requirements

### Requirement: Armour looks
Every playable god SHALL have four looks: bare (look 0) and three armoured looks (1–3), each with a clearly different outline at play size (for example, a cuirass, then a helm and shoulder plates, then gilded plate with a cape). In a run, a god's look SHALL follow the armour it wears: look 0 without armour, look 1 at armour level 1, look 2 from level 2, and look 3 at the armour's last level. The armour of the look SHALL be drawn in the worn armour's colour. The look SHALL change nothing in the rules: not the hitbox, the stats, or what enemies target.

#### Scenario: Bare start
- **WHEN** a run starts as `zeus` without armour
- **THEN** Zeus is drawn in look 0

#### Scenario: Building the aegis
- **WHEN** Zeus takes `aegis_of_olympus` and raises it to level 2, then to its last level, 3
- **THEN** he is drawn in look 1, then look 2, then look 3, the armour in the aegis's gold

#### Scenario: Another armour
- **WHEN** `hades` wears `underworld_armour` at level 1
- **THEN** he is drawn in look 1, the armour in that armour's colour

#### Scenario: Look does not touch the rules
- **WHEN** the same seed is played twice, once with the looks drawn and once headless
- **THEN** both runs end in the same state

### Requirement: The weapon in the hand
A god SHALL hold its strongest weapon: the weapon with the highest level, and on a tie the one taken first. The weapon SHALL move with the god's hand in every frame of every animation and flip with the god. With no weapon, the god SHALL be drawn empty-handed. An evolved weapon SHALL glow in its evolution's colour and leave a short trail in that colour when the god swings.

#### Scenario: Strongest weapon
- **WHEN** Zeus holds `thunder_spear` at level 3 and `divine_bow` at level 5
- **THEN** he holds the bow

#### Scenario: A tie
- **WHEN** Zeus took `thunder_spear` first and then `war_hammer`, and both are at level 4
- **THEN** he holds the spear

#### Scenario: Evolved
- **WHEN** `thunderbolt` evolves into `keraunos` and is still his strongest weapon
- **THEN** the held bolt glows in Keraunos's colour, and his ability swing leaves a trail

#### Scenario: Facing left
- **WHEN** the god turns left mid-walk
- **THEN** the weapon stays in the hand on the same frame, mirrored with the body

### Requirement: Relic motes
Each relic a god holds SHALL add a small mote of light in the relic's colour that circles the god, up to six motes. The motes SHALL be drawn under the readable layer, so they never hide enemies, enemy projectiles, telegraphs or pickups (D13).

#### Scenario: Seven relics
- **WHEN** a god holds seven relics
- **THEN** six motes circle the god

### Requirement: The moment of change
When a god's look number rises in a run, the game SHALL mark it once with a short column of light on the god and the god's cast pose, lasting under a second, without pausing play. A look that stays the same or drops (for example, when a guest's snapshot is replayed) SHALL show nothing.

#### Scenario: Look 1 to look 2
- **WHEN** the aegis reaches level 2
- **THEN** a column of light rises on Zeus once and he plays his cast pose, while the horde keeps moving

#### Scenario: Same look again
- **WHEN** the look is recomputed with an unchanged result
- **THEN** no column is shown

### Requirement: Boss trophies
A god SHALL wear a laurel crown once any boss has been beaten with that god, and a gold crown instead once Kronos (`kronos`) has been beaten with that god. The crown SHALL sit on the god's head in every frame and look.

#### Scenario: First boss
- **WHEN** the player has beaten `hydra` with `poseidon` and no boss with `athena`
- **THEN** Poseidon wears the laurel in every run and Athena wears no crown

#### Scenario: Kronos
- **WHEN** the player has beaten `kronos` with `zeus`
- **THEN** Zeus wears the gold crown instead of the laurel

### Requirement: Skins
A god SHALL have a default skin and MAY have more skins. Each skin recolours all four looks of that god. A skin SHALL be unlocked by an achievement or by an event shop reward. God selection SHALL show the god's skins: unlocked skins can be chosen, and locked skins show what unlocks them and cannot be chosen. The chosen skin SHALL be kept per god between sessions and SHALL be used in runs, previews and rooms. A skin SHALL never change the rules.

#### Scenario: Unlocking a skin
- **WHEN** the player earns `storm_lord`
- **THEN** Zeus's `zeus_tempest` skin can be chosen on god selection

#### Scenario: Locked skin
- **WHEN** the player has not earned `grey_eyed`
- **THEN** Athena's `athena_owl` skin is shown as locked, with its achievement named, and selecting it does nothing

#### Scenario: Unknown skin in the save
- **WHEN** the save names a skin that no longer exists for a god
- **THEN** the god uses the default skin

### Requirement: Previews
God selection SHALL picture the god in its chosen skin and crown. The codex SHALL show each god's four looks side by side in the chosen skin.

#### Scenario: Codex
- **WHEN** the player opens the codex entry for `hades`
- **THEN** looks 0–3 of Hades are shown in his chosen skin
