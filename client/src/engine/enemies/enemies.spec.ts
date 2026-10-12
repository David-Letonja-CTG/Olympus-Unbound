import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';

const run = (sim: RunSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(STEP, [NO_INPUT]);
};

describe('enemy behaviors', () => {
  it('chasers walk toward the player', () => {
    const sim = quietSim();
    disarm(sim);
    const satyr = spawnNear(sim, 'satyr', 400, 0);
    run(sim, 1);
    expect(satyr.x - sim.state.players[0].x).toBeLessThan(340);
  });

  it('a ranged attacker backs off when too close and shoots on its cooldown', () => {
    const sim = quietSim();
    disarm(sim);
    const archer = spawnNear(sim, 'centaur_archer', 120, 0);
    archer.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles).toHaveLength(1);
    run(sim, 1);
    expect(archer.x - sim.state.players[0].x).toBeGreaterThan(150);
  });

  it("fires the enemy's own projectile: a lampad's soul-fire (spec: realm-underworld)", () => {
    const sim = quietSim();
    disarm(sim);
    const lampad = spawnNear(sim, 'lampad', 200, 0);
    lampad.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles.map((p) => p.sprite)).toEqual(['soul_fire']);
    const archer = spawnNear(sim, 'centaur_archer', 200, 60);
    archer.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles.map((p) => p.sprite)).toContain('enemy_arrow');
    const naiad = spawnNear(sim, 'naiad', -200, 0);
    naiad.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles.map((p) => p.sprite)).toContain('venom_spit');
  });

  it('a charger stops and telegraphs, then dashes in a straight line', () => {
    const sim = quietSim();
    disarm(sim);
    const charger = spawnNear(sim, 'minotaur', 300, 0);
    charger.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(charger.mode).toBe('windup');
    const windupX = charger.x;
    run(sim, 0.5);
    expect(charger.x).toBeCloseTo(windupX, 0);
    run(sim, 0.5);
    expect(charger.mode).toBe('dash');
    expect(windupX - charger.x).toBeGreaterThan(40);
  });

  it('a summoner calls its minions', () => {
    const sim = quietSim();
    disarm(sim);
    const oracle = spawnNear(sim, 'fallen_oracle', 300, 0);
    oracle.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.enemies.filter((e) => e.def.id === 'stymphalian_bird')).toHaveLength(4);
  });

  it('contact damage repeats only after the attack interval', () => {
    const sim = quietSim();
    disarm(sim);
    const player = sim.state.players[0];
    player.invulnerable = 0;
    const satyr = spawnNear(sim, 'satyr', 10, 0);
    satyr.attackTimer = 0;
    satyr.speed = 0;
    sim.step(STEP, [NO_INPUT]);
    const afterFirst = player.health;
    expect(afterFirst).toBeLessThan(player.stats.maxHealth);
    run(sim, 0.5);
    expect(player.health).toBe(afterFirst);
  });
});
