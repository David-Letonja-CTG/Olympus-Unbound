# Proposal

## Why

Phase 1c of the owner's map-quality request (2026-10-25): the realms are pretty but inert. Jars and crates you smash for a little loot make the map something to explore, at the same performance.

## What Changes

- Every realm scatters **breakable props**, small clusters of jars, urns or crates fitting its myth:
  - amphorae on Olympus;
  - funerary urns in the Underworld;
  - reed baskets in the marsh;
  - amphorae and fish crates on the shore;
  - crates in the Labyrinth;
  - bronze urns on Othrys;
  - offering gourds at the Crossroads.
- A god **breaks a prop by walking into it** (a dash too). The prop shatters with shards and a crack, and drops some of: gold, XP, and rarely a heal.
- Props are part of the generated arena: deterministic, never on a road's centre, the spawn plaza, the boss arena or an obstacle. They do not block anyone. Enemies pass over them and do not break them.
- In rooms, the host's broken props reach every guest.

## Capabilities

### Modified Capabilities

- `arena-generation`: breakable props.

## Non-goals

- Weapons breaking props: each weapon would need its own rule. Walking into them is one clear rule.
- Props hiding special items, traps or monsters.
