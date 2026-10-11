# Proposal

## Why

With Zeus (a ranged critical-hit god) and Hades (a close-range drainer), the third brother completes the classic trio: Poseidon, a god of control who holds the line by pushing the horde away. The owner asked for Poseidon right after Hades.

## What Changes

- **Poseidon, Lord of the Sea**: 135 health, 200 speed, 30% stronger knockback. He starts with the existing **Trident**. His ability **Tidal Wave** sends a wide arc of nine piercing walls of sea-water that crash through every foe, hurl them back and leave them slowed. Passive **Earth-Shaker**: +30% knockback, +10% area, +10% physical damage. Affinities: physical and lightning (his storms).
- **Art**: rendered like the cast (`art/blender/poseidon.py`): a sea-green chiton with gold, dark sea-green hair and beard, a gold crown with a sea gem, and a golden trident built on the shared `fork_head()`. A new code-drawn wave projectile, a Tidal Wave icon and a code-drawn fallback figure.

No new behaviours, systems or save changes (D4).

## Capabilities

### Modified Capabilities

- `run-setup`: god selection offers Zeus, Hades and Poseidon.
- `player-control`: Poseidon's ability scenario.

## Non-goals

- Water as an element, new realms (Atlantis) or enemies.
- Balance beyond a first pass with autopilot runs and play.
