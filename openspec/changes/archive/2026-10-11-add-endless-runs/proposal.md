# Proposal

## Why

The owner wants runs that last until death instead of ending at 7 minutes, and a way to bring fallen friends back in co-op. On 2026-10-11 they chose *realm after realm*: defeating a realm's boss opens a gate to the next realm, the horde keeps growing, and the run ends only when every god has fallen. They also chose *stand next to them* for reviving. New realms (the Underworld, Lernaean Marsh, Aegean Shore, Labyrinth of Crete) follow in their own changes and plug into this chain.

## What Changes

- **Endless runs**:
  - **The gate:** when a realm's boss falls, the party receives the realm's boss gold, and a gate opens where the boss stood. Standing in the gate for 2 seconds (or waiting 60 seconds) takes the whole party to the next realm.
  - **The order of realms:** they follow content order, starting from the chosen realm and wrapping around. Each passage builds a new arena from a seed derived from the run's seed.
  - **What travels:** loadouts, level, experience, gold, kills and the clock carry over. The spoils still on the ground are gathered, and fallen gods rise again at half health.
- **Deeper is harder**: every realm cleared multiplies enemy health and damage, spawn rate, the number of enemies alive at once, and boss health and damage. The factors live in content (`balance.endless`). Each realm's own timeline and scaling restart in every realm.
- **Endings**:
  - A run ends only in `defeat` (every god down) or `abandoned`; there is no `victory` anymore.
  - Results and the summary report the realms cleared.
  - The progression screen counts realms cleared where it counted victories.
- **Reviving in co-op**: a fallen god's spirit stays where they fell. A living ally standing beside it for 3 seconds revives them at half health, briefly invulnerable. A ring shows the progress. Players who left the room cannot be revived.
- **Between realms**: the loading screen shows the next realm and how deep the party is, while that realm is painted and every room member loads it.
- **HUD**: the current realm and its number, and the open gate with its countdown. An arrow points to the gate when it is off-screen.

## Capabilities

### New Capabilities

- `endless-run`: the chain of realms, the gate, travelling and difficulty by depth.

### Modified Capabilities

- `run-outcome`: endings, rewards and the summary without victory.
- `boss-encounter`: the boss arrives by realm time in every realm; defeating it opens the gate.
- `co-op`: reviving allies.
- `run-loading`: loading between realms.
- `hud`: realm and gate.
- `meta-progression`: statistics count realms cleared.

## Non-goals

- New realms, bosses or enemies (separate changes, one per realm).
- Choosing the next realm at the gate.
- Saving or resuming a run.
