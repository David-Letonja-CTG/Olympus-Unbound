# Proposal

## Why

Phase 2 of the owner's map-quality request (2026-10-25): map hazards (lava vents, falling columns, crushing walls) and helpers (healing springs, braziers to light, chokepoints). The realms should fight back and lend a hand, so where you stand matters. Performance must stay the same.

## What Changes

**Hazards** hurt gods and monsters alike, so luring the horde into them is a tactic. Their warnings are the same telegraphs as a boss's: readable at every quality level, and a perfect dodge works on them.

- **Lava vents** on Mount Othrys's ember ground and in the Underworld: every few seconds a vent marks a circle, then erupts.
- **Teetering columns** in Olympus's ruins: some columns lean. When a god comes near, one marks a line and falls along it. It stays fallen, a stump and a broken shaft.
- **Crushing walls** in the Labyrinth: stone slabs beside its ways mark a line across the road, then slam together, again and again.

**Helpers:**

- **Healing springs** on Olympus, the marsh and the shore: standing in one heals a god quickly until its water is spent. It refills after a while and looks dry until then.
- **Braziers to light** in the Underworld, the Labyrinth and at the Crossroads: a god who touches a cold brazier lights it for the rest of the realm. A lit brazier gives light and sets nearby monsters burning.
- **Chokepoints:** ruined sea walls on the Aegean Shore and ramparts on Mount Othrys, with breaches to hold.

Hazard damage to gods grows with the realm's monster damage. To monsters it is a share of their health; bosses are spared. In rooms, guests see the same telegraphs, fallen columns, lit braziers and dry springs.

## Capabilities

### Modified Capabilities

- `arena-generation`: map hazards, map helpers.

## Non-goals

- Moving collision: slabs and columns do not change what blocks movement. A fallen column's stump stands where the column stood.
- Features chosen by the Director of Chaos.
