# Proposal

## Why

Since local co-op, the HUD says the same thing twice: player 1 is in the big HUD and again in the party panel, and players 2–4 have only a small card. The owner approved (2026-10-20) mockups of one HUD for every mode, in a Diablo-like style: one set of pieces, sized to where they sit, with nobody shown twice.

## What Changes

- **One player's plaque**, built from shared pieces: an orb of blood for health, stamina, a dash pip, an ability slot with its key, and the loadout.
- **Solo, and online rooms** (this screen's player): a bronze frieze along the bottom with a Greek key border. Like Diablo, it holds an orb of blood (health) on the left and an orb of golden ichor (stamina) on the right, each a crystal sphere on a bronze tripod, with the dash pip, the ability beside it, and the loadout and experience in the middle.
- **Two players at one screen:** the frieze splits. Player 1 is on the left and player 2 on the right, mirrored, and each has their own orb of blood ringed by their stamina, dash pip, ability (with their key) and loadout. Experience and level stay in the middle, shared.
- **Three or four players at one screen:** a compact plaque in every corner (player 1 top-left, 2 top-right, 3 bottom-left, 4 bottom-right). The minimap, with gold and kills, moves below the top-right plaque. Experience runs alone along the bottom.
- **Medallions** replace the party list for gods not played at this screen: bots, and the other players in a room. Each is a round portrait in its seat colour with a health ring, and for players a stamina arc and an ability gem; a fallen god turns grey with its revive filling the ring. Gods at this screen are never listed again.
- A fallen local player's plaque turns grey and shows their revive.

## Capabilities

### Modified Capabilities

- `hud`: the plaque, frieze, corners and medallions replace the party list and the local-player cards.

## Non-goals

- New art files: everything is drawn in code (SVG and CSS), like the amphora it replaces. The owner chose the orbs on a tripod from six concepts (2026-10-20).
- Changing what the HUD shows (timer, boss bar, banners and synergies stay).
