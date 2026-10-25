import { CONTENT, disarm, quietContent, quietSim, spawnNear } from '../testing/fixtures';
import { FeatureRule } from '../data/types';
import { generateArena, MAX_FEATURES } from '../maps/generate-arena';
import { initFeatures } from './features';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT } from './types';

const visual = { sprite: 'lava_vent', color: 0xff7a2a };

/** A quiet run with one feature of `rule` at (dx, dy) from the god. */
function featureSim(rule: FeatureRule, dx = 0, dy = 0, angle = 0): RunSimulation {
  const quiet = quietContent();
  const realm = quiet.realms[0];
  const sim = quietSim({
    content: { ...quiet, realms: [{ ...realm, map: { ...realm.map, features: [rule] } }] },
  });
  disarm(sim);
  const s = sim.state;
  const p = s.players[0];
  s.arena = { ...s.arena, features: [{ id: 0, rule: 0, x: p.x + dx, y: p.y + dy, angle }] };
  initFeatures(s);
  return sim;
}

const run = (sim: RunSimulation, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) {
    while (sim.phase === 'choosing') sim.choose(0, sim.choiceFor(sim.state.players[0].id)?.id);
    sim.step(STEP, [NO_INPUT]);
  }
};

const VENT: FeatureRule = {
  type: 'vent',
  count: 1,
  radius: 64,
  damage: 20,
  monsters: 0.5,
  windup: 0.5,
  every: [1, 1],
  visual,
};

describe('map hazards (spec: arena-generation / map hazards)', () => {
  it('erupts a vent near a god: a telegraph, then damage to gods and monsters', () => {
    const sim = featureSim(VENT);
    const p = sim.state.players[0];
    const e = spawnNear(sim, 'satyr', 20, 0);
    e.speed = 0;
    run(sim, 1.05);
    expect(sim.state.hazards.some((h) => h.kind === 'vent' && !h.dead)).toBe(true);
    run(sim, 0.6);
    expect(p.health).toBeLessThan(p.stats.maxHealth);
    expect(e.dead || e.health <= e.maxHealth * 0.5 + 1e-6).toBe(true);
  });

  it('keeps a vent quiet when no god is near', () => {
    const sim = featureSim(VENT, 1000, 0);
    run(sim, 5);
    expect(sim.state.hazards.length).toBe(0);
  });

  it('fells a teetering column once, along its line', () => {
    const rule: FeatureRule = {
      type: 'teetering',
      kind: 'column',
      chance: 1,
      trigger: 120,
      length: 150,
      width: 44,
      damage: 22,
      monsters: 0.6,
      windup: 1,
      stump: 'broken_column',
      shaft: 'column_shaft',
    };
    const sim = featureSim(rule, 60, 0);
    run(sim, 0.1);
    expect(sim.state.features & 1).toBe(1);
    expect(sim.events().filter((e) => e.type === 'featureSprung')).toHaveLength(1);
    const line = sim.state.hazards.find((h) => h.kind === 'column')!;
    expect(line.x2 - line.x).toBeCloseTo(150, 5);
    run(sim, 3);
    expect(sim.state.hazards.filter((h) => !h.dead)).toHaveLength(0);
    expect(sim.events().some((e) => e.type === 'featureSprung')).toBe(false);
  });

  it('slams a crusher again and again', () => {
    const rule: FeatureRule = {
      type: 'crusher',
      count: 1,
      width: 46,
      damage: 24,
      monsters: 0.7,
      windup: 0.5,
      every: [1, 1],
      visual,
    };
    const sim = featureSim(rule, 200, 0, Math.PI / 2);
    let slams = 0;
    for (let i = 0; i < 6 * 60; i++) {
      sim.step(STEP, [NO_INPUT]);
      slams += sim.events().filter((e) => e.type === 'hazardResolved').length;
    }
    expect(slams).toBeGreaterThanOrEqual(3);
  });
});

describe('map helpers (spec: arena-generation / map helpers)', () => {
  it('heals a god in a spring until it runs dry, then refills it', () => {
    const rule: FeatureRule = {
      type: 'spring',
      count: 1,
      radius: 44,
      heal: 30,
      pool: 40,
      refill: 2,
      visual,
    };
    const sim = featureSim(rule);
    const p = sim.state.players[0];
    p.health = 20;
    run(sim, 1);
    expect(p.health).toBeGreaterThan(45);
    run(sim, 1);
    expect(sim.state.features & 1).toBe(1);
    const dry = p.health;
    run(sim, 1);
    expect(p.health).toBeLessThan(dry + 5);
    run(sim, 1.5);
    expect(sim.state.features & 1).toBe(0);
  });

  it('lights a brazier at a touch, for good, and burns the monsters round it', () => {
    const rule: FeatureRule = {
      type: 'brazier',
      count: 1,
      radius: 130,
      burn: 0.08,
      every: 1,
      visual,
      lit: visual,
      light: { radius: 200, color: 0xff9a40, intensity: 1 },
    };
    const sim = featureSim(rule, 10, 0);
    const e = spawnNear(sim, 'satyr', 80, 40);
    e.speed = 0;
    run(sim, 0.1);
    expect(sim.state.features & 1).toBe(1);
    run(sim, 1.2);
    expect(e.status.burn).toBeGreaterThan(0);
    expect(sim.state.features & 1).toBe(1);
  });
});

describe('features in the realms (spec: arena-generation / map hazards, map helpers)', () => {
  it('gives every realm its features, deterministically and within the cap', () => {
    for (const realm of CONTENT.realms) {
      for (let seed = 0; seed < 4; seed++) {
        const arena = generateArena(realm.map, seed);
        const where = realm.id + ' seed ' + seed;
        expect(arena.features.length, where).toBeGreaterThan(0);
        expect(arena.features.length, where).toBeLessThanOrEqual(MAX_FEATURES);
        expect(generateArena(realm.map, seed).features).toEqual(arena.features);
        for (const f of arena.features) {
          const rule = realm.map.features![f.rule];
          if (rule.type === 'teetering')
            expect(
              arena.obstacles.some((o) => o.x === f.x && o.y === f.y && o.kind === rule.kind),
            ).toBe(true);
        }
      }
    }
  });
});
