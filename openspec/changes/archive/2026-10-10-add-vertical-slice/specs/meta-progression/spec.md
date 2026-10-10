# Spec Delta

## Purpose

Defines what persists between runs in the browser: gold, permanent upgrades, discovered items, statistics and settings, and how saved data is versioned and recovered.

## ADDED Requirements

### Requirement: Browser save
Persistent progress SHALL be stored only in the browser, as one versioned save record. Live gameplay objects SHALL never be stored. The save SHALL be written whenever progress or settings change.

#### Scenario: Reload keeps progress
- **WHEN** the player earns gold, reloads the page and opens the main menu
- **THEN** the same gold total is shown

### Requirement: Robust loading
Loading SHALL accept missing, partial, invalid or older save data without losing valid fields: missing or invalid fields SHALL take defaults, unknown IDs SHALL be dropped, older versions SHALL be migrated, and a save that cannot be parsed at all SHALL start fresh without crashing. If storage is unavailable, the game SHALL keep progress in memory for the session.

#### Scenario: One field missing
- **WHEN** a stored save has valid gold 500 but no settings field
- **THEN** gold is 500 and settings take their defaults

#### Scenario: Corrupt save
- **WHEN** the stored save is not valid JSON
- **THEN** the game starts with a fresh save and the main menu works

#### Scenario: Unknown upgrade ID
- **WHEN** the save lists permanent upgrade `removed_upgrade`
- **THEN** it is ignored and the other upgrades load

### Requirement: Permanent upgrades
The progression screen SHALL list permanent upgrades with their level, maximum level, effect and next cost. Buying one SHALL cost gold, raise its level, be saved, and apply to every later run. An upgrade at its maximum level or too expensive SHALL NOT be buyable.

#### Scenario: Buying Vitality
- **WHEN** the player with 200 gold buys `vitality` level 1 costing 100
- **THEN** gold is 100, `vitality` is level 1, and the next run starts with more maximum health

#### Scenario: Not enough gold
- **WHEN** the player has less gold than the next level's cost
- **THEN** the buy action is disabled

### Requirement: Codex and statistics
The progression screen SHALL show every weapon, armour and relic as discovered (name and description) or undiscovered (hidden), and the statistics: runs, victories, total kills and best survival time.

#### Scenario: Discovering an item
- **WHEN** a run ends holding `war_hammer` for the first time
- **THEN** the codex shows `war_hammer` as discovered

### Requirement: Settings
The settings screen SHALL let the player change sound effect volume, screen shake on/off and damage numbers on/off. Changes SHALL apply immediately, including to a running game, and SHALL persist.

#### Scenario: Muting
- **WHEN** the player sets sound effect volume to 0
- **THEN** no sound effects play and the setting is kept after reload
