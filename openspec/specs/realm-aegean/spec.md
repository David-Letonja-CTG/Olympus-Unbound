# realm-aegean Specification

## Purpose

The Aegean Shore: the fourth realm of the endless chain, its map, its creatures of Greek sea myth, and Scylla.

## Requirements

### Requirement: The Aegean Shore realm

The game SHALL have the realm `aegean_shore`: moonlit wet sand, dunes and sea-rock above the sea, with sea-worn marble temples and plazas, beached shipwrecks, spilled amphorae, beacon braziers, shells and seaweed. It SHALL follow `lernaean_marsh` in the chain of realms, and players SHALL be able to start a run in it.

#### Scenario: Onto the shore

- **WHEN** a party passes the gate of `lernaean_marsh`
- **THEN** it enters `aegean_shore`

### Requirement: The creatures of the shore

The shore SHALL spawn on its own timeline `drowned_sailor` (slow, relentless, also in packs), `siren` (keeps her distance and hurls her song), `triton` (charges) and `giant_crab`, with hordes and elites.

#### Scenario: A siren's song

- **WHEN** a `siren` is in range of a player
- **THEN** she hurls her song, drawn as rose rings, that hurts the player it hits

### Requirement: Scylla

After 7 minutes on the shore, `scylla` SHALL appear in her boss arena. Her hounds SHALL bite in a circle around her, whirlpools SHALL open on circles under the players, and her tentacles SHALL lash along a telegraphed line; below half health it SHALL be announced that the drowned answer her, she SHALL call `drowned_sailor`, move faster, bite wider and open more whirlpools. Defeating her SHALL add her gold to the run and open the gate onward.

#### Scenario: The drowned answer

- **WHEN** Scylla falls below half health
- **THEN** among her attacks she calls `drowned_sailor` around herself
