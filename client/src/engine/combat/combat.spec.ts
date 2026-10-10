import { Rng } from '../core/rng';
import { computeStats } from '../core/stats';
import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { STEP } from '../sim/run-simulation';
import { HitSource, NO_INPUT } from '../sim/types';
import { damagePlayer, hitEnemy, resolveHit } from './damage';
import { applyStatus } from './status';

const source = (overrides: Partial<HitSource> = {}): HitSource => ({
  weaponId: 'test',
  element: 'lightning',
  damage: 10,
  critChance: 0,
  knockback: 0,
  effects: [],
  lifesteal: 0,
  ownerId: 0,
  ...overrides,
});

/** An Rng whose next roll is fixed (crit rolls compare `next() < chance`). */
function fixedRng(value: number): Rng {
  const rng = new Rng(1);
  rng.next = () => value;
  return rng;
}

describe('resolveHit (one damage pipeline)', () => {
  const stats = computeStats(
    { might: 1.2, lightningDamage: 1.5, critChance: 0, critMultiplier: 2 },
    [],
  );

  it('applies might and the element bonus', () => {
    const hit = resolveHit(source(), stats, 1, fixedRng(0.99));
    expect(hit.crit).toBe(false);
    expect(hit.amount).toBeCloseTo(18);
  });

  it('applies the critical multiplier on a critical hit', () => {
    const hit = resolveHit(source({ critChance: 0.5 }), stats, 1, fixedRng(0.1));
    expect(hit.crit).toBe(true);
    expect(hit.amount).toBeCloseTo(36);
  });

  it('applies the target’s damage-taken multiplier (shock)', () => {
    expect(resolveHit(source(), stats, 1.25, fixedRng(0.99)).amount).toBeCloseTo(22.5);
  });
});

describe('hits on enemies', () => {
  it('counts an enemy killed by two hits in the same step once', () => {
    const sim = quietSim();
    disarm(sim);
    const enemy = spawnNear(sim, 'satyr', 100, 0);
    enemy.health = 5;
    const player = sim.state.players[0];
    hitEnemy(sim.state, enemy, source({ ownerId: player.id }), player.x, player.y);
    hitEnemy(sim.state, enemy, source({ ownerId: player.id }), player.x, player.y);
    expect(sim.state.kills).toBe(1);
    expect(sim.state.pickups.filter((p) => p.kind === 'xp')).toHaveLength(1);
    expect(sim.events().filter((e) => e.type === 'kill')).toHaveLength(1);
  });

  it('burn deals its full damage over its duration', () => {
    const sim = quietSim();
    disarm(sim);
    const enemy = spawnNear(sim, 'marble_sentinel', 300, 0);
    enemy.health = enemy.maxHealth = 1000;
    applyStatus(enemy, { effect: 'burn', chance: 1, duration: 3, potency: 0.4 }, 10);
    for (let i = 0; i < 4 / STEP; i++) sim.step(STEP, [NO_INPUT]);
    expect(1000 - enemy.health).toBeCloseTo(12);
  });

  it('stunned enemies neither move nor deal contact damage', () => {
    const sim = quietSim();
    disarm(sim);
    const player = sim.state.players[0];
    player.invulnerable = 0;
    const enemy = spawnNear(sim, 'satyr', 20, 0);
    enemy.attackTimer = 0;
    applyStatus(enemy, { effect: 'stun', chance: 1, duration: 1, potency: 0 }, 0);
    const start = { x: enemy.x, y: enemy.y };
    for (let i = 0; i < 0.9 / STEP; i++) sim.step(STEP, [NO_INPUT]);
    expect(player.health).toBe(player.stats.maxHealth);
    expect(Math.hypot(enemy.x - start.x, enemy.y - start.y)).toBeLessThan(15);
  });

  it('knocks enemies back away from the hit, less for resistant ones', () => {
    const sim = quietSim();
    disarm(sim);
    const player = sim.state.players[0];
    const light = spawnNear(sim, 'satyr', 100, 0);
    const heavy = spawnNear(sim, 'marble_sentinel', -100, 0);
    hitEnemy(sim.state, light, source({ knockback: 300, ownerId: player.id }), player.x, player.y);
    hitEnemy(sim.state, heavy, source({ knockback: 300, ownerId: player.id }), player.x, player.y);
    expect(light.vx).toBeGreaterThan(250);
    expect(heavy.vx).toBeGreaterThan(-20);
  });

  it('heals the attacker through lifesteal, never above maximum health', () => {
    const sim = quietSim();
    const player = sim.state.players[0];
    player.health = 50;
    const enemy = spawnNear(sim, 'marble_sentinel', 100, 0);
    hitEnemy(
      sim.state,
      enemy,
      source({ damage: 100, lifesteal: 0.1, ownerId: player.id }),
      player.x,
      player.y,
    );
    expect(player.health).toBeGreaterThan(50);
    hitEnemy(
      sim.state,
      enemy,
      source({ damage: 10000, lifesteal: 1, ownerId: player.id }),
      player.x,
      player.y,
    );
    expect(player.health).toBe(player.stats.maxHealth);
  });
});

describe('player damage', () => {
  it('subtracts armour, at least 1 damage', () => {
    const sim = quietSim({ modifiers: [{ stat: 'armor', flat: 3 }] });
    const player = sim.state.players[0];
    player.invulnerable = 0;
    damagePlayer(sim.state, player, 8);
    expect(player.stats.maxHealth - player.health).toBe(5);
    player.invulnerable = 0;
    damagePlayer(sim.state, player, 2);
    expect(player.stats.maxHealth - player.health).toBe(6);
  });

  it('revives once with Phoenix Feather, then dies', () => {
    const sim = quietSim();
    const player = sim.state.players[0];
    player.loadout.relics.push(sim.state.index.relics.get('phoenix_feather') as never);
    sim.state.players[0].stats = computeStats(sim.state.god.baseStats, [
      { stat: 'revivals', flat: 1 },
    ]);
    player.invulnerable = 0;
    damagePlayer(sim.state, player, 9999);
    expect(player.alive).toBe(true);
    expect(player.health).toBe(player.stats.maxHealth / 2);
    player.invulnerable = 0;
    damagePlayer(sim.state, player, 9999);
    expect(player.alive).toBe(false);
  });
});
