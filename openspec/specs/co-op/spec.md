# co-op Specification

## Purpose
Several players in one run: who is in it, how upgrades are chosen, how the difficulty follows the party's size, and what each player sees of the run.

## Requirements

### Requirement: Party
A run SHALL hold one to four players, each with their own god (stats, passive, ability, starting weapon and look), name and permanent upgrades. All players SHALL start on the spawn plaza, apart from each other. A run without a party SHALL be a solo run of its god.

#### Scenario: Three gods together
- **WHEN** a run starts with `zeus`, `hades` and `athena`
- **THEN** three players start on the spawn plaza with `thunder_spear`, `bident` and `spear_of_athena`

### Requirement: Own upgrades
Experience and level SHALL be shared by the party. When the party levels up or opens a treasure, every living player SHALL get their own choice of offers; the run SHALL stay paused for choosing until every one of them has chosen, and each answer SHALL be accepted once.

#### Scenario: Two players level up
- **WHEN** a party of two levels up and one player has chosen
- **THEN** the run stays paused until the other player has chosen, then continues

### Requirement: Difficulty per player
Each player beyond the first SHALL add a configured fraction of enemy health, spawn rate, the number of enemies alive at once, and boss health, so a party faces a challenge like a solo player's.

#### Scenario: A party of three
- **WHEN** a party of three is in a run
- **THEN** a new enemy has 1 + 2 × 65% of its solo health, and the boss 1 + 2 × 90%

### Requirement: Fair spawns for every player
With several living players, enemies SHALL spawn around a randomly chosen player's view and never inside any living player's view.

#### Scenario: Players far apart
- **WHEN** two players stand far apart
- **THEN** no enemy appears inside either player's view

### Requirement: Each player's view of the run
The HUD and the run's result SHALL be available for each player: their health, ability, loadout and god, and the shared time, level, kills, gold and outcome.

#### Scenario: Another player's result
- **WHEN** a party's run ends
- **THEN** each player's result shows their own god and loadout and the shared outcome

### Requirement: Reviving allies
When a god falls in a party, their spirit SHALL stay where they fell. A living ally standing within reach of the spirit SHALL revive them after 3 seconds in total; progress SHALL drain while no ally is in reach and SHALL be visible to every player. A revived god SHALL return with half their maximum health and a moment of invulnerability. A player who left the run SHALL NOT be revived. When every god has fallen, the run SHALL end in defeat.

#### Scenario: Standing by a fallen friend
- **WHEN** Ana's god falls and Bo stands beside her spirit for 3 seconds
- **THEN** Ana's god rises with half health and everyone is told

#### Scenario: Stepping away
- **WHEN** Bo leaves the spirit after 2 seconds
- **THEN** Ana stays fallen and the progress drains
