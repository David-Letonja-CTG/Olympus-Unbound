# Spec Delta

## MODIFIED Requirements

### Requirement: Boss arrival
In every realm of a run, at that realm's boss time (counted from entering the realm) the realm's boss SHALL appear in the boss arena, the players SHALL be notified with the boss's name, a boss health bar SHALL appear, and an indicator SHALL point to the boss while it is off-screen. Regular spawning SHALL continue at reduced intensity.

#### Scenario: The Cyclops arrives
- **WHEN** the party has spent 07:00 in `mount_olympus`
- **THEN** boss `cyclops` appears with its health bar and name shown

#### Scenario: Only one boss
- **WHEN** the boss time passes again because of a pause or a long frame
- **THEN** still only one `cyclops` exists in the realm

### Requirement: Defeating the boss
When the boss's health reaches 0 it SHALL die once and drop its rewards; the realm's boss gold SHALL be added to the run's gold, and the gate to the next realm SHALL open (see endless-run).

#### Scenario: Boss defeated
- **WHEN** the `cyclops` health reaches 0
- **THEN** the run continues, its gold grows by the realm's boss gold, and a gate opens where the Cyclops fell
