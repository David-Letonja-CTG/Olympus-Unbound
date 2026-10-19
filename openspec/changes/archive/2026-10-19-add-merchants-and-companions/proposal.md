# Proposal

## Why

The owner asked (2026-10-19) for NPCs in the game to buy things from, "like some animals to help you", built future-proof so more can be sold later, "like weapon upgrades or something". Today gold collected in a run only counts after it; nothing in a run can be bought, and a god always fights alone.

## What Changes

- **The Wandering Merchant** visits every realm twice (at 2:30 and 5:30 of the realm's time), appears a short walk from the party, stays 75 seconds, and leaves. Its arrival is announced; it shows on the minimap, with a pointer at the screen's edge, a ring around it and a banner with the time left. It is lit so it stays readable at night.
- Stepping into the merchant's ring opens the **shop** (the run pauses, like a treasure; in a room the others wait for the shopper, as for choices). The shop lists **wares** with their price in the run's gold, and *Leave*. Buying takes the gold and keeps the shop open; it opens again only after the god steps out and back in.
- **Wares are content data**, each with an **effect kind** handled by one reusable rule. The kinds now:
  - **Companion**: an animal that fights beside its god for the rest of the run.
  - **Whetstone**: one more level for a weapon of the buyer's choice, offered per weapon not yet at its maximum.
  - **Ambrosia**: heals the buyer.
  New kinds (armour upgrades, relics, rerolls…) are a new effect handler plus data.
- **Companions** (data: look, speed, how far they hunt, and an attack that is a weapon definition fired through the existing weapon behaviors and the one damage pipeline; optionally healing their god):
  - **Eagle of Zeus**: dives onto foes and blasts them with lightning, shocking.
  - **Hound of the Underworld**: runs down foes and bites in a burning arc.
  - **Temple Serpent**: keeps its distance, spits venom that slows, and slowly heals its god.
  A god may keep up to three companions, one of each. Companions cannot be hurt, follow their god through gates, and wait where their god fell.
- Prices grow with each realm cleared. Gold spent is gone from the run's total.
- Co-op: the merchant and companions are part of the host's world and appear on every screen; each player shops for themselves from the party's shared gold.

## Capabilities

### New Capabilities

- `merchant`: the merchant, the shop, wares and companions.

### Modified Capabilities

- `hud`: the merchant banner, the merchant on the minimap, companions in the loadout.

## Non-goals

- Companions that can be hurt, levelled or dismissed; merchants that sell permanent upgrades; haggling.
- New character renders: the merchant and companions use existing rendered sheets (D15), tinted and scaled to read as friendly.
