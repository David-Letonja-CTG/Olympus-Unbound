# Proposal

## Why

Three brothers are playable; the first goddess adds a different style and the owner asked to continue with the next god. Athena, goddess of wisdom and war, plays as a precise striker and battlefield controller.

## What Changes

- **Athena, Goddess of Wisdom and War**: 125 health, 205 speed, 2 armour. She starts with the new **Spear of Athena**. Her ability **Gorgon's Gaze** raises the Aegis: every foe within a wide radius is struck and turned to stone (stunned 2.5 s). Passive **Wisdom of War**: +15% experience, +7% critical chance. Affinities: physical and lightning.
- **Spear of Athena**: a new physical weapon in the shared pool: a piercing bronze javelin with a high critical chance; five levels (more javelins, pierce, speed).
- **Art**: rendered like the cast (`art/blender/athena.py`, the first heroine-based god): bronze and gold armour, a deep-blue skirt, a crested gold helmet, the Aegis and a spear (one blade via `fork_head()`). A javelin projectile, icons for the spear and the Gorgon, and a code-drawn fallback. Crests (Athena, marble sentinel) are now solid plumes instead of hoops.

- **Fix**: a quick tap of the ability key (released before the next frame, likely at low frame rates) was ignored; taps are now latched until a simulation step uses them.

No new behaviours, systems or save changes (D4).

## Capabilities

### Modified Capabilities

- `run-setup`: god selection offers Zeus, Hades, Poseidon and Athena.
- `player-control`: Athena's ability scenario.

## Non-goals

- Unlocks, new realms or enemies; balance beyond a first pass.
