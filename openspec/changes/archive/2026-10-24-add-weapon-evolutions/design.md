# Design

- **Content:** `EvolutionDefinition` (`id`, `name`, `description`, `weapon`, `requirements: FusionRequirement[]`, `upgrade: WeaponLevel`, `splash: { radius, fraction }`, `visual`). The list is `GameContent.evolutions`. Validation checks:
  - known weapon and requirement IDs;
  - at most one evolution per weapon;
  - fraction in (0, 1].
- **Weight:** `offerWeights.evolution` 3.5, above a fusion's 3: an evolution is the bigger moment.
- **State:** `WeaponInstance.evolution?: EvolutionDefinition`.
  - `refreshPlayer` resolves its stats with the upgrade as one more level delta: `resolveWeaponStats(def, level, stats, extra?)`.
  - `hitSource` carries `splash` when evolved.
- **Damage:** in `hitEnemy`, after the hit, a source with `splash` strikes every other living enemy within the radius of the target (spatial hash) with `{ ...source, damage: damage × fraction, splash: undefined }` through `hitEnemy` itself. Splash strikes are therefore one level deep, and use crits, lifesteal and statuses like any hit. It emits `splash` (`x`, `y`, `radius`, `color`) once per hit that splashes, for a burst in the view.
- **Offers:** an `evolution` candidate appears when the weapon is at its top, has no evolution yet, and meets every requirement. `applyOffer` sets the evolution and announces "Evolution: Spear of Olympus!" with the `fusionTaken` tier I fanfare (shared event, `id` of the evolution).
- **HUD:** the weapon's `HudItem` shows the evolution's name and sprite. The build tree gains `kind: 'evolution'` entries, shown in their own section. Its requirement list starts with the weapon at its top level. `comboParts` names evolutions too.
- **Art:** `evolved_*` icons are crests with one glyph and no pips (`FUSION_CRESTS` with tier 0), so evolved weapons wear gold.
- **Bots:** Hard bots score evolutions 30.
- **Tests:** offered only at the top with the relic, once; transforms the weapon (name, stats, splash); a splash strikes neighbours and not again; fusions still count; another god's evolutions hidden; content validation.
