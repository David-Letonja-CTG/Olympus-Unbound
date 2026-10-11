import { computeStats, Modifier, scaleModifiers, StatBlock } from '../core/stats';
import { AbilityDefinition, SynergyRequirement, WeaponDefinition } from '../data/types';
import { heal } from '../combat/damage';
import { resolveWeaponStats } from '../weapons/resolve';
import { RunState } from '../sim/run-state';
import { Loadout, Player, UpgradeOffer, WeaponInstance } from '../sim/types';

export function createWeapon(
  def: WeaponDefinition | AbilityDefinition,
  stats: StatBlock,
): WeaponInstance {
  const resolved = resolveWeaponStats(def, 1, stats);
  return {
    def: { levels: [], ...def },
    level: 1,
    stats: resolved.stats,
    effects: resolved.effects,
    timer: 0.3,
    state: {},
    damageDealt: 0,
  };
}

/** Every modifier currently affecting a player, from all sources (D4). */
export function collectModifiers(state: RunState, player: Player): Modifier[] {
  const loadout = player.loadout;
  const seat = state.party[player.slot] ?? state.party[0];
  const mods: Modifier[] = [...player.god.passive.modifiers, ...seat.modifiers];
  if (loadout.armour) {
    for (const level of loadout.armour.def.levels.slice(0, loadout.armour.level))
      mods.push(...level.modifiers);
  }
  for (const relic of loadout.relics) mods.push(...relic.modifiers);
  for (const [id, level] of loadout.skills) {
    const skill = state.index.skills.get(id);
    if (skill) mods.push(...scaleModifiers(skill.modifiers, level));
  }
  for (const synergy of loadout.synergies) mods.push(...synergy.modifiers);
  return mods;
}

/** Recomputes stats after a loadout change; extra maximum health is granted as health too. */
export function refreshPlayer(state: RunState, player: Player): void {
  const oldMax = player.stats.maxHealth;
  player.stats = computeStats(player.god.baseStats, collectModifiers(state, player));
  if (player.stats.maxHealth > oldMax) player.health += player.stats.maxHealth - oldMax;
  player.health = Math.min(player.health, player.stats.maxHealth);
  for (const weapon of [...player.loadout.weapons, player.ability]) {
    const resolved = resolveWeaponStats(weapon.def, weapon.level, player.stats);
    weapon.stats = resolved.stats;
    weapon.effects = resolved.effects;
  }
}

export function meetsRequirement(loadout: Loadout, r: SynergyRequirement): boolean {
  switch (r.type) {
    case 'weapon':
      return loadout.weapons.some((w) => w.def.id === r.id && w.level >= (r.minLevel ?? 1));
    case 'armour':
      return loadout.armour?.def.id === r.id && loadout.armour.level >= (r.minLevel ?? 1);
    case 'relic':
      return loadout.relics.some((relic) => relic.id === r.id);
    case 'skill':
      return (loadout.skills.get(r.id) ?? 0) >= (r.minLevel ?? 1);
    case 'element':
      return loadout.weapons.filter((w) => w.def.element === r.element).length >= r.count;
  }
}

/** Activates every synergy whose requirements are newly met; each is announced once (spec: synergies). */
export function evaluateSynergies(state: RunState, player: Player): void {
  let changed = false;
  for (const synergy of state.index.content.synergies) {
    if (player.loadout.synergies.includes(synergy)) continue;
    if (!synergy.requirements.every((r) => meetsRequirement(player.loadout, r))) continue;
    player.loadout.synergies.push(synergy);
    state.emit({ type: 'synergy', id: synergy.id, name: synergy.name });
    state.emit({ type: 'announcement', text: `Synergy: ${synergy.name}!`, kind: 'synergy' });
    changed = true;
  }
  if (changed) refreshPlayer(state, player);
}

/** Applies a chosen offer to the player's loadout (spec: level-up choice). */
export function applyOffer(state: RunState, player: Player, offer: UpgradeOffer): void {
  const loadout = player.loadout;
  switch (offer.kind) {
    case 'newWeapon':
      loadout.weapons.push(createWeapon(state.index.weapon(offer.itemId), player.stats));
      break;
    case 'weaponLevel': {
      const weapon = loadout.weapons.find((w) => w.def.id === offer.itemId);
      if (weapon) weapon.level = Math.min(weapon.level + 1, weapon.def.levels.length + 1);
      break;
    }
    case 'armour': {
      const def = state.index.armour.get(offer.itemId);
      if (def && !loadout.armour) loadout.armour = { def, level: 1 };
      break;
    }
    case 'armourLevel':
      if (loadout.armour)
        loadout.armour.level = Math.min(loadout.armour.level + 1, loadout.armour.def.levels.length);
      break;
    case 'relic': {
      const def = state.index.relics.get(offer.itemId);
      if (def && !loadout.relics.includes(def)) loadout.relics.push(def);
      break;
    }
    case 'skill':
      loadout.skills.set(offer.itemId, (loadout.skills.get(offer.itemId) ?? 0) + 1);
      break;
    case 'heal':
      heal(state, player, player.stats.maxHealth * state.balance.fallback.healFraction);
      break;
    case 'gold':
      state.gold += state.balance.fallback.gold;
      break;
  }
  refreshPlayer(state, player);
  evaluateSynergies(state, player);
}
