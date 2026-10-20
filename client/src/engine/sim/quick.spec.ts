import { CONTENT } from '../../content';
import { quietContent } from '../testing/fixtures';
import { RunSimulation, STEP } from './run-simulation';
import { RunConfig } from './run-state';
import { NO_INPUT, PlayerInput } from './types';

/** A quick run (spec: quick-runs): the realm clock twice as fast, double experience. */
const QUICK: Pick<RunConfig, 'rules' | 'variant'> = {
  rules: { pace: 2, modifiers: [{ stat: 'xpGain', flat: 1 }] },
  variant: { kind: 'quick' },
};

function sim(quick: boolean, content = quietContent(), seed = 5) {
  const s = new RunSimulation(
    {
      runId: 'quick',
      godId: 'zeus',
      realmId: 'mount_olympus',
      seed,
      modifiers: [],
      ...(quick ? QUICK : {}),
    },
    content,
  );
  s.setView(720, 420);
  s.debug({ type: 'godMode', enabled: true });
  return s;
}

/** Steps until `until` holds or `seconds` of run time pass; returns the run time it took. */
function stepUntil(
  s: RunSimulation,
  seconds: number,
  until: () => boolean,
  input: PlayerInput = NO_INPUT,
) {
  for (let i = 0; i < Math.round(seconds / STEP) && !until(); i++) s.step(STEP, [input]);
  return s.state.time;
}

describe('quick runs (spec: quick-runs / quick pace)', () => {
  it('brings the boss at half the time: 3:30 instead of 7:00', () => {
    const at = 420;
    const quick = sim(
      true,
      quietContent({ boss: { id: 'cyclops', at, spawnRateMultiplier: 0.45 } }),
    );
    const time = stepUntil(quick, at, () => !!quick.state.boss);
    expect(quick.state.boss).toBeTruthy();
    expect(time).toBeCloseTo(at / 2, 0);
    expect(quick.state.realmTime).toBeCloseTo(at, 0);
  });

  it('keeps a full run at its own pace', () => {
    const at = 420;
    const full = sim(
      false,
      quietContent({ boss: { id: 'cyclops', at, spawnRateMultiplier: 0.45 } }),
    );
    stepUntil(full, at / 2 + 1, () => !!full.state.boss);
    expect(full.state.boss).toBeFalsy();
  });

  it("brings the merchant on the realm's clock", () => {
    const first = CONTENT.balance.merchant.arrivals[0];
    const quick = sim(true);
    const time = stepUntil(quick, first, () => !!quick.state.merchant);
    expect(quick.state.merchant).toBeTruthy();
    expect(time).toBeCloseTo(first / 2, 0);
  });

  it('gives every god double experience', () => {
    expect(sim(true).state.players[0].stats.xpGain).toBeCloseTo(
      sim(false).state.players[0].stats.xpGain + 1,
    );
  });

  it('plays the same twice, and its result says it was quick', () => {
    const content = CONTENT;
    const a = sim(true, content, 77);
    const b = sim(true, content, 77);
    const input: PlayerInput = { moveX: 1, moveY: 0.3, ability: true, sprint: false, dash: false };
    stepUntil(a, 40, () => false, input);
    stepUntil(b, 40, () => false, input);
    const ra = a.resultFor(a.state.players[0].id);
    expect(ra).toEqual(b.resultFor(b.state.players[0].id));
    expect(ra.kills).toBeGreaterThan(0);
    expect(ra.variant).toEqual({ kind: 'quick' });
  });

  it('moves the debug clock by run time', () => {
    const quick = sim(true);
    quick.debug({ type: 'skipTo', seconds: 200 });
    expect(quick.state.realmTime).toBe(200);
    expect(quick.state.time).toBeCloseTo(100);
  });
});
