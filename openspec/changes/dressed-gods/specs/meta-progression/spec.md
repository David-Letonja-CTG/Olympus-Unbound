## ADDED Requirements

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
