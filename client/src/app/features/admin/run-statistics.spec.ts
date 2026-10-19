import { RunRecord } from '../../core/save/save-records';
import { historyCsv, historyJson, runStatistics } from './run-statistics';

const record = (overrides: Partial<RunRecord> = {}): RunRecord => ({
  runId: 'r',
  endedAt: '2026-10-19T10:00:00.000Z',
  godId: 'zeus',
  realmId: 'mount_olympus',
  realmReached: 'mount_olympus',
  players: 1,
  outcome: 'defeat',
  seed: 1,
  timeSeconds: 300,
  level: 10,
  kills: 200,
  gold: 50,
  realmsCleared: 0,
  score: 900,
  weapons: [{ id: 'thunder_spear', level: 3, damage: 3000 }],
  relics: [],
  synergies: [],
  ...overrides,
});

describe('run statistics (spec: run-statistics / statistics)', () => {
  it('compares gods: three Zeus runs clearing 0, 1 and 2 realms', () => {
    const stats = runStatistics([
      record({ realmsCleared: 0 }),
      record({ realmsCleared: 1, realmReached: 'aegean_shore' }),
      record({ realmsCleared: 2, realmReached: 'labyrinth', players: 2 }),
      record({ godId: 'hades', weapons: [{ id: 'bident', level: 2, damage: 1000 }] }),
    ]);
    const zeus = stats.gods.find((g) => g.godId === 'zeus');
    expect(zeus).toMatchObject({ runs: 3, avgRealms: 1, bestRealms: 2 });
    expect(stats.totals).toMatchObject({ runs: 4, solo: 3, coop: 1, realmsCleared: 3 });
    expect(stats.endings[0]).toEqual({ realmId: 'mount_olympus', runs: 2 });
    const spear = stats.weapons.find((w) => w.id === 'thunder_spear');
    expect(spear?.pickRate).toBe(0.75);
    expect(spear?.damageShare).toBeCloseTo(0.9);
  });

  it('reports nothing for an empty history', () => {
    const stats = runStatistics([]);
    expect(stats.totals.runs).toBe(0);
    expect(stats.gods).toEqual([]);
  });
});

describe('exports (spec: run-statistics / exports)', () => {
  it('writes a CSV header and one row per run', () => {
    const history = Array.from({ length: 12 }, (_, i) => record({ runId: `r${i}` }));
    const lines = historyCsv(history).trim().split('\n');
    expect(lines).toHaveLength(13);
    expect(lines[0]).toContain('godId');
    expect(lines[1]).toContain('thunder_spear:3:3000');
  });

  it('writes the history as JSON', () => {
    const history = [record()];
    expect(JSON.parse(historyJson(history))).toEqual(history);
  });
});
