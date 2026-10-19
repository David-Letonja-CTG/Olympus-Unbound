import { GameContent, RunResult } from '../../../engine';
import { applyGlory, GloryOutcome, NO_GLORY } from './glory';
import { REMEMBERED_RUNS, SaveData } from './save-data';

export interface DiscoveredItem {
  readonly kind: 'weapons' | 'armour' | 'relics';
  readonly id: string;
}

export interface RunRewards {
  /** Gold kept from the run (half when abandoned). */
  readonly runGold: number;
  /** The run's gold plus achievements' and quests' gold. */
  readonly totalGold: number;
  /** Score, high score, achievements and quests (spec: run-outcome / glory in the run summary). */
  readonly glory: GloryOutcome;
  readonly newlyDiscovered: readonly DiscoveredItem[];
  readonly newBestTime: boolean;
  /** True when this run had already been rewarded; nothing was granted again. */
  readonly alreadyProcessed: boolean;
}

/**
 * Applies the reward rules to a save (spec: run-outcome / rewards): all collected gold (bosses' gold included),
 * half of it (rounded down) when abandoned; held items become discovered; statistics update, counting realms cleared
 * (`victories` keeps its save key: a victory of the 7-minute runs was one realm cleared), and the run's glory is
 * applied (spec: glory). Pure and idempotent per run ID; `now` is when the run ended.
 */
export function applyRunResult(
  save: SaveData,
  result: RunResult,
  content: GameContent,
  now: Date,
): { save: SaveData; rewards: RunRewards } {
  if (save.processedRunIds.includes(result.runId)) {
    return {
      save,
      rewards: {
        runGold: 0,
        totalGold: 0,
        glory: NO_GLORY,
        newlyDiscovered: [],
        newBestTime: false,
        alreadyProcessed: true,
      },
    };
  }
  const runGold = result.outcome === 'abandoned' ? Math.floor(result.gold / 2) : result.gold;

  const held: DiscoveredItem[] = [
    ...result.loadout.weapons.map((w) => ({ kind: 'weapons' as const, id: w.id })),
    ...(result.loadout.armour ? [{ kind: 'armour' as const, id: result.loadout.armour.id }] : []),
    ...result.loadout.relics.map((id) => ({ kind: 'relics' as const, id })),
  ];
  const newlyDiscovered = held.filter((item) => !save.discovered[item.kind].includes(item.id));
  const discovered = { ...save.discovered };
  for (const item of newlyDiscovered) discovered[item.kind] = [...discovered[item.kind], item.id];

  const newBestTime = result.timeSeconds > save.stats.bestTimeSeconds;
  const withGlory = applyGlory(save, result, content, now);
  return {
    save: {
      ...withGlory.save,
      gold: withGlory.save.gold + runGold,
      discovered,
      stats: {
        runs: save.stats.runs + 1,
        victories: save.stats.victories + result.realmsCleared,
        kills: save.stats.kills + result.kills,
        bestTimeSeconds: Math.max(save.stats.bestTimeSeconds, result.timeSeconds),
      },
      processedRunIds: [...save.processedRunIds, result.runId].slice(-REMEMBERED_RUNS),
    },
    rewards: {
      runGold,
      totalGold: runGold + withGlory.glory.gold,
      glory: withGlory.glory,
      newlyDiscovered,
      newBestTime,
      alreadyProcessed: false,
    },
  };
}
