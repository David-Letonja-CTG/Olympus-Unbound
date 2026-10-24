# Proposal

## Why

The owner chose a codex of fusions (2026-10-24). Fusions are the long climb of a run. Once a run ends, nothing remembers which a player has forged, and nothing rewards reaching the top of the tree.

## What Changes

- **The codex remembers fusions:**
  - A fusion held at the end of a run becomes discovered, like weapons, armour and relics.
  - The progression screen's codex gains a *Fusions* tab: discovered fusions show their crest, name, tier and description; others show "Undiscovered".
  - The run summary names newly discovered fusions.
- **Achievements for the tree:**
  - *Fusion Smith* (three fusions in one run);
  - *Apotheosis* (reach the tier III fusion).
- **Save format 10:** the save's discovered items gain fusions; saves of version 9 are migrated with none.

## Capabilities

### Modified Capabilities

- `meta-progression`: codex and statistics; save format version 10.
- `glory`: achievements may measure fusions.

## Non-goals

- Carrying fusions into the next run, or starting runs with them.
- A codex of synergies or skills.
