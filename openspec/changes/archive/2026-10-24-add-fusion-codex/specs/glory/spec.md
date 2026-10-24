## MODIFIED Requirements

### Requirement: Achievements
Achievements SHALL be content data: a name, a description, a goal and a gold reward. A goal SHALL measure kills, seconds survived, level, realms cleared, gold collected, active synergies, fusions held, the highest fusion tier reached, or runs played, either within one run or added up over every run, optionally only for one god or only in solo or co-op play. A goal over every god SHALL be met when each god has met it. An achievement SHALL unlock once, when a run meets its goal, and SHALL pay its gold once. The Hall SHALL list every achievement, unlocked ones with their date, locked ones with progress where progress adds up.

#### Scenario: First realm
- **WHEN** a run clears its first realm
- **THEN** `first_gate` unlocks, its gold is added, and the summary names it

#### Scenario: Lifetime kills
- **WHEN** a player who has slain 9,800 foes over earlier runs slays 300 in a run
- **THEN** `slayer_10000` unlocks; before that run the Hall showed its progress as 9,800 / 10,000

#### Scenario: Every god
- **WHEN** `pantheon` asks for a realm cleared with every god and only Athena has not cleared one yet
- **THEN** it unlocks when Athena clears a realm, not before

#### Scenario: Never twice
- **WHEN** a later run meets an unlocked achievement's goal again
- **THEN** no gold is paid again

#### Scenario: Apotheosis
- **WHEN** a run ends holding `apotheosis`
- **THEN** the achievement `apotheosis` unlocks and pays its gold

#### Scenario: Fusion Smith
- **WHEN** a run ends holding three different fusions
- **THEN** `fusion_smith` unlocks
