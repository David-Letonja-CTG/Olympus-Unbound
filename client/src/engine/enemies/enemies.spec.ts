import { WorldCollision } from '../core/collision';
import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';
import { NavField } from './navigation';

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
    const siren = spawnNear(sim, 'siren', 0, 200);
    siren.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles.map((p) => p.sprite)).toContain('siren_song');
    const priestess = spawnNear(sim, 'snake_priestess', 0, -200);
    priestess.actionTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hostileProjectiles.map((p) => p.sprite)).toContain('serpent_hex');
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

/** Stands a closed wall of blocks `dx` from the god, from `dy0` to `dy1` (spec: enemy-spawning / finding the way). */
function wallNear(sim: RunSimulation, dx: number, dy0: number, dy1: number): void {
  const p = sim.state.players[0];
  const blocks = [];
  for (let dy = dy0; dy <= dy1; dy += 40) blocks.push({ x: p.x + dx, y: p.y + dy, radius: 24 });
  sim.state.collision = new WorldCollision(sim.state.arena.bounds, blocks);
  sim.state.nav = new NavField(sim.state.collision);
}

describe('finding the way (spec: enemy-spawning / finding the way)', () => {
  it('a chaser walks round the end of a wall to the god', () => {
    const sim = quietSim();
    disarm(sim);
    wallNear(sim, 150, -300, 300);
    const satyr = spawnNear(sim, 'satyr', 400, 0);
    const p = sim.state.players[0];
    run(sim, 12);
    expect(Math.hypot(satyr.x - p.x, satyr.y - p.y)).toBeLessThan(60);
  });

  it('a charger does not charge at a god behind a wall', () => {
    const sim = quietSim();
    disarm(sim);
    wallNear(sim, 150, -300, 300);
    const charger = spawnNear(sim, 'minotaur', 300, 0);
    charger.actionTimer = 0;
    run(sim, 0.5);
    expect(charger.mode).toBe('move');
  });

  it('a chaser in the open walks straight at the god', () => {
    const sim = quietSim();
    disarm(sim);
    const satyr = spawnNear(sim, 'satyr', 400, 300);
    const p = sim.state.players[0];
    const before = Math.atan2(satyr.y - p.y, satyr.x - p.x);
    run(sim, 1);
    expect(Math.atan2(satyr.y - p.y, satyr.x - p.x)).toBeCloseTo(before, 1);
  });
});

describe('turning (spec: enemy-spawning / finding the way)', () => {
  it('a chaser whose god passes it turns round over about a quarter second, not in one step', () => {
    const sim = quietSim();
    disarm(sim);
    const p = sim.state.players[0];
    const satyr = spawnNear(sim, 'corrupted_hoplite', 400, 0);
    run(sim, 0.5);
    expect(satyr.headX).toBeCloseTo(-1, 2);
    // The god is now on the other side.
    p.x = p.px = satyr.x + 200;
    p.y = p.py = satyr.y;
    sim.step(STEP, [NO_INPUT]);
    expect(satyr.headX).toBeLessThan(-0.9);
    run(sim, 0.1);
    expect(satyr.headX).toBeLessThan(0.5);
    run(sim, 0.25);
    expect(satyr.headX).toBeCloseTo(1, 2);
  });

  it('a charger dashes along its line from the first step', () => {
    const sim = quietSim();
    disarm(sim);
    const charger = spawnNear(sim, 'minotaur', 300, 0);
    charger.actionTimer = 0;
    run(sim, 1);
    expect(charger.mode).toBe('dash');
    expect(charger.headX).toBeCloseTo(charger.dirX, 6);
    expect(charger.headY).toBeCloseTo(charger.dirY, 6);
  });
});
