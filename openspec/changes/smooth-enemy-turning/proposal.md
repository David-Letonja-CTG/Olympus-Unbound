# Proposal

## Why

The owner asked for smoother character movement (2026-10-21). An enemy's heading jumps from one step to the next:
- when it switches between walking straight at a god it sees and following the way round obstacles;
- when the way turns by 45° at a cell's edge;
- when a ranged enemy switches between closing in and backing off.

In a crowd these snaps read as jitter.

The same session measured where the time goes. The way-finding refresh caused spikes in step time (p95 1.9 ms at 400 enemies). It now runs in linear time.

## What Changes

- **Turning:** enemies turn toward the heading they want at a limited rate (a full about-turn takes about a quarter of a second) instead of snapping. A charger's wind-up and dash keep their straight line, and knockback is unchanged.
- **Faster way-finding:** the refresh of the way to the gods is a bucket queue over integer step costs instead of a heap. Same paths, about a third less step time at its peaks. This part is not player-visible.

## Capabilities

### Modified Capabilities

- `enemy-spawning`: finding the way, now with turning.

## Non-goals

- Rendering performance. Phaser's drawing is about half the main thread on a throttled phone. The simulation is about a tenth and already small (≈0.4 ms per step at 400 enemies on a desktop).
- Turning for bosses and boss parts; their attacks aim on their own.
