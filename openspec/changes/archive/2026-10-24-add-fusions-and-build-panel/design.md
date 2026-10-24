# Design

## Content

- `FusionDefinition` (`id`, `name`, `description`, `tier` 1–3, `maxLevel`, `requirements`, per-level `modifiers`, `visual`). Requirements reuse the synergy requirement types plus `{ type: 'fusion', id, minLevel? }`.
- `AscensionDefinition` (`id`, `name`, `description`, per-level `modifiers`, `visual`), with no top level.
- `GameContent.fusions`, `GameContent.ascensions`, in `content/items.ts`. Validation:
  - known ids in requirements;
  - a tier II/III fusion requires a fusion of the tier below, and only fusions of lower tiers;
  - no cycles;
  - `maxLevel` ≥ 1.
- Fusion offers weigh `offerWeights.fusion` (3, well above a weapon level's 1.3). The first fusions are exciting and should not hide behind other offers.

Fourteen fusions:
- tier I: four common and six for two upgrades at their top level, among them one per god's own weapons;
- tier II: three, each of two tier I at the top;
- tier III: `apotheosis`, of the three tier II.

Four ascensions. Values in `docs/content.md`.

## Engine

- `Loadout.fusions: Map<id, level>`, `Loadout.ascensions: Map<id, level>`. `collectModifiers` scales their modifiers by level, like skills. `LoadoutSummary` (the run summary, saved in records) is unchanged, so `SAVE_VERSION` is unchanged.
- `meetsRequirement` gains the `fusion` case.
- `progression/tree.ts`:
  - `reachable(index, godId)`: the fusions and synergies a god can ever reach, so no requirement needs a weapon the god cannot wield, recursively through fusions;
  - `requirementStatus(loadout, r)`: have and need levels;
  - the HUD's `build` section.
- `offerCandidates`:
  - adds every reachable fusion whose requirements are all met and whose level is below its top;
  - when the candidates (instants not counted) number fewer than `offerCount`, adds every ascension (weight 1);
  - adds `parts` (names of locked reachable fusions and inactive synergies the offer's item counts toward) to each offer.
- `generateOffers` keeps its fallback (heal + gold) for content without ascensions.
- `applyOffer`: `fusion` and `ascension` raise their level; a taken fusion is announced once ("Fusion: Forge of Hephaestus!", the synergy cue).
- Bots: Hard bots score fusions 25 and ascensions 4.

## HUD

`HudSnapshot.build`, computed in `RunSimulation.hud(playerId)` from that player's loadout:

- `skills`, `fusions`, `ascensions` as `HudItem`s;
- `tree`: one entry per reachable fusion and synergy, with:
  - `kind`, `tier` (synergies count as tier I), `state` (`active`, `maxed`, `ready`, `locked`), `level`, `maxLevel`;
  - `needs`: `{ name, sprite, have, need, met }`.

It is small (about 20 entries of a few requirements) and is sent with the HUD at its usual rate. Guests get their own through the host's per-seat HUD.

## Angular

- `BuildPanel` (`features/game/build-panel.ts`), shown by `PlayScreen` while a `buildOpen` signal is set:
  - toggled by Tab (document keydown, prevented so focus does not move), the gamepad Back/Select button (`UiInput` 'build' from `input.ts`, button 8), and a touch button beside pause;
  - shown over the level-up dialog too;
  - a right-hand drawer on desktop, full width on a phone, with a close button;
  - Escape closes it before it would pause.
- The level-up dialog shows `parts` under an offer's description ("Toward: Forge of Hephaestus").
- Icons: `fusion_*` (hex, gold rim), `ascend_*` (round), in `engine/art/sprites.ts`.

## Tests

- Fusions are offered only with every requirement met, never past their top level. Tier II needs tier I at its top.
- Fusions needing another god's weapon are never offered and not in the tree (`hades`, `sky_father`).
- Ascensions only when fewer than three other offers remain; three ascensions when everything is maxed; a level beyond any.
- The tree: `forge_of_hephaestus` locked with `war_hammer` have 4 need 6, then ready, then active.
- Offer parts name the fusion.
- Content validation: tiers, unknown ids, cycles.
- Angular: the build panel renders the tree from a HUD snapshot; Tab toggles it in `PlayScreen`.
- e2e: Tab opens the panel during a run and the run goes on.
