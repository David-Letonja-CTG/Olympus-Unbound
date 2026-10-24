# Proposal

## Why

The owner chose this polish after v0.15.0 (2026-10-24). Fusions reuse the plain glyphs of skills and synergies, so on the HUD and in the build panel a fusion looks like any other item. Completing the tree's crown, *Apotheosis*, is announced like a synergy, which undersells the end of a long climb.

## What Changes

- **Fusion crests:** every fusion gets its own icon, a hex with a gilded rim (not iron) and one to three tier pips. Its face shows the glyphs of what it fuses, overlapped: the Forge shows hammer and flame, the Volley bow and arrows. *Apotheosis* shows a new laurel crown.
- **Fanfare by tier:** the first level of a fusion bursts round the god, larger for higher tiers. Tier III has its own rising fanfare, a golden flash and a heavier screen shake.

## Capabilities

### Modified Capabilities

- `run-progression`: how a fusion is announced.

## Non-goals

- Slowing down time: the simulation advances only by fixed steps (D5).
- New icons for skills, relics or synergies.
