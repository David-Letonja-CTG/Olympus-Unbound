# Design

## Content

`GameContent.instants: InstantDefinition[]` (`id`, `name`, `description`, `weight`, `effect`, optional `minLying`, `visual`). The effect is a union with one rule per type in `progression/instants.ts` (`INSTANT_RULES`), like the merchant's wares (D4). This change adds `{ type: 'gather', kinds: PickupKind[] }`.

`call_of_hermes`: gather `['xp']`, `minLying: 40`, weight 1.4 (about a weapon level's). An offer is valid while the count of living pickups of the effect's kinds lying beyond every living god's magnet is at least `minLying`.

## Offers

`offerCandidates` adds every valid instant as an offer of kind `instant` (`level` 1, `maxLevel` 1). `applyOffer` runs the instant's rule. An instant never enters the loadout, so the run summary, saves and synergies are unchanged.

## Gathering

A gathered pickup is `attracted` and starts counting `calledFor`. `updatePickups` moves it toward the nearest living god at `(ATTRACT_SPEED + 2 × distance) × ramp` units per second, where the ramp rises from 1/6 to 1 over the first second: the gems lift off slowly, then rush in, faster the farther they are, and all arrive in about 1–2 s, like a vortex. The `gathered` event (the god's position and the count) gives a gold-and-teal ring and a sound in the view.

Guests see the gems fly through the frame snapshot as they see any pickup move; no protocol change.

## Tests

- Offered only with enough gems beyond the magnet; never offered with fewer.
- Taking it moves all gems to the god and collects them within 3 s; the XP is added.
- It is offered again later; it leaves the loadout unchanged.
- Content validation: instants have unique ids and known effect types.
