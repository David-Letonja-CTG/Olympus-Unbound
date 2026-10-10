import { killEnemy } from '../combat/damage';
import { CONTENT } from '../testing/content';
import { disarm, quietContent, quietSim } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';

const olympusSim = (seed = 1) =>
  new RunSimulation(
    { runId: 'spawn', godId: 'zeus', realmId: 'mount_olympus', seed, modifiers: [] },
    CONTENT,
  );

const run = (sim: RunSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(STEP, [NO_INPUT]);
};

describe('spawn director', () => {
  it('spawns only first-phase enemies early in the run', () => {
    const sim = olympusSim();
    sim.state.godMode = true;
    disarm(sim);
    run(sim, 20);
    const kinds = new Set(sim.state.enemies.map((e) => e.def.id));
    expect([...kinds]).toEqual(['satyr']);
  });

  it('spawns more, and more varied, enemies later in the run', () => {
    const early = olympusSim();
    early.state.godMode = true;
    disarm(early);
    run(early, 20);
    const late = olympusSim();
    late.state.godMode = true;
    disarm(late);
    late.debug({ type: 'skipTo', seconds: 230 });
    run(late, 20);
    expect(late.state.enemies.length).toBeGreaterThan(early.state.enemies.length * 2);
    expect(new Set(late.state.enemies.map((e) => e.def.id)).size).toBeGreaterThan(2);
  });

  it('spawns enemies outside the visible area and never inside obstacles', () => {
    const sim = olympusSim(3);
    sim.state.godMode = true;
    disarm(sim);
    const player = sim.state.players[0];
    const { halfWidth, halfHeight } = sim.state.view;
    const seen = new Set<number>();
    for (let i = 0; i < 20 / STEP; i++) {
      sim.step(STEP, [NO_INPUT]);
      for (const e of sim.state.enemies) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        const inside =
          Math.abs(e.x - player.x) < halfWidth && Math.abs(e.y - player.y) < halfHeight;
        expect(inside).toBe(false);
        expect(sim.state.collision.isBlocked(e.x, e.y, e.radius - 1)).toBe(false);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('only spawns from the open sides when the player stands in a corner', () => {
    const sim = olympusSim(4);
    sim.state.godMode = true;
    disarm(sim);
    const player = sim.state.players[0];
    const b = sim.arena.bounds;
    player.x = player.px = b.minX + 30;
    player.y = player.py = b.minY + 30;
    run(sim, 15);
    expect(sim.state.enemies.length).toBeGreaterThan(5);
    for (const e of sim.state.enemies) {
      expect(e.x >= b.minX && e.y >= b.minY).toBe(true);
    }
  });

  it('never exceeds the phase maximum of living regular enemies', () => {
    const content = quietContent({
      timeline: [{ from: 0, rate: 50, maxAlive: 12, enemies: [{ id: 'satyr', weight: 1 }] }],
    });
    const sim = quietSim({ content });
    sim.state.godMode = true;
    disarm(sim);
    run(sim, 5);
    expect(sim.state.enemies.length).toBe(12);
  });

  it('sends the first elite at 02:00 and announces it', () => {
    const sim = olympusSim();
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 119 });
    sim.events();
    run(sim, 1.5);
    const elite = sim.state.enemies.find((e) => e.elite);
    expect(elite?.def.id).toBe('corrupted_hoplite');
    expect(sim.events().some((e) => e.type === 'announcement' && e.kind === 'elite')).toBe(true);
  });

  it('an elite always drops a treasure chest', () => {
    const sim = quietSim();
    disarm(sim);
    const p = sim.state.players[0];
    const elite = sim.state.spawnEnemy(sim.state.index.enemy('satyr'), p.x + 300, p.y, {
      elite: true,
    });
    if (!elite) throw new Error('no elite');
    expect(elite.radius).toBeGreaterThan(sim.state.index.enemy('satyr').radius);
    killEnemy(sim.state, elite);
    expect(sim.state.pickups.some((pk) => pk.kind === 'chest')).toBe(true);
  });
});

describe('pickups', () => {
  it('merges XP beyond the pickup cap into existing gems without losing any', () => {
    const sim = quietSim();
    const cap = sim.state.balance.caps.pickups;
    for (let i = 0; i < cap + 50; i++)
      sim.state.spawnPickup('xp', 100 + (i % 50) * 10, 100 + Math.floor(i / 50) * 10, 1);
    expect(sim.state.pickups.length).toBe(cap);
    expect(sim.state.pickups.reduce((sum, p) => sum + p.value, 0)).toBe(cap + 50);
  });

  it('collects XP within the magnet radius', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    sim.state.spawnPickup('xp', p.x + p.stats.magnet - 5, p.y, 3);
    sim.state.spawnPickup('xp', p.x + 600, p.y, 3);
    run(sim, 1);
    expect(sim.state.xp).toBe(3);
    expect(sim.state.pickups).toHaveLength(1);
  });

  it('adds gold multiplied by gold gain', () => {
    const sim = quietSim({ modifiers: [{ stat: 'goldGain', flat: 0.2 }] });
    const p = sim.state.players[0];
    sim.state.spawnPickup('gold', p.x + 5, p.y, 5);
    run(sim, 0.1);
    expect(sim.state.gold).toBeCloseTo(6);
  });
});
