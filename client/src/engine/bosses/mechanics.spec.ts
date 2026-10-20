import { hitEnemy } from '../combat/damage';
import { damageTakenMultiplier } from '../combat/status';
import { ContentIndex } from '../data/content-index';
import { decodeSnapshot, encodeSnapshot } from '../net/snapshot';
import { CONTENT } from '../testing/content';
import { disarm, quietContent, quietSim } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { Enemy, HitSource, NO_INPUT, PlayerInput } from '../sim/types';
import { pauseOf, spawnBoss } from './boss';

const run = (sim: RunSimulation, seconds: number, input: PlayerInput = NO_INPUT) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(STEP, [input]);
};

/** A quiet realm whose boss is `bossId`, spawned now, a little away from the god. */
function withBoss(bossId: string) {
  const base = quietContent();
  const realm = base.realms[0];
  const content = { ...base, realms: [{ ...realm, boss: { ...realm.boss, id: bossId } }] };
  const sim = quietSim({ content });
  disarm(sim);
  sim.state.godMode = false;
  const boss = spawnBoss(sim.state) as Enemy;
  const p = sim.state.players[0];
  boss.x = boss.px = p.x + 260;
  boss.y = boss.py = p.y;
  return { sim, boss, p };
}

const parts = (sim: RunSimulation) => sim.state.enemies.filter((e) => e.part && !e.dead);
const source = (ownerId: number): HitSource => ({
  weaponId: 'test',
  element: 'physical',
  damage: 100,
  critChance: 0,
  knockback: 0,
  effects: [],
  lifesteal: 0,
  ownerId,
});

describe('the Cyclops (spec: boss-encounter / the cyclops rages)', () => {
  it('sweeps in cones, and rages red below half health with shorter pauses and three sweeps', () => {
    const { sim, boss } = withBoss('cyclops');
    boss.boss!.attackTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hazards.filter((h) => h.shape === 'cone')).toHaveLength(2);
    const calm = pauseOf(boss.boss!);
    boss.health = boss.maxHealth * 0.45;
    run(sim, 3);
    expect(boss.boss!.enraged).toBe(true);
    expect(pauseOf(boss.boss!)).toBeLessThan(calm);
    sim.state.hazards.length = 0;
    boss.boss!.current = undefined;
    boss.boss!.dash = undefined;
    boss.boss!.attackIndex = 0;
    boss.boss!.attackTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hazards.filter((h) => h.shape === 'cone')).toHaveLength(3);
  });
});

describe('Cerberus (spec: boss-encounter / cerberus three heads)', () => {
  it('attacks with three heads on their own rhythms: fire cones, lashes and soul-fire', () => {
    const { sim, boss } = withBoss('cerberus');
    sim.state.godMode = true;
    boss.boss!.attackTimer = 99;
    const kinds = new Set<string>();
    for (let i = 0; i < 6 * 60; i++) {
      sim.step(STEP, [NO_INPUT]);
      for (const h of sim.state.hazards) kinds.add(`${h.kind}:${h.shape}`);
    }
    expect(kinds).toEqual(
      new Set(['hellfire_breath:cone', 'lunging_bite:line', 'soul_fire:circle']),
    );
    expect(parts(sim)).toHaveLength(0);
  });
});

