# Design

- **Engine:**
  - `LoadoutSummary.fusions: { id, level, tier }[]`, filled by `resultFor`, so the app needs no content lookup for tiers.
  - A guest's placeholder loadout gets `fusions: []`.
- **Save (D8):**
  - `SAVE_VERSION` 10;
  - migration 9 → 10 adds `discovered.fusions: []`;
  - `parseSave` keeps only known fusion IDs;
  - `Discovered` gains `fusions`; `DiscoveredItem.kind` gains `'fusions'`.
  - `applyRunResult` adds held fusions to the discovered items, idempotent per run ID as before.
- **Glory:** `GoalMeasure` gains:
  - `fusions`: fusions held at the end of the run;
  - `fusionTier`: the highest tier held.

  New achievements:
  - `fusion_smith`: 3 fusions in one run, 300 gold;
  - `apotheosis`: fusion tier 3 in one run, 1000 gold.

  Their icons reuse the crests: `fusion_forge` and `fusion_apotheosis`.
- **Angular:**
  - The progression screen's codex gets a fourth tab, *Fusions*. Items show their crest; the detail adds "Tier I/II/III".
  - The run summary's newly-discovered list resolves fusions from content.
- **Tests:**
  - save migration 9 → 10, and unknown fusion IDs dropped;
  - rewards discover fusions once;
  - glory measures and the two achievements;
  - the codex tab renders discovered and undiscovered fusions.
