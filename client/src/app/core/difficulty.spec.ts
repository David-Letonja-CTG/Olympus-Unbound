import { TestBed } from '@angular/core/testing';
import { RunConfig } from '../../engine';
import { DEFAULT_DIAL, Difficulty, parseDial, withDial } from './difficulty';
import { GAME_SERVER_URL } from './game-server';

const run: RunConfig = {
  runId: 'r',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  modifiers: [],
};
const harder = { enemyHealth: 1.5, enemyDamage: 1.2, spawnRate: 1.1, realmGrowth: 1.3 };

describe('the difficulty dial (spec: difficulty-dial)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem('olympus-unbound/difficulty');
  });

  it('takes a dial only with every value within its limits', () => {
    expect(parseDial(harder)).toEqual(harder);
    expect(parseDial({ ...harder, enemyHealth: 50 })).toBeUndefined();
    expect(parseDial({ ...harder, realmGrowth: 'x' })).toBeUndefined();
    expect(parseDial(null)).toBeUndefined();
  });

  it('leaves a run alone at the default, and compounds with a run’s own rules', () => {
    expect(withDial(run, DEFAULT_DIAL)).toBe(run);
    const twist = { ...run, rules: { pace: 2, enemies: { health: 2, speed: 1.2 } } };
    const dialled = withDial(twist, harder);
    expect(dialled.rules?.pace).toBe(2);
    expect(dialled.rules?.enemies).toEqual({
      health: 3,
      speed: 1.2,
      damage: 1.2,
      spawnRate: 1.1,
    });
    expect(dialled.rules?.realmGrowth).toBe(1.3);
  });

  it('reads the server’s dial, keeps it for offline play, and keeps the last one when unreachable', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: GAME_SERVER_URL, useValue: 'https://example.test' }],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(harder), { status: 200 })),
    );
    const difficulty = TestBed.inject(Difficulty);
    expect(difficulty.current()).toEqual(DEFAULT_DIAL);
    await difficulty.refresh();
    expect(difficulty.current()).toEqual(harder);
    expect(JSON.parse(localStorage.getItem('olympus-unbound/difficulty') ?? '')).toEqual(harder);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await difficulty.refresh();
    expect(difficulty.current()).toEqual(harder);
  });
});
