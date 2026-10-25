# Proposal

## Why

Phase 2 of the owner's map-quality request (2026-10-25): terrain that changes how you move, so the ground matters to a fight. Kiting through a bog costs you; ice carries you past the horde. Performance must stay the same.

## What Changes

- Terrain types may set their **footing**:
  - `speed` multiplies everyone's walking speed on it, gods and monsters alike;
  - `grip` (0–1) is how quickly a god's walk follows the stick, so on ice a god slides on and turns wide.
- The Lernaean Marsh's **bog** slows everyone to 80%.
- The Aegean Shore gains **shallows**: tidal water between the rocks and the wet sand, slowing everyone to 80%.
- The Underworld gains the frozen **Cocytus**: pale ice in the basalt where gods slide (grip 0.06) and monsters keep their footing.
- Dashes ignore footing. Bosses keep their own pace.
- In rooms, a guest predicts its own god on the same footing.

## Capabilities

### Modified Capabilities

- `arena-generation`: footing.

## Non-goals

- Footing for enemies' sliding, projectiles, or pickups.
