import { StatBlock } from '../core/stats';
import { StatusApplication, WeaponDefinition, WeaponLevel, WeaponStats } from '../data/types';

type MutableStats = { -readonly [K in keyof WeaponStats]: WeaponStats[K] };

const NUMERIC_KEYS: readonly (keyof WeaponStats)[] = [
  'damage',
  'cooldown',
  'amount',
  'speed',
  'pierce',
  'size',
  'range',
  'arc',
  'duration',
  'knockback',
  'chains',
  'critChance',
  'homing',
];

/**
 * A weapon's effective numbers at `level` for a player with `stats`: base + level deltas (and an evolution's `extra`
 * step, spec: run-progression / weapon evolutions), then the player's
 * cooldown, area, projectile, pierce, chain, speed and duration stats. Damage multipliers (might, elements,
 * crits) and the knockback stat are applied per hit by the damage pipeline, not here.
 */
export function resolveWeaponStats(
  def: Pick<WeaponDefinition, 'base' | 'effects' | 'behavior'> & {
    levels?: WeaponDefinition['levels'];
  },
  level: number,
  stats: StatBlock,
  extra?: WeaponLevel,
): { stats: WeaponStats; effects: StatusApplication[] } {
  const s: MutableStats = { ...def.base };
  const effects = [...(def.effects ?? [])];
  const levels = def.levels ?? [];
  const deltas = levels.slice(0, Math.max(0, level - 1));
  if (extra) deltas.push(extra);
  for (const delta of deltas) {
    for (const key of NUMERIC_KEYS) {
      const value = delta[key];
      if (value !== undefined) s[key] += value;
    }
    if (delta.effects) effects.push(...delta.effects);
  }

  s.cooldown *= stats.cooldown;
  if (def.behavior !== 'nova') s.amount += Math.floor(stats.projectiles);
  s.size *= stats.area;
  if (def.behavior === 'projectile') s.speed *= stats.projectileSpeed;
  if (s.pierce >= 0) s.pierce += Math.floor(stats.pierce);
  s.chains += Math.floor(stats.chains);
  s.duration *= stats.duration;
  return { stats: s, effects };
}
