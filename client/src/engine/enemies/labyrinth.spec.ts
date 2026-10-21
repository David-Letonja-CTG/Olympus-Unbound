import { CONTENT } from '../testing/content';
import { disarm } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';

describe('the horde in the Labyrinth (spec: enemy-spawning / through the labyrinth)', () => {
  // Walking straight, 16 to 27 of these 75 stood stuck at walls; finding the way, at most 5.
  it.each([
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ])(
    'comes down the corridors to a god who waits at (%d, %d), not gathering at walls',
    (fx, fy) => {
      const sim = new RunSimulation(
        { runId: 'maze', godId: 'zeus', realmId: 'labyrinth_of_crete', seed: 4, modifiers: [] },
        CONTENT,
      );
      disarm(sim);
      sim.state.godMode = true;
      const p = sim.state.players[0];
      const b = sim.state.arena.bounds;
      p.x = p.px = b.minX + (b.maxX - b.minX) * fx;
      p.y = p.py = b.minY + (b.maxY - b.minY) * fy;
      sim.state.collision.resolve(p);
      for (let i = 0; i < 59 / STEP; i++) sim.step(STEP, [NO_INPUT]);
      const was = new Map(sim.state.enemies.map((e) => [e, { x: e.x, y: e.y }]));
      for (let i = 0; i < 1 / STEP; i++) sim.step(STEP, [NO_INPUT]);
      const alive = sim.state.enemies.filter((e) => !e.dead && !e.boss);
      // Stuck: still for a second while far from the god.
      const stuck = alive.filter((e) => {
        const w = was.get(e);
        return (
          !!w && Math.hypot(e.x - w.x, e.y - w.y) < 10 && Math.hypot(e.x - p.x, e.y - p.y) > 200
        );
      });
      expect(alive.length).toBeGreaterThan(50);
      expect(stuck.length).toBeLessThanOrEqual(alive.length * 0.1);
    },
  );
});
