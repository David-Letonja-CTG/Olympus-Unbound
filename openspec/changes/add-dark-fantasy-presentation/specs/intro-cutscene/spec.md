# Spec Delta

## Purpose

Opens the game with a short in-engine scene that sets up the story — the war on Olympus and Zeus unbound — using the game's own sprites, lighting and effects.

## ADDED Requirements

### Requirement: The intro scene
The intro SHALL be a scripted scene of 45–60 seconds rendered by the game engine with game sprites, lighting and effects, with narrated captions. Its shots, captions and timings SHALL be defined as data, so the scene can change without engine changes.

#### Scenario: Watching the intro
- **WHEN** the intro plays to the end
- **THEN** the player has seen Olympus at night, the hordes breaking through, the gods falling and Zeus taking up the thunder, with captions, and the main menu opens

### Requirement: Plays once on first launch
The intro SHALL play automatically the first time the game is opened, after loading. Once it has finished or been skipped, it SHALL NOT play automatically again.

#### Scenario: First launch
- **WHEN** a player opens the game for the first time
- **THEN** the intro plays before the main menu

#### Scenario: Returning player
- **WHEN** a player who has seen or skipped the intro opens the game again
- **THEN** the main menu opens directly

### Requirement: Skipping
The intro SHALL be skippable at any moment with Escape, Enter, Space, a click, or the gamepad's south or Start button, after a visible prompt. A skip SHALL go straight to the main menu.

#### Scenario: Skipping with Escape
- **WHEN** the player presses Escape ten seconds into the intro
- **THEN** the intro ends and the main menu opens

### Requirement: Replaying
The main menu SHALL offer replaying the intro; a replay SHALL return to the main menu at its end or when skipped.

#### Scenario: Replay from the menu
- **WHEN** the player chooses Intro in the main menu
- **THEN** the intro plays from the start and then returns to the main menu
