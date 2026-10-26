import { inject, Injectable, signal } from '@angular/core';
import { RunConfig } from '../../engine';
import { GameServer } from './game-server';

/**
 * The difficulty dial (spec: difficulty-dial, D23): multipliers the admin sets on the game server for every player.
 * The game applies them to the runs it starts; the server only keeps the numbers (D1).
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

/** The server's limits (server/src/domain/difficulty.ts): a value outside them is not used. */
export const DIAL_LIMITS: Readonly<Record<keyof DifficultyDial, readonly [number, number]>> = {
  enemyHealth: [0.25, 5],
  enemyDamage: [0.25, 5],
  spawnRate: [0.5, 3],
  realmGrowth: [0.5, 3],
};

const CACHE_KEY = 'olympus-unbound/difficulty';

/** A dial from the server or the cache, or none when any value is missing or out of its limits. */
export function parseDial(raw: unknown): DifficultyDial | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const body = raw as Record<string, unknown>;
  const dial: Record<string, number> = {};
  for (const [key, [lo, hi]] of Object.entries(DIAL_LIMITS)) {
    const value = body[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi)
      return undefined;
    dial[key] = value;
  }
  return dial as unknown as DifficultyDial;
}

/**
 * A run with the dial on top of its own rules (a Daily Trial's twist, a quick run): the multipliers compound with the
 * rules' own; the default dial leaves the config as it is.
 */
export function withDial(config: RunConfig, dial: DifficultyDial): RunConfig {
  const { enemyHealth, enemyDamage, spawnRate, realmGrowth } = dial;
  if (enemyHealth === 1 && enemyDamage === 1 && spawnRate === 1 && realmGrowth === 1) return config;
  const rules = config.rules ?? {};
  const enemies = rules.enemies ?? {};
  return {
    ...config,
    rules: {
      ...rules,
      enemies: {
        ...enemies,
        health: (enemies.health ?? 1) * enemyHealth,
        damage: (enemies.damage ?? 1) * enemyDamage,
        spawnRate: (enemies.spawnRate ?? 1) * spawnRate,
      },
      realmGrowth: (rules.realmGrowth ?? 1) * realmGrowth,
    },
  };
}

function readCache(): DifficultyDial | undefined {
  try {
    return parseDial(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'));
  } catch {
    return undefined;
  }
}

function writeCache(dial: DifficultyDial): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dial));
  } catch {
    // Storage blocked: the dial lasts until the page reloads.
  }
}

/**
 * The dial as this game knows it: the server's, refreshed whenever the main menu opens; offline, the last one seen;
 * never seen, the default.
 */
@Injectable({ providedIn: 'root' })
export class Difficulty {
  private readonly server = inject(GameServer);
  readonly current = signal<DifficultyDial>(readCache() ?? DEFAULT_DIAL);

  /** Asks the server for the dial; keeps the one known when it cannot answer. */
  async refresh(): Promise<void> {
    if (!this.server.configured) return;
    try {
      const dial = parseDial(await this.server.get<unknown>('/api/difficulty'));
      if (dial) this.keep(dial);
    } catch {
      // Unreachable or offline: the last dial seen stands.
    }
  }

  /** Sets the dial for every player (the admin page); throws the server's refusal. */
  async save(dial: DifficultyDial, token: string): Promise<DifficultyDial> {
    const saved = parseDial(
      await this.server.post<unknown>('/api/admin/difficulty', dial, {
        authorization: `Bearer ${token}`,
      }),
    );
    if (!saved) throw new Error('The server answered with an unusable dial.');
    this.keep(saved);
    return saved;
  }

  private keep(dial: DifficultyDial): void {
    this.current.set(dial);
    writeCache(dial);
  }
}
