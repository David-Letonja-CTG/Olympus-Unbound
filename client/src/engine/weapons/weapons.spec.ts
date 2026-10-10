import { computeStats } from '../core/stats';
import { createWeapon } from '../progression/loadout';
import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';
import { resolveWeaponStats } from './resolve';

function arm(sim: RunSimulation, id: string, level = 1) {
  const player = sim.state.players[0];
  const weapon = createWeapon(sim.state.index.weapon(id), player.stats);
  weapon.level = level;
  const resolved = resolveWeaponStats(weapon.def, level, player.stats);
  weapon.stats = resolved.stats;
  weapon.effects = resolved.effects;
  weapon.timer = 0;
  player.loadout.weapons.push(weapon);
  return weapon;
}

const run = (sim: RunSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(STEP, [NO_INPUT]);
};

describe('resolveWeaponStats', () => {
  it('adds level deltas, then player stats', () => {
    const sim = quietSim();
    const def = sim.state.index.weapon('thunder_spear');
    const stats = computeStats({}, [
      { stat: 'projectiles', flat: 1 },
      { stat: 'cooldown', percent: -0.5 },
    ]);
    const level2 = resolveWeaponStats(def, 2, stats).stats;
    expect(level2.amount).toBe(def.base.amount + 1 + 1);
    expect(level2.cooldown).toBeCloseTo(def.base.cooldown * 0.5);
  });
});

describe('weapon behaviors', () => {
  it('a projectile weapon fires at the nearest enemy', () => {
    const sim = quietSim();
    disarm(sim);
    arm(sim, 'thunder_spear');
    const near = spawnNear(sim, 'marble_sentinel', 0, 200);
    spawnNear(sim, 'marble_sentinel', 400, 0);
    sim.step(STEP, [NO_INPUT]);
    const spear = sim.state.projectiles[0];
    expect(spear.vy).toBeGreaterThan(0);
    expect(Math.abs(spear.vx)).toBeLessThan(1);
    run(sim, 0.5);
    expect(near.health).toBeLessThan(near.maxHealth);
  });

  it('fires in the facing direction when no enemy is in range', () => {
    const sim = quietSim();
    disarm(sim);
    arm(sim, 'thunder_spear');
    sim.state.players[0].facingX = -1;
    sim.state.players[0].facingY = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.projectiles[0].vx).toBeLessThan(0);
  });

  it('a projectile with pierce 1 damages two enemies in a line, then disappears', () => {
    const sim = quietSim();
    disarm(sim);
    const spear = arm(sim, 'thunder_spear');
    expect(spear.stats.pierce).toBe(1);
    const enemies = [120, 200, 280].map((dx) => spawnNear(sim, 'marble_sentinel', dx, 0));
    sim.step(STEP, [NO_INPUT]);
    spear.timer = 99;
    run(sim, 1);
    expect(enemies.map((e) => e.health < e.maxHealth)).toEqual([true, true, false]);
    expect(sim.state.projectiles).toHaveLength(0);
  });

  it('chain lightning jumps to the nearest enemies not yet hit', () => {
    const sim = quietSim();
    disarm(sim);
    const bolt = arm(sim, 'thunderbolt');
    const chain = [100, 220, 340, 460].map((dx) => spawnNear(sim, 'marble_sentinel', dx, 0));
    sim.step(STEP, [NO_INPUT]);
    // Base chains: 2 jumps after the first strike → three enemies hit.
    expect(bolt.stats.chains).toBe(2);
    expect(chain.map((e) => e.health < e.maxHealth)).toEqual([true, true, true, false]);
  });

  it('an orb hits the same enemy at most once per re-hit interval', () => {
    const sim = quietSim();
    disarm(sim);
    const orb = arm(sim, 'lightning_orb');
    const enemy = spawnNear(sim, 'marble_sentinel', orb.stats.range, 0);
    enemy.health = enemy.maxHealth = 100000;
    enemy.speed = 0;
    // A large, slow orb overlaps the enemy for a long stretch of each lap.
    orb.stats = { ...orb.stats, size: 60, speed: 0.5 };
    const hitTimes: number[] = [];
    for (let i = 0; i < 4 / STEP; i++) {
      sim.step(STEP, [NO_INPUT]);
      for (const e of sim.events())
        if (e.type === 'hit' && e.enemyId === enemy.id) hitTimes.push(sim.state.time);
    }
    expect(hitTimes.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < hitTimes.length; i++)
      expect(hitTimes[i] - hitTimes[i - 1]).toBeGreaterThanOrEqual(orb.stats.cooldown - 1e-6);
  });

  it('a nova only fires with an enemy in reach and pushes enemies away', () => {
    const sim = quietSim();
    disarm(sim);
    const hammer = arm(sim, 'war_hammer');
    sim.step(STEP, [NO_INPUT]);
    expect(hammer.timer).toBeLessThan(0.5);
    const enemy = spawnNear(sim, 'satyr', 60, 0);
    enemy.health = enemy.maxHealth = 1000;
    // The weapon retries 0.1 s after finding nothing.
    run(sim, 0.15);
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
    expect(enemy.x - sim.state.players[0].x).toBeGreaterThan(60);
    expect(hammer.timer).toBeGreaterThan(1);
  });

  it('a sweep only hits enemies inside its arc', () => {
    const sim = quietSim();
    disarm(sim);
    arm(sim, 'flaming_sword');
    const front = spawnNear(sim, 'marble_sentinel', 80, 0);
    const behind = spawnNear(sim, 'marble_sentinel', -90, 0);
    sim.step(STEP, [NO_INPUT]);
    expect(front.health).toBeLessThan(front.maxHealth);
    expect(behind.health).toBe(behind.maxHealth);
    expect(front.status.burn).toBeGreaterThan(0);
  });

  it('the god ability strikes nearby enemies and goes on cooldown', () => {
    const sim = quietSim();
    disarm(sim);
    const targets = [80, -80, 160].map((dx) => spawnNear(sim, 'marble_sentinel', dx, 30));
    sim.step(STEP, [{ ...NO_INPUT, ability: true }]);
    const player = sim.state.players[0];
    expect(targets.every((e) => e.health < e.maxHealth)).toBe(true);
    expect(player.abilityTimer).toBeGreaterThan(20);
    const before = targets.map((e) => e.health);
    sim.step(STEP, [{ ...NO_INPUT, ability: true }]);
    expect(targets.map((e) => e.health)).toEqual(before);
  });
});
