import { modeOf } from '../../core/save/glory';
import { RunRecord } from '../../core/save/save-records';

/** Statistics over the run history (spec: run-statistics / statistics). Pure, so it is tested without a screen. */
export interface RunStatistics {
  readonly totals: {
    readonly runs: number;
    readonly seconds: number;
    readonly kills: number;
    readonly realmsCleared: number;
    readonly solo: number;
    readonly coop: number;
    /** Solo runs with bot allies (spec: bot-allies). */
    readonly allies: number;
  };
  readonly gods: readonly {
    readonly godId: string;
    readonly runs: number;
    readonly avgRealms: number;
    readonly bestRealms: number;
    readonly avgSeconds: number;
    readonly avgKills: number;
    readonly avgLevel: number;
    readonly bestScore: number;
  }[];
  /** Where runs ended: realm → runs, most first. */
  readonly endings: readonly { readonly realmId: string; readonly runs: number }[];
  readonly weapons: readonly {
    readonly id: string;
    /** Share of runs with it in the final build. */
    readonly pickRate: number;
    readonly avgLevel: number;
    /** Share of all weapon damage in the history. */
    readonly damageShare: number;
  }[];
}

const average = (values: readonly number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

export function runStatistics(history: readonly RunRecord[]): RunStatistics {
  const sum = (pick: (r: RunRecord) => number) => history.reduce((s, r) => s + pick(r), 0);

  const byGod = new Map<string, RunRecord[]>();
  for (const r of history) byGod.set(r.godId, [...(byGod.get(r.godId) ?? []), r]);
  const gods = [...byGod].map(([godId, runs]) => ({
    godId,
    runs: runs.length,
    avgRealms: average(runs.map((r) => r.realmsCleared)),
    bestRealms: Math.max(...runs.map((r) => r.realmsCleared)),
    avgSeconds: average(runs.map((r) => r.timeSeconds)),
    avgKills: average(runs.map((r) => r.kills)),
    avgLevel: average(runs.map((r) => r.level)),
    bestScore: Math.max(...runs.map((r) => r.score)),
  }));

  const endings = new Map<string, number>();
  for (const r of history) endings.set(r.realmReached, (endings.get(r.realmReached) ?? 0) + 1);

  const weaponLevels = new Map<string, number[]>();
  const weaponDamage = new Map<string, number>();
  for (const r of history)
    for (const w of r.weapons) {
      weaponLevels.set(w.id, [...(weaponLevels.get(w.id) ?? []), w.level]);
      weaponDamage.set(w.id, (weaponDamage.get(w.id) ?? 0) + w.damage);
    }
  const allDamage = [...weaponDamage.values()].reduce((s, d) => s + d, 0) || 1;

  return {
    totals: {
      runs: history.length,
      seconds: sum((r) => r.timeSeconds),
      kills: sum((r) => r.kills),
      realmsCleared: sum((r) => r.realmsCleared),
      solo: history.filter((r) => modeOf(r.players, r.bots) === 'solo').length,
      coop: history.filter((r) => modeOf(r.players, r.bots) === 'coop').length,
      allies: history.filter((r) => modeOf(r.players, r.bots) === 'allies').length,
    },
    gods: gods.sort((a, b) => b.runs - a.runs),
    endings: [...endings]
      .map(([realmId, runs]) => ({ realmId, runs }))
      .sort((a, b) => b.runs - a.runs),
    weapons: [...weaponLevels]
      .map(([id, levels]) => ({
        id,
        pickRate: levels.length / Math.max(1, history.length),
        avgLevel: average(levels),
        damageShare: (weaponDamage.get(id) ?? 0) / allDamage,
      }))
      .sort((a, b) => b.damageShare - a.damageShare),
  };
}

const CSV_COLUMNS = [
  'endedAt',
  'godId',
  'realmId',
  'realmReached',
  'players',
  'bots',
  'outcome',
  'seed',
  'timeSeconds',
  'level',
  'kills',
  'gold',
  'realmsCleared',
  'score',
  'weapons',
  'relics',
  'synergies',
] as const;

/** One row per run (spec: run-statistics / exports); lists are `|`-joined, weapons as `id:level:damage`. */
export function historyCsv(history: readonly RunRecord[]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = history.map((r) =>
    CSV_COLUMNS.map((c) => {
      switch (c) {
        case 'weapons':
          return cell(r.weapons.map((w) => `${w.id}:${w.level}:${w.damage}`).join('|'));
        case 'relics':
        case 'synergies':
          return cell(r[c].join('|'));
        default:
          return cell(r[c]);
      }
    }).join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

export function historyJson(history: readonly RunRecord[]): string {
  return JSON.stringify(history, null, 2);
}
