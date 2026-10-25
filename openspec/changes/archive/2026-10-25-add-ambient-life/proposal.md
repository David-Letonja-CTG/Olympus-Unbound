# Proposal

## Why

The last step of the owner's map-quality request (2026-10-25): moving water, fire and smoke, wildlife, wind, weather and light. The realms should feel alive. The owner asked that performance stay the same, so all of it is decoration in the view: none of it touches the simulation, and it costs nothing on Low.

## What Changes

Each realm's atmosphere may set:

- **Weather:** particles drifting across the view on the realm's wind:
  - olive leaves on Olympus;
  - falling ash in the Underworld and on Othrys;
  - fireflies over the marsh;
  - sea spray on the shore;
  - dust motes in the Labyrinth;
  - dead leaves at the Crossroads.
- **Lightning** (Olympus, Othrys): now and then the whole realm flashes white and thunder rolls in the distance.
- **Cloud shadows** (Olympus, the shore): soft shadows sliding slowly over the ground.
- **Moving water:** glints that come and go on the water: the marsh's deep water and bog, the shore's shallows and sea.
- **Smoke:** thin smoke rising from fires (braziers, torches, lit braziers, lava vents).
- **Wildlife:** a few creatures near the gods that flee when one comes close:
  - doves on Olympus;
  - bats in the Underworld and at the Crossroads;
  - frogs in the marsh;
  - gulls on the shore;
  - rats in the Labyrinth;
  - crows on Othrys.
- **Wind:** trees and reeds sway.

Graphics quality decides how much shows:

- **Low:** none of it, so phones keep their frame time.
- **Medium:** half the weather, smoke and wildlife; no cloud shadows or swaying.
- **High:** all of it.

## Capabilities

### Modified Capabilities

- `visual-atmosphere`: ambient life.

## Non-goals

- Weather that changes play (rain slowing, wind pushing): footing and hazards cover that.
- Wildlife the gods can hit, or that the simulation knows of.
