## MODIFIED Requirements

### Requirement: Character art
Every character the player sees (gods, enemies, bosses and cutscene actors) SHALL be drawn from an external sprite sheet with at least idle, walk and death animations, and all character sheets SHALL share one art source and render setup so the cast has one look. Every animation frame SHALL exist in its sheet, and the licence check SHALL fail otherwise. Sheets SHALL hold an in-between frame between each pair of the source animation's frames, and the animations SHALL play at twice the frame rate so their timing is unchanged. God sheets SHALL be rendered empty-handed, one sheet per look, with the weapons as separate layer sheets rendered on the same frames, and with the head's position recorded for every frame.

#### Scenario: Every character is animated
- **WHEN** the content's gods, enemies, bosses and cutscene actors are checked against the manifest
- **THEN** each sprite key has idle, walk and death animations from a sheet

#### Scenario: Frame outside the sheet
- **WHEN** an animation refers to a frame beyond the end of its sprite sheet
- **THEN** `npm run assets:check` fails and names the sprite and frames

#### Scenario: In-between frames
- **WHEN** the `cyclops` walk is played
- **THEN** it has 16 frames at 20 fps and covers the same stride in the same time as before

#### Scenario: A layer out of step
- **WHEN** a weapon layer sheet has a different frame count from the god sheets it is drawn on
- **THEN** `npm run assets:check` fails and names the layer

#### Scenario: Missing look
- **WHEN** a god has no sheet for one of its four looks
- **THEN** `npm run assets:check` fails and names the god and the look

## ADDED Requirements

### Requirement: Character sheets load with the run
The looks, skins and weapon layers of a god SHALL load when a run with that god starts (in a room, every player's god), not with the menus. While a look is still loading, the god SHALL be drawn in a look already loaded.

#### Scenario: Run with Hades only
- **WHEN** a solo run starts as `hades`
- **THEN** the looks of the other gods are not loaded for that run
