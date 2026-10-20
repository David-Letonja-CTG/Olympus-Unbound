import { CONTENT } from '../../content';
import { validateContent } from '../data/content-index';
import { GameContent, RunRules } from '../data/types';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT } from './types';

function sim(rules?: RunRules, content: GameContent = CONTENT) {
  const s = new RunSimulation(
    { runId: 'twist', godId: 'zeus', realmId: 'mount_olympus', seed: 9, modifiers: [], rules },
    content,
  );
  s.setView(720, 420);
  s.debug({ type: 'godMode', enabled: true });
  return s;
}

const run = (s: RunSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.step(STEP, [NO_INPUT]);
};

describe('twists (spec: daily-trial / twists)', () => {
  it('makes every enemy faster, tougher and harder-hitting by its multipliers', () => {
    const plain = sim();
    const twisted = sim({ enemies: { speed: 1.3, health: 1.6, damage: 1.2 } });
    run(plain, 5);
    run(twisted, 5);
    const a = plain.state.enemies[0];
    const b = twisted.state.enemies.find((e) => e.def.id === a.def.id) ?? twisted.state.enemies[0];
    expect(b.speed).toBeCloseTo(b.def.speed * 1.3);
    expect(b.maxHealth / a.maxHealth).toBeCloseTo(1.6, 1);
    expect(b.damage / a.damage).toBeCloseTo(1.2, 1);
  });

  it('brings more enemies with a higher spawn rate', () => {
    const plain = sim();
    const swarm = sim({ enemies: { spawnRate: 1.4 } });
    run(plain, 20);
    run(swarm, 20);
    expect(swarm.state.enemies.length).toBeGreaterThan(plain.state.enemies.length);
  });

  it("changes the gods' stats", () => {
    const glass = sim({
      modifiers: [
        { stat: 'might', flat: 0.5 },
        { stat: 'maxHealth', percent: -0.4 },
      ],
    });
    const plain = sim();
    expect(glass.state.players[0].stats.might).toBeCloseTo(
      plain.state.players[0].stats.might + 0.5,
    );
    expect(glass.state.players[0].stats.maxHealth).toBeLessThan(
      plain.state.players[0].stats.maxHealth,
    );
  });

  it('plays the same twice', () => {
    const rules: RunRules = { enemies: { speed: 1.3 }, modifiers: [{ stat: 'xpGain', flat: 0.3 }] };
    const a = sim(rules);
    const b = sim(rules);
    run(a, 30);
    run(b, 30);
    expect(a.resultFor(a.state.players[0].id)).toEqual(b.resultFor(b.state.players[0].id));
  });

  it('validates twists: known stats, positive multipliers, no pace', () => {
    expect(validateContent(CONTENT)).toEqual([]);
    const bad: GameContent = {
      ...CONTENT,
      twists: [
        {
          id: 'broken',
          name: 'Broken',
          description: '',
          rules: {
            modifiers: [{ stat: 'nonsense' as never, flat: 1 }],
            enemies: { speed: 0 },
            ...({ pace: 2 } as object),
          },
        },
      ],
    };
    const errors = validateContent(bad);
    expect(errors.some((e) => e.includes('unknown stat "nonsense"'))).toBe(true);
    expect(errors.some((e) => e.includes('non-positive enemy speed'))).toBe(true);
    expect(errors.some((e) => e.includes('must not change the pace'))).toBe(true);
  });
});
