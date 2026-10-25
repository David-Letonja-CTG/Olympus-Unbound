# Proposal

## Why

The second step of the owner's map-quality request (2026-10-25): one landmark per realm, so every realm has a set piece of its own myth, at the same performance.

## What Changes

- A new map rule, `landmark`: one great obstacle on its own site, placed after the roads on ground no road crosses, clear of the spawn, the boss arena and the other sites. It uses its own random stream, so the rest of the arena keeps its layout logic. It may stamp a ground round itself; that ground does not count as a plaza.
- Seven code-drawn landmarks (290–310 px):
  - the **fallen colossus** of Zeus (Olympus);
  - the **gates of Hades**, with skulls on the lintel and the glow of the land beyond (Underworld);
  - a **sunken temple** in black water with a will-o'-wisp (Marsh);
  - a **beached trireme** with an eye on its prow (Aegean);
  - **Daedalus's workshop** and the wings (Labyrinth);
  - the split **throne of Kronos** and his sickle (Othrys);
  - a **hekataion**, three faces and three torches (Crossroads).
- The gates, the sunken temple, the throne and the hekataion give off light.
- The debug snapshot reports the landmark's position, for screenshot scripts.

## Capabilities

### Modified Capabilities

- `arena-generation`: landmarks.

## Non-goals

- Interacting with a landmark (a later step may give some a use).
- Roads to the landmark: roads do not steer round sites, and a road to it could cut through the temple. The minimap shows it.
