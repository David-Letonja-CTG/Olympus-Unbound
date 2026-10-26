# endless-run Specification

## Purpose
How a run goes on until death: the chain of realms, the gate between them, what travels with the party, and how every realm cleared makes the next one harder.

## Requirements

### Requirement: Chain of realms
A run SHALL start in the chosen realm and continue through the realms in content order, wrapping around after the last one, for as long as any god lives. Each realm's arena SHALL be generated from a seed derived from the run's seed and the number of realms cleared, so the same run seed always produces the same chain. Each realm's spawn timeline, events, boss time and per-minute scaling SHALL count from the moment the party enters it; the run's clock SHALL keep counting from the start of the run.

#### Scenario: The same chain
- **WHEN** two runs with the same seed, god and starting realm clear their first realm
- **THEN** both enter the same next realm with the same arena

#### Scenario: Wrapping around
- **WHEN** the party clears the last realm in content order
- **THEN** the next realm is the first one in content order

### Requirement: The gate
When a realm's boss is defeated, a gate SHALL open where the boss stood and the party SHALL be told where it leads. Travelling SHALL begin when any living god has stood inside the gate for 2 seconds in total without leaving it, or 60 seconds after the gate opened. While the gate is open, regular spawning SHALL continue.

#### Scenario: Stepping through
- **WHEN** a god stands in the open gate for 2 seconds
- **THEN** the whole party enters the next realm

#### Scenario: Waiting too long
- **WHEN** nobody enters the gate for 60 seconds
- **THEN** the party is taken to the next realm anyway

### Requirement: Travelling
Entering a realm SHALL keep every god's loadout, stats and health, and the party's level, experience, gold, kills and run time. All enemies, projectiles and telegraphs SHALL be removed; experience, gold, healing and treasure left on the ground SHALL be gathered for the party; fallen gods who are still in the run SHALL rise at half health. The party SHALL appear together on the new realm's spawn plaza, and the run SHALL wait until every player's game has loaded the new realm.

#### Scenario: Spoils gathered
- **WHEN** the party travels with 30 experience on the ground
- **THEN** the party gains those 30 experience

#### Scenario: A fallen friend comes along
- **WHEN** the party travels while one god is fallen
- **THEN** that god enters the next realm alive with half health

### Requirement: Difficulty by depth
Every realm cleared SHALL make the following realms harder:

- Enemy health and damage, and boss health and damage, SHALL be multiplied by a configured growth factor per realm cleared, compounding.
- The spawn rate and the number of enemies alive at once SHALL rise by a configured fraction per realm cleared.
- The growth of enemy health per realm SHALL be at least the most any realm's own per-minute growth reaches, so a new realm's first enemies are never weaker than the last enemies of the realm before.
- Every realm after the first SHALL start its spawn phases a configured number of seconds in per realm cleared, up to a configured maximum. Its timed events, boss time and merchant arrivals SHALL keep their own times.
- The difficulty dial's realm growth SHALL compound on top (spec: difficulty-dial).

The entity caps SHALL still apply.

#### Scenario: The second realm
- **WHEN** the party has cleared one realm
- **THEN** a new enemy has the per-realm health growth times the health it would have in the first realm at the same realm time, and deals the per-realm damage growth times its damage

#### Scenario: Compounding
- **WHEN** the party has cleared two realms
- **THEN** a boss has the square of the per-realm boss health growth times its health in the first realm

#### Scenario: Never weaker on arrival
- **WHEN** the party enters the second realm after a long fight in the first
- **THEN** the first enemies of the second realm have at least the health of the same enemies at the end of the first

#### Scenario: Head start
- **WHEN** the party enters the second realm
- **THEN** its spawn phase is the one due 120 seconds into the realm, while its first horde and its boss come at their own times

#### Scenario: The first realm is unchanged
- **WHEN** a run starts
- **THEN** the first realm's enemies, spawn phases and boss are as before

### Requirement: Event realms outside the chain
Realms of a seasonal event SHALL stand outside the chain of realms. A run that starts in one SHALL go on, realm after realm, from the first realm of the chain. No run SHALL reach an event realm through a gate.

#### Scenario: From the crossroads
- **WHEN** a party clears `crossroads_of_hecate`
- **THEN** its gate leads to `mount_olympus`

#### Scenario: Never through a gate
- **WHEN** a party clears `mount_othrys`
- **THEN** its gate leads to `mount_olympus`, not to an event realm
