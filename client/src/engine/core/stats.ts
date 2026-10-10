/**
 * Every number that describes a player during a run. Multiplier stats start at 1 (e.g. `might` 1.2 = +20% damage);
 * flat stats start at their base value (e.g. `maxHealth` 120).
 */
export const STAT_IDS = [
  'maxHealth',
  'armor',
  'regen',
  'moveSpeed',
  'might',
  'area',
  'cooldown',
  'projectiles',
  'pierce',
  'chains',
  'projectileSpeed',
  'duration',
  'critChance',
  'critMultiplier',
  'magnet',
  'xpGain',
  'goldGain',
  'lifesteal',
  'knockback',
  'lightningDamage',
  'fireDamage',
  'physicalDamage',
  'shadowDamage',
  'revivals',
] as const;

export type StatId = (typeof STAT_IDS)[number];
export type StatBlock = Record<StatId, number>;

/** Adds to a stat (`flat`) or scales it (`percent`, 0.1 = +10%). */
export interface Modifier {
  readonly stat: StatId;
  readonly flat?: number;
  readonly percent?: number;
}

/** Values every god starts from before its own base stats. */
export const DEFAULT_STATS: StatBlock = {
  maxHealth: 100,
  armor: 0,
  regen: 0,
  moveSpeed: 200,
  might: 1,
  area: 1,
  cooldown: 1,
  projectiles: 0,
  pierce: 0,
  chains: 0,
  projectileSpeed: 1,
  duration: 1,
  critChance: 0.05,
  critMultiplier: 1.5,
  magnet: 90,
  xpGain: 1,
  goldGain: 1,
  lifesteal: 0,
  knockback: 1,
  lightningDamage: 1,
  fireDamage: 1,
  physicalDamage: 1,
  shadowDamage: 1,
  revivals: 0,
};

/** Lower bounds that keep stacked reductions sane (e.g. cooldown never below 30%). */
const MINIMUMS: Partial<StatBlock> = {
  cooldown: 0.3,
  moveSpeed: 40,
  maxHealth: 1,
  area: 0.25,
  critChance: 0,
};

/** final = (base + Σflat) × (1 + Σpercent), then clamped to the stat's minimum. */
export function computeStats(base: Partial<StatBlock>, modifiers: Iterable<Modifier>): StatBlock {
  const flat: Partial<Record<StatId, number>> = {};
  const percent: Partial<Record<StatId, number>> = {};
  for (const m of modifiers) {
    if (m.flat) flat[m.stat] = (flat[m.stat] ?? 0) + m.flat;
    if (m.percent) percent[m.stat] = (percent[m.stat] ?? 0) + m.percent;
  }
  const result = { ...DEFAULT_STATS };
  for (const id of STAT_IDS) {
    const value = ((base[id] ?? DEFAULT_STATS[id]) + (flat[id] ?? 0)) * (1 + (percent[id] ?? 0));
    result[id] = Math.max(MINIMUMS[id] ?? -Infinity, value);
  }
  return result;
}

/** Repeats a list of modifiers `times` times (skills stacked by level). */
export function scaleModifiers(modifiers: readonly Modifier[], times: number): Modifier[] {
  return modifiers.map((m) => ({
    stat: m.stat,
    flat: m.flat !== undefined ? m.flat * times : undefined,
    percent: m.percent !== undefined ? m.percent * times : undefined,
  }));
}
