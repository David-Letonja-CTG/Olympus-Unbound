# Proposal

## Why

The owner chose weapon evolutions (2026-10-24). Fusions add numbers. A weapon at its top level still looks and plays the same for the rest of a long run, and the late game lacks moments where the build visibly changes.

## What Changes

- **Evolutions:** every weapon can evolve once.
  - The weapon must be at its top level and the god must hold a matching relic, e.g. Thunder Spear + Zeus's Eye → *Spear of Olympus*.
  - The evolution is then offered at level-up with a high weight.
  - Taking it transforms the weapon: a new name, a gilded icon, one more step of numbers and a new way of hitting.
  - The weapon keeps its place, its damage record and its identity for fusions and synergies.
- **Splash on hit** (the one new reusable behavior): every hit of an evolved weapon also strikes the foes round its target for a share of the damage, through the one damage pipeline, with a burst in the weapon's colour.
- **Ten evolutions**, one per weapon:

  | Weapon | Relic | Evolution |
  |---|---|---|
  | Thunder Spear | Zeus's Eye | Spear of Olympus |
  | Thunderbolt | Zeus's Eye | Keraunos |
  | Lightning Orb | Eye of Horus | Orbs of the Aether |
  | Divine Bow | Trident Fragment | Bow of Apollo |
  | Trident | Trident Fragment | Trident of the Abyss |
  | War Hammer | Golden Fleece | Hammer of Hephaestus |
  | Flaming Sword | Phoenix Feather | Phoenix Blade |
  | Soul Scythe | Soul Lantern | Scythe of Thanatos |
  | Bident | Soul Lantern | Bident of Tartarus |
  | Spear of Athena | Eye of Horus | Spear of Pallas |
- **The build panel** lists the evolutions the god can reach, with what is still needed. Offers name the evolutions they count toward.

The playable outcome: in the second realm the player takes Zeus's Eye because the panel says the spear can evolve. Two level-ups later every spear bursts in thunder where it lands.

## Capabilities

### Modified Capabilities

- `run-progression`: weapon evolutions.
- `combat`: splash on hit, within the one damage pipeline.

## Non-goals

- New projectile art for evolved weapons; they keep their projectiles, recoloured bursts show the change.
- Evolving abilities or companions.
- A second evolution of an evolved weapon.