describe('the Hydra (spec: boss-encounter / the hydra heads in order)', () => {
  it('shields every head but the next, regrows a fallen head, and is exposed with every head down', () => {
    const { sim, boss, p } = withBoss('hydra');
    sim.state.godMode = true;
    run(sim, 0.1);
    const heads = () => parts(sim).sort((a, b) => (a.part!.partId < b.part!.partId ? -1 : 1));
    expect(heads()).toHaveLength(3);
    const [one, two] = heads();
    expect(one.marked).toBe(1);
    expect(two.guarded).toBe(true);
    // Out of order: nothing.
    const health = two.health;
    hitEnemy(sim.state, two, source(p.id), two.x, two.y);
    expect(two.health).toBe(health);
    // The body takes a tenth while a head lives.
    expect(damageTakenMultiplier(boss)).toBeCloseTo(0.1);

    // The first head falls; the second is next. Not cut in time, the first grows back.
    one.health = 1;
    hitEnemy(sim.state, one, source(p.id), one.x, one.y);
    run(sim, 0.1);
    expect(heads()).toHaveLength(2);
    expect(heads()[0].marked).toBe(2);
    run(sim, 14.5);
    expect(heads()).toHaveLength(3);
    expect(heads().find((h) => h.marked !== undefined)?.part?.partId).toBe('head_1');

    // Cut all three in order: exposed.
    for (let n = 0; n < 3; n++) {
      const next = heads().find((h) => h.marked !== undefined)!;
      next.health = 1;
      hitEnemy(sim.state, next, source(p.id), next.x, next.y);
      run(sim, 0.1);
    }
    expect(heads()).toHaveLength(0);
    expect(boss.boss!.exposed).toBeGreaterThan(7);
    expect(damageTakenMultiplier(boss)).toBeCloseTo(1.6);
    run(sim, 8.5);
    expect(boss.boss!.exposed).toBe(0);
    expect(heads()).toHaveLength(3);
  });

  it('grows two more heads in her second phase', () => {
    const { sim, boss } = withBoss('hydra');
    sim.state.godMode = true;
    run(sim, 0.1);
    boss.health = boss.maxHealth * 0.45;
    run(sim, 0.2);
    expect(parts(sim)).toHaveLength(5);
  });
});

describe('Scylla (spec: boss-encounter / scylla tentacles hold the arena)', () => {
  it('holds zones with her tentacles that hurt and slow, and takes half damage while one lives', () => {
    const { sim, boss, p } = withBoss('scylla');
    run(sim, 0.1);
    expect(parts(sim)).toHaveLength(4);
    expect(sim.state.zones).toHaveLength(4);
    expect(damageTakenMultiplier(boss)).toBeCloseTo(0.5);
    // Stand in a zone (out of reach of the boss and its lashes for the test).
    boss.boss!.attackTimer = 99;
    for (const part of boss.boss!.parts.values()) part.timer = 99;
    const zone = sim.state.zones[0];
    p.x = p.px = zone.x;
    p.y = p.py = zone.y;
    p.invulnerable = 0;
    const before = p.health;
    run(sim, 2);
    expect(p.health).toBeLessThan(before);
    // Slowed while walking inside.
    p.x = p.px = zone.x - 60;
    const x = p.x;
    run(sim, 0.25, { moveX: 1, moveY: 0, ability: false });
    expect(p.x - x).toBeLessThan(p.stats.moveSpeed * 0.25 * 0.8);
    // Every tentacle down: full damage.
    for (const t of parts(sim)) t.health = 0;
    for (const t of parts(sim)) hitEnemy(sim.state, t, source(p.id), t.x, t.y);
    run(sim, 0.1);
    expect(damageTakenMultiplier(boss)).toBe(1);
    expect(sim.state.zones).toHaveLength(0);
  });

  it('holds her strait', () => {
    const { sim, boss } = withBoss('scylla');
    sim.state.godMode = true;
    const c = sim.state.arena.bossArena;
    const p = sim.state.players[0];
    p.x = p.px = c.x + 1200;
    run(sim, 6);
    expect(Math.hypot(boss.x - c.x, boss.y - c.y)).toBeLessThanOrEqual(201);
  });
});

describe('Asterion (spec: boss-encounter / asterion shifting walls)', () => {
  it('raises walls after a warning that block the way and hurt whoever they rise under', () => {
    const { sim, boss, p } = withBoss('asterion');
    boss.boss!.attackIndex = 0;
    boss.boss!.attackTimer = 0;
    sim.step(STEP, [NO_INPUT]);
    const warnings = sim.state.hazards.filter((h) => h.wall !== undefined);
    expect(warnings.length).toBeGreaterThan(10);
    expect(sim.state.walls).toHaveLength(0);
    // Stand where a wall will rise.
    const at = warnings[0];
    p.x = p.px = at.x;
    p.y = p.py = at.y;
    p.invulnerable = 0;
    const before = p.health;
    run(sim, at.warn + 0.05);
    expect(sim.state.walls.length).toBeGreaterThan(10);
    expect(p.health).toBeLessThan(before);
    expect(Math.hypot(p.x - at.x, p.y - at.y)).toBeGreaterThanOrEqual(24 + p.radius - 0.5);
    expect(sim.state.collision.isBlocked(at.x, at.y, 4)).toBe(true);
  });

  it('is dazed when his charge runs into a wall, and takes extra damage', () => {
    const { sim, boss } = withBoss('asterion');
    sim.state.godMode = true;
    // A wall right in his path.
    sim.state.walls.push({ id: 999, x: boss.x - 60, y: boss.y, radius: 24, age: 1, left: 30 });
    sim.state.collision.setDynamic(sim.state.walls);
    boss.boss!.dash = { dx: -1, dy: 0, time: 1, speed: 1000, damage: 10, hit: false };
    run(sim, 0.2);
    expect(boss.boss!.dash).toBeUndefined();
    expect(boss.dazed).toBeGreaterThan(2);
    expect(damageTakenMultiplier(boss)).toBeCloseTo(1.5);
  });
});

