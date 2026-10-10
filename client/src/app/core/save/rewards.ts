import { GameContent, RunResult } from '../../../engine';
import { REMEMBERED_RUNS, SaveData } from './save-data';

export interface DiscoveredItem {
  readonly kind: 'weapons' | 'armour' | 'relics';
  readonly id: string;
}

export interface RunRewards {
  /** Gold kept from the run (half when abandoned). */
  readonly runGold: number;
  readonly victoryBonus: number;
  readonly totalGold: number;
  readonly newlyDiscovered: readonly DiscoveredItem[];
  readonly newBestTime: boolean;
  /** True when this run had already been rewarded; nothing was granted again. */
  readonly alreadyProcessed: boolean;
}

/**
 * Applies the reward rules to a save (spec: run-outcome): all collected gold, plus the realm's victory bonus on
 * victory, half the gold (rounded down) when abandoned; held items become discovered; statistics update.
 * Pure and idempotent per run ID.
 */
export function applyRunResult(
  save: SaveData,
  result: RunResult,
  content: GameContent,
): { save: SaveData; rewards: RunRewards } {
  if (save.processedRunIds.includes(result.runId)) {
    return {
      save,
      rewards: {
        runGold: 0,
        victoryBonus: 0,
        totalGold: 0,
        newlyDiscovered: [],
        newBestTime: false,
        alreadyProcessed: true,
      },
    };
  }
  const realm = content.realms.find((r) => r.id === result.realmId);
  const runGold = result.outcome === 'abandoned' ? Math.floor(result.gold / 2) : result.gold;
  const victoryBonus = result.outcome === 'victory' ? (realm?.rewards.victoryGold ?? 0) : 0;

  const held: DiscoveredItem[] = [
    ...result.loadout.weapons.map((w) => ({ kind: 'weapons' as const, id: w.id })),
    ...(result.loadout.armour ? [{ kind: 'armour' as const, id: result.loadout.armour.id }] : []),
    ...result.loadout.relics.map((id) => ({ kind: 'relics' as const, id })),
  ];
  const newlyDiscovered = held.filter((item) => !save.discovered[item.kind].includes(item.id));
  const discovered = { ...save.discovered };
  for (const item of newlyDiscovered) discovered[item.kind] = [...discovered[item.kind], item.id];

  const newBestTime = result.timeSeconds > save.stats.bestTimeSeconds;
  return {
    save: {
      ...save,
      gold: save.gold + runGold + victoryBonus,
      discovered,
      stats: {
        runs: save.stats.runs + 1,
        victories: save.stats.victories + (result.outcome === 'victory' ? 1 : 0),
        kills: save.stats.kills + result.kills,
        bestTimeSeconds: Math.max(save.stats.bestTimeSeconds, result.timeSeconds),
      },
      processedRunIds: [...save.processedRunIds, result.runId].slice(-REMEMBERED_RUNS),
    },
    rewards: {
      runGold,
      victoryBonus,
      totalGold: runGold + victoryBonus,
      newlyDiscovered,
      newBestTime,
      alreadyProcessed: false,
    },
  };
}
