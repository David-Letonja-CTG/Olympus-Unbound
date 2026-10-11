# Spec Delta

## Purpose

Lets real artwork (licensed asset packs, later commissioned art) replace the code-drawn placeholder art without gameplay changes, while keeping the game playable when an asset is missing and keeping every external file's licence on record.

## ADDED Requirements

### Requirement: Asset manifest
Every sprite key used by content, effects and UI SHALL resolve through one asset manifest to either an external asset (an image, an atlas frame, or an animation of atlas frames, with scale and anchor) or the code-drawn fallback. Content SHALL keep referring to sprite keys, never to file paths.

#### Scenario: Pack sprite replaces the fallback
- **WHEN** the manifest maps sprite key `satyr` to frames of an installed pack
- **THEN** satyrs are drawn with the pack's frames and the content definition of `satyr` is unchanged

#### Scenario: Key without an external asset
- **WHEN** the manifest has no external asset for sprite key `bronze_bull`
- **THEN** bronze bulls are drawn with the code-drawn sprite

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
