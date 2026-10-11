# asset-pipeline Specification

## Purpose
Lets real artwork (licensed asset packs, later commissioned art) replace the code-drawn placeholder art without gameplay changes, while keeping the game playable when an asset is missing and keeping every external file's licence on record.

## Requirements

### Requirement: Asset manifest
Every sprite key used by content, effects and UI SHALL resolve through one asset manifest to either an external asset (an image, an atlas frame, or an animation of atlas frames, with scale and anchor) or the code-drawn fallback. Content SHALL keep referring to sprite keys, never to file paths.

#### Scenario: Pack sprite replaces the fallback
- **WHEN** the manifest maps sprite key `satyr` to frames of an installed pack
- **THEN** satyrs are drawn with the pack's frames and the content definition of `satyr` is unchanged

#### Scenario: Key without an external asset
- **WHEN** the manifest has no external asset for a sprite key, such as the relic `zeus_eye`
- **THEN** that sprite is drawn with the code-drawn art

### Requirement: Loading with progress
External assets SHALL load before they are needed, behind a loading screen that shows progress. Gameplay SHALL NOT start until the assets a run needs have loaded or failed.

#### Scenario: First load
- **WHEN** the game starts with external assets in the manifest
- **THEN** a loading screen shows progress until they have loaded

### Requirement: Fallback on failure
An external asset that fails to load or is malformed SHALL fall back to the code-drawn sprite for that key, and the failure SHALL be logged once; the game SHALL keep running.

#### Scenario: Missing file
- **WHEN** an asset file listed in the manifest returns 404
- **THEN** its sprite keys use the code-drawn art and the run plays normally

### Requirement: Licence registry
Every external asset file SHALL have an entry recording its source, author and licence, and the licence SHALL be one that permits use in this game. An automated check that runs with the other project checks SHALL fail when an asset file in the project has no entry or an entry points to no file.

#### Scenario: Unlicensed file
- **WHEN** an image is added to the asset folder without a licence entry
- **THEN** the project check fails, naming the file

### Requirement: Character art
Every character the player sees (gods, enemies, bosses and cutscene actors) SHALL be drawn from an external sprite sheet with at least idle, walk and death animations, and all character sheets SHALL share one art source and render setup so the cast has one look. Every animation frame SHALL exist in its sheet, and the licence check SHALL fail otherwise.

#### Scenario: Every character is animated
- **WHEN** the content's gods, enemies, bosses and cutscene actors are checked against the manifest
- **THEN** each sprite key has idle, walk and death animations from a sheet

#### Scenario: Frame outside the sheet
- **WHEN** an animation refers to a frame beyond the end of its sprite sheet
- **THEN** `npm run assets:check` fails and names the sprite and frames

### Requirement: Character portraits in menus
Menus that picture a character (god selection, main menu, realm selection, codex) SHALL show the character's sheet art when it has a sheet, and the code-drawn picture while the sheet loads or if it fails.

#### Scenario: Choosing a god
- **WHEN** the god selection screen shows `zeus`
- **THEN** his portrait is cut from his sheet's first frame

### Requirement: Walk animation follows movement
A walking character's animation SHALL play at a rate that covers its stride at its actual speed, within limits, so feet do not slide; the same SHALL hold for cutscene actors.

#### Scenario: Fast god
- **WHEN** Zeus moves at twice the speed his walk cycle covers at its own frame rate
- **THEN** his walk animation plays twice as fast

### Requirement: Credits dialog
The works whose licences ask for credit SHALL be listed in a credits dialog opened by a Credits button in Settings, grouped by work — each work once, with its author, licence and source, and the game's uses of it listed under it. The dialog SHALL close with Escape, its close button or a click outside it.

#### Scenario: Reading the credits
- **WHEN** the player opens Settings and presses Credits
- **THEN** a dialog lists each credited work once with its uses, and Escape closes it
