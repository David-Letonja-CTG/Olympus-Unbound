# Spec Delta

## Purpose

The Underworld: the second realm of the endless chain, its map, its enemies of Greek myth, and Cerberus.

## ADDED Requirements

### Requirement: The Underworld realm
The game SHALL have the realm `the_underworld`, the fields of Asphodel: ash, asphodel meadows and basalt under a cold violet light, with black-marble plazas ringed by obsidian columns and soul-fire braziers, the ruined hall of Hades with a black altar, broken walls, dead trees and grave stelae. It SHALL follow `mount_olympus` in the chain of realms, and players SHALL be able to start a run in it.

#### Scenario: Into the Underworld
- **WHEN** a party passes the gate of `mount_olympus`
- **THEN** it enters `the_underworld`

#### Scenario: Starting in the Underworld
- **WHEN** the player chooses `the_underworld` on the realm screen and begins
- **THEN** the run starts on its spawn plaza with its own monsters

### Requirement: The dead and their guardians
The Underworld SHALL spawn creatures of the Greek Underworld on its own timeline: `shade` (a weaving chaser in great numbers), `fury` (a fast chaser), `lampad` (keeps her distance and hurls soul-fire), `orthrus` (charges), and the skeletal `corrupted_hoplite`, with hordes and elites like Mount Olympus's.

#### Scenario: Soul-fire
- **WHEN** a `lampad` is in range of a player
- **THEN** she fires soul-fire, drawn as violet flame, that hurts the player it hits

### Requirement: Cerberus
After 7 minutes in the Underworld, `cerberus` SHALL appear in its boss arena. It SHALL bite in a circle around itself, breathe hellfire on circles under the players, and pounce along a telegraphed line; below half health it SHALL move faster, bite wider, breathe more fire and call a pack of `orthrus`. Defeating it SHALL add its gold to the run and open the gate onward.

#### Scenario: The pack
- **WHEN** Cerberus falls below half health
- **THEN** it is enraged, announced once, and among its attacks calls `orthrus` around itself
