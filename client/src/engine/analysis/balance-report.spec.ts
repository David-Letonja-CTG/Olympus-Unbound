import { CONTENT } from '../testing/content';
import { BalanceReport } from './balance-report';

const options = { gods: ['zeus', 'hades'], runsPerGod: 2, minutes: 0.5, realmId: 'mount_olympus' };

function complete(report: BalanceReport): number {
  let slices = 0;
  while (report.advance(500)) slices++;
  return slices;
}

describe('balance report (spec: run-statistics / balance report)', () => {
  it('plays every god in slices and tabulates averages per god', () => {
    const report = new BalanceReport(CONTENT, options);
    expect(report.progress).toBe(0);
    const slices = complete(report);
    expect(slices).toBeGreaterThan(4);
    expect(report.done).toBe(true);
    expect(report.progress).toBe(1);
    const rows = report.rows();
    expect(rows.map((r) => r.godId)).toEqual(['zeus', 'hades']);
    for (const row of rows) {
      expect(row.runs).toBe(2);
      expect(row.timeSeconds).toBeCloseTo(30, 0);
      expect(row.kills).toBeGreaterThan(0);
      const share = row.weapons.reduce((s, w) => s + w.damageShare, 0);
      expect(share).toBeCloseTo(1, 5);
    }
    expect(rows[1].weapons.map((w) => w.id)).toContain('bident');
  });

  it('gives the same report for the same options', () => {
    const a = new BalanceReport(CONTENT, options);
    const b = new BalanceReport(CONTENT, options);
    complete(a);
    // Different slice sizes, same runs.
    while (b.advance(123));
    expect(b.rows()).toEqual(a.rows());
  });
});
