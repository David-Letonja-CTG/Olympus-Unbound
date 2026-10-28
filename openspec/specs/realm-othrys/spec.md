# realm-othrys Specification

## Purpose
Mount Othrys, the Titans' realm at the end of the chain, with its own monsters and Kronos as its boss.

## Requirements

### Requirement: The Mount Othrys realm
The game SHALL have the realm `mount_othrys`: the Titans' fortress mountain, black basalt and bronze ruins under a storm-red sky, with embers on the wind, fallen statues, braziers and ruined walls. It SHALL follow `labyrinth_of_crete` in the chain of realms; after it SHALL come `mount_olympus`. Players SHALL be able to start a run in it.

#### Scenario: Out of the Labyrinth
- **WHEN** a party passes the gate of `labyrinth_of_crete`
- **THEN** it enters `mount_othrys`

#### Scenario: Back to Olympus
- **WHEN** a party passes the gate of `mount_othrys`
- **THEN** it enters `mount_olympus`, harder

### Requirement: The host of the Titans
Mount Othrys SHALL spawn on its own timeline `titan_soldier` (a chaser, also in packs), `ker` (keeps its distance and throws blood-fire), `gigas` (slow and very tough) and `kampe_scorpion` (charges), with hordes and elites.

#### Scenario: A Ker's blood-fire
- **WHEN** a `ker` is in range of a player
- **THEN** it throws blood-fire that hurts the player it hits

### Requirement: Kronos
After 7 minutes on Mount Othrys, `kronos` SHALL appear in his boss arena. His sickle SHALL sweep before him and the swaddled stone SHALL fall on circles under the players.

Below 60% health it SHALL be announced that Kronos remembers his hunger. He SHALL then devour, call `titan_soldier` and raise the walls of Othrys.

Below 25% health it SHALL be announced that time bends to Kronos. He SHALL then move faster and devour more often.

Defeating him SHALL add his gold to the run and open the gate onward.

#### Scenario: Hunger
- **WHEN** Kronos falls below 60% health
- **THEN** among his attacks he devours and calls `titan_soldier` around himself

#### Scenario: Time bends
- **WHEN** Kronos falls below 25% health
- **THEN** "Time itself bends to Kronos!" is announced and his third phase begins
