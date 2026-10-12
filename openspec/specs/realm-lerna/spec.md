# realm-lerna Specification

## Purpose
The Lernaean Marsh: the third realm of the endless chain, its map, its creatures from the myth of Heracles at Lerna, and the Hydra.

## Requirements

### Requirement: The Lernaean Marsh realm
The game SHALL have the realm `lernaean_marsh`: bog, mud and reedbeds around deep water in a green mist, lit by will-o'-wisps, with sunken shrines of mossy marble, a drowned temple, broken walls, cypress groves, reeds and lily pads. It SHALL follow `the_underworld` in the chain of realms, and players SHALL be able to start a run in it.

#### Scenario: Into the marsh
- **WHEN** a party passes the gate of `the_underworld`
- **THEN** it enters `lernaean_marsh`

### Requirement: The creatures of Lerna
The marsh SHALL spawn on its own timeline `swamp_serpent` (fast, weaving, numerous, also in packs), `giant_crab` (slow, tough), `lamia` (coils, then lunges) and `naiad` (keeps her distance and spits venom), with hordes and elites.

#### Scenario: Venom
- **WHEN** a `naiad` is in range of a player
- **THEN** she spits venom, drawn as a green glob, that hurts the player it hits

### Requirement: The Hydra
After 7 minutes in the marsh, `hydra` SHALL appear in its boss arena. Its heads SHALL bite in a circle around it, venom SHALL rain on circles under the players, and it SHALL call its brood of `swamp_serpent`; below half health it SHALL be announced that two heads grow back for each one cut, move faster, call a larger brood, rain more venom and lunge along a telegraphed line. Defeating it SHALL add its gold to the run and open the gate onward.

#### Scenario: The brood
- **WHEN** the Hydra uses its brood attack
- **THEN** `swamp_serpent` appear around it
