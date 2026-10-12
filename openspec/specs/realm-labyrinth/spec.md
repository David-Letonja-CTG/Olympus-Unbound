# realm-labyrinth Specification

## Purpose
The Labyrinth of Crete: the fifth realm of the endless chain, its maze, its creatures of Cretan myth, and Asterion.

## Requirements

### Requirement: The Labyrinth of Crete realm
The game SHALL have the realm `labyrinth_of_crete`: an underground maze of dressed stone under warm torchlight with no moon, its walls spanning the map, with rooms of red Minoan columns, a shrine with a bull altar, horns of consecration, torches, bones, straw and labrys floor tiles. It SHALL follow `aegean_shore` in the chain of realms, and players SHALL be able to start a run in it.

#### Scenario: Into the Labyrinth
- **WHEN** a party passes the gate of `aegean_shore`
- **THEN** it enters `labyrinth_of_crete`

### Requirement: Ariadne's thread
A red thread SHALL be drawn on the ground along the road from the spawn to Asterion's arena.

#### Scenario: Follow the thread
- **WHEN** a `labyrinth_of_crete` arena is generated
- **THEN** exactly one road, the one ending at the boss arena, carries the thread

### Requirement: The creatures of the Labyrinth
The Labyrinth SHALL spawn on its own timeline `curete` (quick, also in packs), `snake_priestess` (keeps her distance and hurls her curse), `bronze_guardian` (slow and very tough) and `minotaur` (charges), with hordes and elites.

#### Scenario: A priestess's curse
- **WHEN** a `snake_priestess` is in range of a player
- **THEN** she hurls her curse, drawn as gold coils, that hurts the player it hits

### Requirement: Asterion
After 7 minutes in the Labyrinth, `asterion` SHALL appear in his boss arena. His labrys SHALL sweep in a circle around him, stones SHALL fall on circles under the players, and he SHALL rush along a telegraphed line. Below 60% health it SHALL be announced that the Labyrinth answers its king: he SHALL call `minotaur`, move faster, sweep wider and bring down more stones. Below 25% health it SHALL be announced that he goes berserk: he SHALL move faster still and rush more often. Defeating him SHALL add his gold to the run and open the gate onward.

#### Scenario: The Labyrinth answers
- **WHEN** Asterion falls below 60% health
- **THEN** among his attacks he calls `minotaur` around himself

#### Scenario: Berserk
- **WHEN** Asterion falls below 25% health
- **THEN** "Asterion goes berserk!" is announced and his third phase begins
