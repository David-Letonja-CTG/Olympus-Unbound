import { GameContent, RealmDefinition } from '../data/types';
import { spawnBoss } from '../bosses/boss';
import { quietContent } from '../testing/fixtures';
import { realmAt, realmSeed } from './realms';
import { RunSimulation, STEP } from './run-simulation';
import { PartySeat } from './run-state';
import { NO_INPUT, PlayerInput } from './types';

/** Quiet content with a second realm after Mount Olympus. */
function twoRealms(): GameContent {
  const content = quietContent();
  const olympus = content.realms[0];
  const second: RealmDefinition = { ...olympus, id: 'second_realm', name: 'Second Realm' };
  return { ...content, realms: [olympus, second] };
}

function sim(content = twoRealms(), party?: PartySeat[], seed = 3) {
  const s = new RunSimulation(
    { runId: 'endless', godId: 'zeus', realmId: 'mount_olympus', seed, modifiers: [], party },
    content,
  );
  s.setView(720, 420);
  return s;
}

const steps = (s: RunSimulation, seconds: number, inputs: PlayerInput[] = [NO_INPUT]) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.step(STEP, inputs);
};

/** Defeats the boss and steps once: the gate opens. */
function openGate(s: RunSimulation) {
  spawnBoss(s.state);
  s.debug({ type: 'damageBoss', fraction: 1 });
  s.step(STEP, [NO_INPUT]);
}

describe('endless runs (spec: endless-run)', () => {
  it('follows the realms in content order from the starting realm and wraps around', () => {
    const realms = twoRealms().realms;
    expect(realmAt(realms, 'mount_olympus', 0).id).toBe('mount_olympus');
    expect(realmAt(realms, 'mount_olympus', 1).id).toBe('second_realm');
    expect(realmAt(realms, 'mount_olympus', 2).id).toBe('mount_olympus');
    expect(realmAt(realms, 'second_realm', 1).id).toBe('mount_olympus');
    expect(realmSeed(42, 0)).toBe(42);
    expect(realmSeed(42, 1)).not.toBe(realmSeed(42, 2));
  });

  it('opens a gate where the boss fell and travels after 2 seconds inside it', () => {
    const s = sim();
    openGate(s);
    const gate = s.state.gate;
    expect(gate?.to.id).toBe('second_realm');
    expect(s.hud().gate).toMatchObject({ to: 'Second Realm' });
    const p = s.state.players[0];
    p.x = gate?.x ?? 0;
    p.y = gate?.y ?? 0;
    steps(s, 1.5);
    expect(s.state.depth).toBe(0);
    steps(s, 0.6);
    expect(s.state.depth).toBe(1);
    expect(s.state.realm.id).toBe('second_realm');
    expect(s.state.realmTime).toBeLessThan(0.1);
    expect(s.state.time).toBeGreaterThan(2);
    expect(s.hud().realm).toEqual({ name: 'Second Realm', number: 2 });
    expect(s.events().some((e) => e.type === 'realmEntered' && e.depth === 1)).toBe(true);
  });

  it('starts standing over when the god steps out, and takes the party anyway after 60 seconds', () => {
    const s = sim();
    openGate(s);
    const gate = s.state.gate;
    const p = s.state.players[0];
    p.x = gate?.x ?? 0;
    p.y = gate?.y ?? 0;
    steps(s, 1.5);
    p.x += 400;
    steps(s, 0.2);
    expect(s.state.gate?.standing).toBe(0);
    steps(s, 58.5);
    expect(s.state.depth).toBe(1);
  });

  it('keeps the build and gathers the spoils when travelling', () => {
    const s = sim();
    const player = s.state.players[0];
    steps(s, 1);
    s.state.addXp(1);
    const level = s.state.level;
    const weapons = player.loadout.weapons.map((w) => w.def.id);
    openGate(s);
    // Only the test's own spoils (the boss dropped some too).
    for (const pk of s.state.pickups) pk.dead = true;
    s.state.pickups.length = 0;
    s.state.spawnPickup('xp', player.x + 500, player.y, 3);
    s.state.spawnPickup('gold', player.x + 500, player.y, 9);
    const xp = s.state.xp;
    const gold = s.state.gold;
    s.debug({ type: 'travel' });
    expect(s.state.pickups).toHaveLength(0);
    expect(s.state.enemies).toHaveLength(0);
    expect(s.state.xp + (s.state.level - level) * 1000).toBeGreaterThan(xp);
    expect(s.state.gold).toBeCloseTo(gold + 9);
    expect(player.loadout.weapons.map((w) => w.def.id)).toEqual(weapons);
    expect(player.x).toBeCloseTo(s.state.arena.spawn.x);
  });

  it('builds the same next realm for the same seed', () => {
    const a = sim();
    const b = sim();
    a.debug({ type: 'travel' });
    b.debug({ type: 'travel' });
    expect(a.state.arena).toEqual(b.state.arena);
    const c = sim(twoRealms(), undefined, 4);
    c.debug({ type: 'travel' });
    expect(c.state.arena).not.toEqual(a.state.arena);
  });

  it('makes every realm cleared harder (spec: endless-run / difficulty by depth)', () => {
    const s = sim();
    const def = s.state.index.enemy('satyr');
    const first = s.state.spawnEnemy(def, 100, 100)?.maxHealth ?? 0;
    s.debug({ type: 'travel' });
    const second = s.state.spawnEnemy(def, 100, 100)?.maxHealth ?? 0;
    const growth = s.state.balance.endless;
    expect(second / first).toBeCloseTo(growth.enemyHealthGrowth);
    const bossHealth = (depth: number) => {
      const t = sim();
      for (let i = 0; i < depth; i++) t.debug({ type: 'travel' });
      return spawnBoss(t.state)?.maxHealth ?? 0;
    };
    expect(bossHealth(2) / bossHealth(0)).toBeCloseTo(growth.bossHealthGrowth ** 2);
  });

  it('deals more damage in every realm, compounding', () => {
    const s = sim();
    const def = s.state.index.enemy('satyr');
    const first = s.state.spawnEnemy(def, 100, 100)?.damage ?? 0;
    s.debug({ type: 'travel' });
    s.debug({ type: 'travel' });
    const third = s.state.spawnEnemy(def, 100, 100)?.damage ?? 0;
    expect(third / first).toBeCloseTo(s.state.balance.endless.enemyDamageGrowth ** 2);
  });

  it('never starts a realm weaker than the last one ended', () => {
    const s = sim();
    const def = s.state.index.enemy('satyr');
    s.state.realmTime = 60 * 60; // the first realm's growth at its cap
    const last = s.state.spawnEnemy(def, 100, 100)?.maxHealth ?? 0;
    s.debug({ type: 'travel' });
    const arrival = s.state.spawnEnemy(def, 100, 100)?.maxHealth ?? 0;
    expect(arrival).toBeGreaterThanOrEqual(last);
  });

  it('opens later realms further into their spawn timeline', () => {
    const content = twoRealms();
    const timeline = [
      { from: 0, rate: 0, maxAlive: 0, enemies: [{ id: 'satyr', weight: 1 }] },
      { from: 90, rate: 30, maxAlive: 5, enemies: [{ id: 'harpy', weight: 1 }] },
    ];
    const realms = content.realms.map((r) => ({ ...r, timeline }));
    const s = sim({ ...content, realms });
    const harpies = () => s.state.enemies.filter((e) => !e.dead && e.def.id === 'harpy').length;
    steps(s, 1);
    expect(harpies()).toBe(0);
    s.debug({ type: 'travel' });
    steps(s, 1);
    expect(s.state.realmTime).toBeLessThan(2);
    expect(harpies()).toBeGreaterThan(0);
  });

  it('raises fallen gods in the next realm, but not those who left', () => {
    const s = sim(twoRealms(), [
      { godId: 'zeus', name: 'Ada', modifiers: [] },
      { godId: 'hades', name: 'Bo', modifiers: [] },
      { godId: 'athena', name: 'Cy', modifiers: [] },
    ]);
    const [, bo, cy] = s.state.players;
    bo.alive = false;
    bo.health = 0;
    s.leave(cy.id);
    s.debug({ type: 'travel' });
    expect(bo.alive).toBe(true);
    expect(bo.health).toBe(bo.stats.maxHealth / 2);
    expect(cy.alive).toBe(false);
  });
});

