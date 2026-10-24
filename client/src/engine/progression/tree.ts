import { ContentIndex, wieldableBy } from '../data/content-index';
import { FusionDefinition, FusionRequirement, SynergyDefinition } from '../data/types';
import { RunState } from '../sim/run-state';
import { HudBuild, HudCombo, HudItem, Loadout, Player } from '../sim/types';

/**
 * Whether a god can ever meet a requirement: no weapon it cannot wield, no fusion that needs one, no more weapons of
 * an element than it can find (spec: run-progression / fusions). Content validation rules out cycles.
 */
function requirementReachable(index: ContentIndex, godId: string, r: FusionRequirement): boolean {
  switch (r.type) {
    case 'weapon': {
      const weapon = index.weapons.get(r.id);
      return !!weapon && wieldableBy(weapon, godId);
    }
    case 'element':
      return (
        index.content.weapons.filter((w) => w.element === r.element && wieldableBy(w, godId))
          .length >= r.count
      );
    case 'fusion': {
      const fusion = index.fusions.get(r.id);
      return !!fusion && comboReachable(index, godId, fusion);
    }
    default:
      return true;
  }
}

/** A fusion or synergy this god can ever complete; others are never offered nor shown. */
export function comboReachable(
  index: ContentIndex,
  godId: string,
  def: FusionDefinition | SynergyDefinition,
): boolean {
  return def.requirements.every((r) => requirementReachable(index, godId, r));
}

/** What a requirement asks and what the loadout has: levels for items, counts for elements, 0/1 for relics. */
export function requirementProgress(
  loadout: Loadout,
  r: FusionRequirement,
): { have: number; need: number } {
  switch (r.type) {
    case 'weapon':
      return {
        have: loadout.weapons.find((w) => w.def.id === r.id)?.level ?? 0,
        need: r.minLevel ?? 1,
      };
    case 'armour':
      return {
        have: loadout.armour?.def.id === r.id ? loadout.armour.level : 0,
        need: r.minLevel ?? 1,
      };
    case 'relic':
      return { have: loadout.relics.some((x) => x.id === r.id) ? 1 : 0, need: 1 };
    case 'skill':
      return { have: loadout.skills.get(r.id) ?? 0, need: r.minLevel ?? 1 };
    case 'element':
      return {
        have: loadout.weapons.filter((w) => w.def.element === r.element).length,
        need: r.count,
      };
    case 'fusion':
      return { have: loadout.fusions.get(r.id) ?? 0, need: r.minLevel ?? 1 };
  }
}

/** The name and icon of what a requirement asks for. */
function requirementLabel(
  index: ContentIndex,
  r: FusionRequirement,
): { name: string; sprite: string } {
  const def =
    r.type === 'weapon'
      ? index.weapons.get(r.id)
      : r.type === 'armour'
        ? index.armour.get(r.id)
        : r.type === 'relic'
          ? index.relics.get(r.id)
          : r.type === 'skill'
            ? index.skills.get(r.id)
            : r.type === 'fusion'
              ? index.fusions.get(r.id)
              : undefined;
  if (def) return { name: def.name, sprite: def.visual.sprite };
  const element = r.type === 'element' ? r.element : '';
  const weapon = index.content.weapons.find((w) => w.element === element);
  return { name: `${element} weapons`, sprite: weapon?.visual.sprite ?? '' };
}

/** Names of the locked fusions and inactive synergies an item counts toward (spec: level-up choice). */
export function comboParts(state: RunState, player: Player, itemId: string): string[] {
  const loadout = player.loadout;
  const parts: string[] = [];
  for (const def of state.index.content.fusions) {
    if ((loadout.fusions.get(def.id) ?? 0) > 0) continue;
    if (!def.requirements.some((r) => 'id' in r && r.id === itemId)) continue;
    if (comboReachable(state.index, player.god.id, def)) parts.push(def.name);
  }
  for (const def of state.index.content.synergies) {
    if (loadout.synergies.includes(def)) continue;
    if (!def.requirements.some((r) => 'id' in r && r.id === itemId)) continue;
    if (comboReachable(state.index, player.god.id, def)) parts.push(def.name);
  }
  return parts;
}

const item = (
  id: string,
  name: string,
  level: number,
  maxLevel: number,
  visual: { sprite: string; color: number },
): HudItem => ({ id, name, level, maxLevel, sprite: visual.sprite, color: visual.color });

/** The build panel's view of a player: what they hold and the tree they can reach (spec: hud / the build panel). */
export function buildSnapshot(state: RunState, player: Player): HudBuild {
  const { index } = state;
  const loadout = player.loadout;
  const tree: HudCombo[] = [];
  const combo = (
    def: FusionDefinition | SynergyDefinition,
    kind: HudCombo['kind'],
    tier: number,
    level: number,
    maxLevel: number,
  ) => {
    const needs = def.requirements.map((r) => {
      const { have, need } = requirementProgress(loadout, r);
      return { ...requirementLabel(index, r), have, need, met: have >= need };
    });
    const ready = needs.every((n) => n.met);
    const state: HudCombo['state'] =
      level >= maxLevel ? 'maxed' : level > 0 ? 'active' : ready ? 'ready' : 'locked';
    tree.push({
      id: def.id,
      name: def.name,
      description: def.description,
      kind,
      tier,
      level,
      maxLevel,
      state,
      sprite: def.visual.sprite,
      needs,
    });
  };
  for (const def of index.content.fusions)
    if (comboReachable(index, player.god.id, def))
      combo(def, 'fusion', def.tier, loadout.fusions.get(def.id) ?? 0, def.maxLevel);
  for (const def of index.content.synergies)
    if (comboReachable(index, player.god.id, def))
      combo(def, 'synergy', 1, loadout.synergies.includes(def) ? 1 : 0, 1);

  const levels = <
    T extends { id: string; name: string; visual: { sprite: string; color: number } },
  >(
    levelsById: ReadonlyMap<string, number>,
    defs: ReadonlyMap<string, T>,
    max: (def: T) => number,
  ): HudItem[] => {
    const items: HudItem[] = [];
    for (const [id, level] of levelsById) {
      const def = defs.get(id);
      if (def) items.push(item(id, def.name, level, max(def), def.visual));
    }
    return items;
  };
  return {
    skills: levels(loadout.skills, index.skills, (d) => d.maxLevel),
    fusions: levels(loadout.fusions, index.fusions, (d) => d.maxLevel),
    // No top level: 0 (spec: run-progression / ascensions).
    ascensions: levels(loadout.ascensions, index.ascensions, () => 0),
    tree,
  };
}