describe('perfect dodge (spec: boss-encounter / perfect dodge)', () => {
  function slamOn() {
    const { sim, boss, p } = withBoss('cyclops');
    boss.boss!.attackTimer = 99;
    run(sim, 1.2);
    p.invulnerable = 0;
    sim.state.addHazard({
      kind: 'ground_slam',
      sourceId: boss.id,
      shape: 'circle',
      x: p.x,
      y: p.y,
      radius: 400,
      x2: 0,
      y2: 0,
      width: 0,
      warn: 0.5,
      damage: 40,
    });
    return { sim, p };
  }

  it('dashing through a slam as it lands: no damage, Surge, stamina back', () => {
    const { sim, p } = slamOn();
    run(sim, 0.45);
    sim.step(STEP, [{ moveX: 1, moveY: 0, ability: false, dash: true }]);
    const spent = p.stamina;
    run(sim, 0.1);
    expect(p.health).toBe(p.stats.maxHealth);
    expect(p.surge).toBeGreaterThan(2.5);
    expect(p.stamina).toBeGreaterThan(spent + sim.state.balance.stamina.dashCost - 1);
    expect(sim.events().some((e) => e.type === 'perfectDodge')).toBe(true);
    expect(sim.hud().surge).toBeGreaterThan(2.5);
  });

  it('Surge adds 30% damage', () => {
    const { sim, p } = slamOn();
    const dummy = sim.state.spawnEnemy(sim.state.index.enemy('satyr'), p.x + 50, p.y)!;
    dummy.health = dummy.maxHealth = 1e6;
    hitEnemy(sim.state, dummy, { ...source(p.id), critChance: -1 }, p.x, p.y);
    const plain = 1e6 - dummy.health;
    p.surge = 3;
    const before = dummy.health;
    hitEnemy(sim.state, dummy, { ...source(p.id), critChance: -1 }, p.x, p.y);
    expect(before - dummy.health).toBeCloseTo(plain * 1.3, 3);
  });

  it('walking out in time is no perfect dodge', () => {
    const { sim, p } = slamOn();
    p.x = p.px = p.x + 1000;
    run(sim, 0.6);
    expect(p.surge).toBe(0);
    expect(sim.events().some((e) => e.type === 'perfectDodge')).toBe(false);
  });
});

describe('snapshots carry boss mechanics', () => {
  it('cones, walls, zones, shielded and marked parts', () => {
    const { sim, boss } = withBoss('scylla');
    run(sim, 0.1);
    sim.state.walls.push({ id: 77, x: boss.x, y: boss.y + 300, radius: 24, age: 0.5, left: 4 });
    sim.state.addHazard({
      kind: 'x',
      sourceId: boss.id,
      shape: 'cone',
      x: boss.x,
      y: boss.y,
      radius: 200,
      angle: 1.2,
      arc: 0.8,
      x2: 0,
      y2: 0,
      width: 0,
      warn: 1,
      damage: 1,
    });
    const index = new ContentIndex(CONTENT);
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), index);
    expect(snap.zones).toHaveLength(4);
    expect(snap.walls[0]).toMatchObject({ id: 77, radius: 24 });
    const cone = snap.hazards.find((h) => h.shape === 'cone');
    expect(cone?.angle).toBeCloseTo(1.2, 3);
    expect(cone?.arc).toBeCloseTo(0.8, 3);
    expect(cone?.timer).toBeCloseTo(1, 1);
    expect(snap.enemies.filter((e) => e.def.id.startsWith('scylla_tentacle'))).toHaveLength(4);
  });
});