describe('reviving allies (spec: co-op / reviving allies)', () => {
  const party = (): PartySeat[] => [
    { godId: 'zeus', name: 'Ada', modifiers: [] },
    { godId: 'hades', name: 'Bo', modifiers: [] },
  ];

  it('revives a fallen ally after 3 seconds beside their spirit, at half health', () => {
    const s = sim(twoRealms(), party());
    const [ada, bo] = s.state.players;
    bo.alive = false;
    bo.health = 0;
    ada.x = bo.x + 30;
    ada.y = bo.y;
    steps(s, 2.9, [NO_INPUT, NO_INPUT]);
    expect(bo.alive).toBe(false);
    expect(bo.revive).toBeGreaterThan(0.9);
    steps(s, 0.2, [NO_INPUT, NO_INPUT]);
    expect(bo.alive).toBe(true);
    expect(bo.health).toBe(bo.stats.maxHealth * s.state.balance.revive.health);
    expect(bo.invulnerable).toBeGreaterThan(1.5);
    expect(s.events().some((e) => e.type === 'announcement' && e.text === 'Ada revived Bo!')).toBe(
      true,
    );
  });

  it('drains the progress when the ally steps away', () => {
    const s = sim(twoRealms(), party());
    const [ada, bo] = s.state.players;
    bo.alive = false;
    ada.x = bo.x + 30;
    ada.y = bo.y;
    steps(s, 2, [NO_INPUT, NO_INPUT]);
    ada.x = bo.x + 500;
    steps(s, 1, [NO_INPUT, NO_INPUT]);
    expect(bo.alive).toBe(false);
    expect(bo.revive).toBeCloseTo(1 / 3, 1);
  });

  it('never revives a player who left, and ends in defeat when everyone is down', () => {
    const s = sim(twoRealms(), party());
    const [ada, bo] = s.state.players;
    s.leave(bo.id);
    ada.x = bo.x;
    ada.y = bo.y;
    steps(s, 4, [NO_INPUT, NO_INPUT]);
    expect(bo.alive).toBe(false);
    s.debug({ type: 'killPlayer' });
    s.step(STEP, [NO_INPUT, NO_INPUT]);
    expect(s.result?.outcome).toBe('defeat');
  });
});

describe('event realms (spec: seasonal-events)', () => {
  it('stand outside the chain: a run may start in one, then goes on from the first realm', () => {
    const content = twoRealms();
    const event: RealmDefinition = { ...content.realms[0], id: 'event_realm', event: 'some_event' };
    const realms = [...content.realms, event];
    expect(realmAt(realms, 'event_realm', 0).id).toBe('event_realm');
    expect(realmAt(realms, 'event_realm', 1).id).toBe('mount_olympus');
    expect(realmAt(realms, 'event_realm', 2).id).toBe('second_realm');
    expect(realmAt(realms, 'second_realm', 1).id).toBe('mount_olympus');
  });
});
