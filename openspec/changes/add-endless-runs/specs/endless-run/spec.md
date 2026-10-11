# Spec Delta

## Purpose

How a run goes on until death: the chain of realms, the gate between them, what travels with the party, and how every realm cleared makes the next one harder.

## ADDED Requirements

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
Every realm cleared SHALL make the following realms harder by configured fractions: enemy health and damage, spawn rate, enemies alive at once, and boss health and damage. The entity caps SHALL still apply.

#### Scenario: The second realm
- **WHEN** the party has cleared one realm
- **THEN** a new enemy has (1 + the per-realm health fraction) times the health it would have in the first realm at the same realm time
