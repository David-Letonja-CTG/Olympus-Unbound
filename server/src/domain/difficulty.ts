/**
 * The difficulty dial (spec: difficulty-dial, D23): multipliers every player's game applies to the runs it starts. The
 * server only keeps and hands out these numbers; the games apply them (D1).
 */
export interface DifficultyDial {
  /** Every enemy's and boss's health. */
  readonly enemyHealth: number;
  /** Every enemy's and boss's damage. */
  readonly enemyDamage: number;
  /** How fast enemies spawn. */
  readonly spawnRate: number;
  /** Extra growth per realm cleared on health and damage, compounding. */
  readonly realmGrowth: number;
}

export const DEFAULT_DIAL: DifficultyDial = {
  enemyHealth: 1,
  enemyDamage: 1,
  spawnRate: 1,
  realmGrowth: 1,
};

/** The range of each value: far enough to tune, never so far a run breaks. */
export const DIAL_LIMITS: Readonly<Record<keyof DifficultyDial, readonly [number, number]>> = {
  enemyHealth: [0.25, 5],
  enemyDamage: [0.25, 5],
  spawnRate: [0.5, 3],
  realmGrowth: [0.5, 3],
};

/** A dial from a request body, or why not: every value a finite number within its limits. */
export function checkDial(input: unknown): { dial: DifficultyDial } | { refusal: 'bad-dial' } {
  if (typeof input !== 'object' || input === null) return { refusal: 'bad-dial' };
  const body = input as Record<string, unknown>;
  const dial: Record<string, number> = {};
  for (const [key, [lo, hi]] of Object.entries(DIAL_LIMITS)) {
    const value = body[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi)
      return { refusal: 'bad-dial' };
    dial[key] = Math.round(value * 100) / 100;
  }
  return { dial: dial as unknown as DifficultyDial };
}
