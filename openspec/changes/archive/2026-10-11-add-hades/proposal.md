# Proposal

## Why

The vision promises gods that each fight differently (product vision: "Choose a god (Zeus, Hades, …)"). Zeus is the only god; the roadmap's expansion phase starts with Hades. A second god doubles the reasons to play another run and tests that gods really are data.

## What Changes

- **Hades, Lord of the Underworld** — a close-range, sustaining god: 150 health, 190 speed, 2 armour. Starts with the new **Bident of Hades**; his ability **Gates of Tartarus** opens the abyss around him (a shadow nova: damage, a brief stun, a long slow, and he heals from it); passive **Lord of the Dead**: +15% shadow damage and 1.5% lifesteal on all damage. Affinities: shadow and fire.
- **Bident of Hades** — a new shadow weapon (the existing sweep behaviour as a narrow forward thrust) with lifesteal and a slow; five levels. It joins the shared item pool, so Zeus can find it too.
- **Art** — Hades is rendered like the rest of the cast (`art/blender/hades.py`: blackened steel, crimson tabard, black hair and beard, iron crown, soul-fire eyes, the bident); new code-drawn icons for the bident and the ability, and a code-drawn fallback figure.

No new behaviours, systems or save changes: gods and weapons are data (D4).

## Capabilities

### Modified Capabilities

- `run-setup`: god selection offers Zeus and Hades.
- `player-control`: Hades's ability scenario.

## Non-goals

- Unlock conditions for gods (all gods are available).
- Poseidon (next change), new realms or enemies.
- Balance beyond a first pass checked with autopilot runs and play.
