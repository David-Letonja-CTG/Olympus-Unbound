# Proposal

## Why

The owner asked for more worlds, with new bosses and enemies all from Greek mythology (2026-10-11), and chose four realms. The Underworld is the first: the realm the endless chain enters after Mount Olympus (`add-endless-runs`), and one players can also start in.

## What Changes

- **The Underworld**:
  - **Look:** the fields of Asphodel under a sunless sky; ash, asphodel meadows and basalt, under a cold violet light with drifting soul-wisps.
  - **Places:** black-marble plazas ringed by obsidian columns and soul-fire braziers, the ruined hall of Hades with its black altar, broken walls, groves of dead trees, and Greek grave stelae, with bones and asphodel underfoot.
  - **Order:** it follows Mount Olympus in content order, so Mount Olympus leads into it and it leads back to Mount Olympus until the next realms exist.
- **Its dead and its guardians**:
  - **Shade:** a spirit of the dead; a weaving chaser that comes in great numbers.
  - **Fury** (one of the Erinyes): a winged avenger; a fast chaser.
  - **Lampad:** a torch-nymph of Hecate; she keeps her distance and hurls soul-fire.
  - **Orthrus:** Cerberus's two-headed brother; he charges.
  - **The skeletal hoplites** of Mount Olympus also fight here.
- **The boss: Cerberus**, the three-headed hound of Hades (after 7 minutes in the realm):
  - **Attacks:** a triple bite around itself, hellfire breath on the ground under the players, and a pounce.
  - **Enraged** below half health: faster, bigger bites and more fire, and it calls the Orthrus pack.
  - **Gold:** 300.
- **Ranged enemies can fire their own projectile sprite**: the Lampad's soul-fire. The default is still the arrow.
- **Art**:
  - Shade, Fury and Lampad are rendered from Flare's hero and heroine.
  - Orthrus and Cerberus are rendered from Quaternius's CC0 animated wolf with grown extra heads; Cerberus also gets a smouldering serpent mane.
  - The new creatures use the same Flare stage (camera, sun) as the rest of the cast.
  - New code-drawn Underworld scenery and the soul-fire projectile.
  - D15 is amended for CC0 models where Flare has no creature.

## Capabilities

### New Capabilities

- `realm-underworld`: the Underworld, its enemies and Cerberus.

### Modified Capabilities

- `enemy-spawning`: ranged attackers may name their projectile.

## Non-goals

- The Lernaean Marsh, Aegean Shore and Labyrinth of Crete (their own changes).
- New boss attack kinds, rivers or other new map features.
