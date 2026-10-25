# Proposal

## Why

The owner asked (2026-10-25) for better-looking realm maps, with performance unchanged. Every ground type is painted as a flat colour with patches and grain, so the realms look alike: Olympus marble, Aegean sand and Labyrinth flagstones differ only in colour.

## What Changes

- Terrain types may name a **pattern**: `slabs`, `cobbles`, `cracks`, `ripples`, `ash`, `mud`, `grass`, `earth`, `moss`, with an optional size and strength.
- The ground painter shades every pixel with its terrain's pattern while it paints the realm behind the loading screen. Patterns fade out across the blend between grounds.
- Every realm's ground types get patterns (28 types). Examples:
  - flagstone slabs and mosaic cobbles in the Labyrinth;
  - wind ripples on the Aegean sand;
  - cracked basalt and sea rock;
  - wet mud in the marsh;
  - bronze floor slabs on Othrys;
  - moss and grave earth at Hecate's crossroads.
- The phone performance script also reports loading time and can measure any realm.

The playable outcome: each realm reads as its own place at a glance, at the same frame rate.

## Capabilities

### Modified Capabilities

- `visual-atmosphere`: painted ground with patterns.

## Non-goals

- Landmarks, breakable props, moving water and weather: later changes of this series.
- Image textures: patterns are procedural, so nothing new is downloaded.
