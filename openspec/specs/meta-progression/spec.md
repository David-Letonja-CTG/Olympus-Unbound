# meta-progression Specification

## Purpose
Defines what persists between runs in the browser: gold, permanent upgrades, discovered items, statistics and settings, and how saved data is versioned and recovered.

## Requirements

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

### Requirement: Settings
The settings screen SHALL let the player change sound effect volume, screen shake on/off, damage numbers on/off, enemy health bars on/off and graphics quality (Low, Medium, High). Changes SHALL apply immediately, including to a running game, and SHALL persist.

#### Scenario: Muting
- **WHEN** the player sets sound effect volume to 0
- **THEN** no sound effects play and the setting is kept after reload

#### Scenario: Graphics quality persists
- **WHEN** the player sets graphics quality to High and reloads the page
- **THEN** graphics quality is still High

#### Scenario: Enemy health bars persist
- **WHEN** the player turns enemy health bars off and reloads the page
- **THEN** the setting is still off

### Requirement: Save format version 2
The save SHALL also record whether the intro has been seen. Saves of version 1 SHALL be migrated to version 2 keeping all their progress; the intro counts as not seen, and graphics quality takes the capability-based default.

#### Scenario: Migrating a version 1 save
- **WHEN** a version 1 save with 300 gold and `vitality` level 2 is loaded
- **THEN** it becomes version 2 with 300 gold, `vitality` level 2 and the intro not yet seen

### Requirement: Save format version 3
The save SHALL also record whether enemy health bars are shown. Saves of version 2 SHALL be migrated to version 3 keeping all their progress and settings, with enemy health bars on.

#### Scenario: An older save
- **WHEN** a version 2 save with damage numbers off is loaded
- **THEN** it becomes version 3 with damage numbers still off and enemy health bars on

### Requirement: Save format version 4
The save SHALL also hold the run history, the solo and co-op high scores, unlocked achievements with their dates, achievement progress, and the day's quests with their progress. Saves of version 3 SHALL be migrated to version 4 keeping all their progress and settings, with empty records. Records SHALL be validated entry by entry like the rest of the save: an invalid entry is dropped, unknown achievement and quest IDs are dropped, and the rest loads.

#### Scenario: An older save
- **WHEN** a version 3 save with 800 gold is loaded
- **THEN** it becomes version 4 with 800 gold, no history, empty high-score tables and no achievements

#### Scenario: A broken record
- **WHEN** one of five high-score entries has no score
- **THEN** the other four load

### Requirement: Save format version 5
The save SHALL also hold the With allies high-score table, and run records SHALL say how many of the gods were bots. Saves of version 4 SHALL be migrated to version 5 keeping everything, with an empty With allies table and no bots in older records.

#### Scenario: An older save
- **WHEN** a version 4 save with three solo high scores is loaded
- **THEN** it becomes version 5 with the same three solo high scores and an empty With allies table

### Requirement: Save format version 6
The save's settings SHALL also hold the music volume (0–1, default 0.5). Saves of version 5 SHALL be migrated to version 6 keeping everything, with the default music volume; an invalid music volume SHALL take the default.

#### Scenario: An older save
- **WHEN** a version 5 save with the sound effects at 30% is loaded
- **THEN** it becomes version 6 with the sound effects at 30% and the music at 50%

### Requirement: Save format version 7

The save's high scores SHALL also hold the Quick table. Saves of version 6 SHALL be migrated to version 7 keeping everything, with an empty Quick table.

#### Scenario: An older save

- **WHEN** a version 6 save with three solo high scores is loaded
- **THEN** it becomes version 7 with the same three solo high scores and an empty Quick table

### Requirement: Save format version 8

The save SHALL also hold the Daily Trial of the last day played: its date, the number of attempts and the best result (score, time, kills, level, realms cleared). Saves of version 7 SHALL be migrated to version 8 keeping everything, with no trial played. A trial record of another day SHALL read as no trial played today.

#### Scenario: An older save

- **WHEN** a version 7 save is loaded
- **THEN** it becomes version 8 with everything kept and no Daily Trial played

#### Scenario: Yesterday's trial

- **WHEN** a save's Daily Trial record is dated yesterday
- **THEN** today's best is empty and the trial counts as not played today

### Requirement: Save format version 9
The save's settings SHALL also hold the player's name: up to 16 characters, empty when none was given. It is the name used in co-op lobbies (shown as "Hero" when empty) and on the share picture. The Settings screen and the Co-op screen SHALL both edit it, and it SHALL persist. Saves of version 8 SHALL be migrated to version 9 keeping everything, with no name. An invalid name SHALL read as none; a long one SHALL be shortened.

#### Scenario: The name persists
- **WHEN** the player types the name "Ada" on the Co-op screen and reloads the page
- **THEN** the Co-op screen and Settings show "Ada"

#### Scenario: An older save
- **WHEN** a version 8 save is loaded
- **THEN** it becomes version 9 with everything kept and no name

### Requirement: Save format version 10
The save's discovered items SHALL also hold fusion IDs. Saves of version 9 SHALL be migrated to version 10 keeping everything, with no fusions discovered. Unknown fusion IDs SHALL be dropped on loading.

#### Scenario: An older save
- **WHEN** a version 9 save is loaded
- **THEN** it becomes version 10 with everything kept and no fusions discovered

#### Scenario: A fusion that no longer exists
- **WHEN** a save lists a discovered fusion ID that is not in the content
- **THEN** that ID is dropped and the save loads

### Requirement: Save format version 11
The save SHALL also hold each event's currency balance, the event rewards bought and the event high-score table. Saves of version 10 SHALL be migrated to version 11 keeping everything, with no currency, no rewards and an empty event table. Unknown events and rewards SHALL be dropped on loading.

#### Scenario: An older save
- **WHEN** a version 10 save is loaded
- **THEN** it becomes version 11 with everything kept and no event currency, rewards or event table

### Requirement: Save format version 12
The save SHALL also hold the skin chosen for each god and each god's crown (laurel or gold), earned by the bosses beaten with that god from version 12 on. Saves of version 11 SHALL be migrated to version 12 keeping everything, with every god in its default skin and no crowns. Unknown gods and skins SHALL be dropped on loading. Crowns SHALL be granted once per run ID, like other rewards.

#### Scenario: An older save
- **WHEN** a version 11 save is loaded
- **THEN** it becomes version 12 with everything kept, every god in the default skin and no crowns

#### Scenario: A removed skin
- **WHEN** a version 12 save names `zeus_tempest` and that skin no longer exists
- **THEN** loading does not fail, and Zeus uses the default skin

#### Scenario: The same run reported twice
- **WHEN** the result of a run in which `zeus` beat `kronos` is applied twice
- **THEN** Zeus has the gold crown, and nothing else changes on the second time
