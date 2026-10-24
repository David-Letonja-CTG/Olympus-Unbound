## MODIFIED Requirements

### Requirement: Codex and statistics
The progression screen SHALL show every weapon, armour, relic and fusion as discovered (name and description; a fusion also its tier) or undiscovered (hidden), and the statistics: runs, realms cleared, total kills and best survival time. A fusion SHALL become discovered when a run ends with it at any level.

#### Scenario: Discovering an item
- **WHEN** a run ends holding `war_hammer` for the first time
- **THEN** the codex shows `war_hammer` as discovered

#### Scenario: Discovering a fusion
- **WHEN** a run ends with `forge_of_hephaestus` at level 1, for the first time
- **THEN** the codex's Fusions tab shows it as discovered with its crest and tier, and the run summary names it as newly discovered

#### Scenario: Not yet forged
- **WHEN** the player has never ended a run with `apotheosis`
- **THEN** the codex shows it as undiscovered

## ADDED Requirements

### Requirement: Save format version 10
The save's discovered items SHALL also hold fusion IDs. Saves of version 9 SHALL be migrated to version 10 keeping everything, with no fusions discovered. Unknown fusion IDs SHALL be dropped on loading.

#### Scenario: An older save
- **WHEN** a version 9 save is loaded
- **THEN** it becomes version 10 with everything kept and no fusions discovered

#### Scenario: A fusion that no longer exists
- **WHEN** a save lists a discovered fusion ID that is not in the content
- **THEN** that ID is dropped and the save loads
