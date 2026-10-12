import { CONTENT } from '../testing/content';
import { disarm, quietContent, quietSim } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT } from '../sim/types';
import { spawnBoss } from './boss';

const run = (sim: RunSimulation, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(STEP, [NO_INPUT]);
};

function bossSim(): RunSimulation {
  const sim = quietSim();
  disarm(sim);
  return sim;
}

describe('boss encounter', () => {
  it('arrives at the realm’s boss time in the boss arena, once, and is announced', () => {
    const sim = new RunSimulation(
      { runId: 'b', godId: 'zeus', realmId: 'mount_olympus', seed: 1, modifiers: [] },
      CONTENT,
    );
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 419.5 });
    run(sim, 1);
    const bosses = sim.state.enemies.filter((e) => e.boss);
    expect(bosses).toHaveLength(1);
    expect(bosses[0].def.id).toBe('cyclops');
    const events = sim.events();
    expect(events.filter((e) => e.type === 'bossSpawned')).toHaveLength(1);
    expect(sim.hud().boss?.name).toBe('The Cyclops');
    sim.debug({ type: 'skipTo', seconds: 500 });
    run(sim, 1);
    expect(sim.state.enemies.filter((e) => e.boss)).toHaveLength(1);
  });

  it('ground slam only hurts a player still inside the marked circle when the wind-up ends', () => {
    const sim = bossSim();
    const player = sim.state.players[0];
    const boss = spawnBoss(sim.state);
    if (!boss?.boss) throw new Error('no boss');
    boss.x = boss.px = player.x + 120;
    boss.y = boss.py = player.y;
    boss.boss.attackTimer = 0;
    player.invulnerable = 0;
    boss.attackTimer = 99;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hazards).toHaveLength(1);
    const slam = sim.state.hazards[0];
    expect(slam.kind).toBe('ground_slam');
    expect(player.health).toBe(player.stats.maxHealth);
    run(sim, slam.warn);
    expect(player.health).toBeLessThan(player.stats.maxHealth);
  });

  it('a player who leaves a boulder’s circle before impact takes no damage', () => {
    // One boulder, aimed where the player stands.
    const content = quietContent();
    const bosses = content.bosses.map((b) => ({
      ...b,
      phases: [
        {
          ...b.phases[0],
          attacks: [
            {
              type: 'boulder' as const,
              id: 'boulder_throw',
              windup: 1.3,
              radius: 75,
              damage: 26,
              count: 1,
              spread: 0,
            },
          ],
        },
      ],
    }));
    const sim = quietSim({ content: { ...content, bosses } });
    disarm(sim);
    const player = sim.state.players[0];
    const boss = spawnBoss(sim.state);
    if (!boss?.boss) throw new Error('no boss');
    boss.x = boss.px = player.x + 600;
    boss.attackTimer = 99;
    boss.boss.attackTimer = 0;
    player.invulnerable = 0;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.hazards.some((h) => h.kind === 'boulder_throw')).toBe(true);
    // Run out of the circle (radius 75) before the wind-up ends.
    for (let i = 0; i < 0.8 / STEP; i++) sim.step(STEP, [{ moveX: 0, moveY: -1, ability: false }]);
    for (let i = 0; i < 1 / STEP; i++) sim.step(STEP, [NO_INPUT]);
    expect(player.health).toBe(player.stats.maxHealth);
  });

  it('enters its second phase below half health and announces it once', () => {
    const sim = bossSim();
    const boss = spawnBoss(sim.state);
    if (!boss?.boss) throw new Error('no boss');
    sim.events();
    boss.health = boss.maxHealth * 0.45;
    run(sim, 0.5);
    boss.health = boss.maxHealth * 0.4;
    run(sim, 0.5);
    expect(boss.boss.phase).toBe(1);
    const enraged = sim
      .events()
      .filter((e) => e.type === 'announcement' && e.text.includes('enraged'));
    expect(enraged).toHaveLength(1);
  });

  it('defeating the boss adds its gold and opens the gate; the run goes on (spec: boss-encounter)', () => {
    const sim = bossSim();
    const boss = spawnBoss(sim.state);
    const gold = sim.state.gold;
    sim.debug({ type: 'damageBoss', fraction: 1 });
    sim.step(STEP, [NO_INPUT]);
    expect(sim.phase).toBe('playing');
    expect(sim.state.gold - gold).toBe(sim.state.realm.rewards.bossGold);
    expect(sim.state.gate).toMatchObject({ x: boss?.x, y: boss?.y });
    expect(sim.events().filter((e) => e.type === 'gateOpened')).toHaveLength(1);
  });

  it('summons and charges only in the second phase', () => {
    const content = quietContent();
    const cyclops = content.bosses.find((b) => b.id === 'cyclops');
    expect(cyclops?.phases[0].attacks.map((a) => a.type)).not.toContain('charge');
    expect(cyclops?.phases[1].attacks.map((a) => a.type)).toEqual(
      expect.arrayContaining(['charge', 'summon']),
    );
  });

  it('Cerberus guards the Underworld and calls the Orthrus pack when enraged (spec: realm-underworld)', () => {
    const sim = new RunSimulation(
      { runId: 'c', godId: 'zeus', realmId: 'the_underworld', seed: 2, modifiers: [] },
      CONTENT,
    );
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 419.5 });
    run(sim, 1);
    const boss = sim.state.enemies.find((e) => e.boss);
    if (!boss?.boss) throw new Error('no Cerberus');
    expect(boss.def.id).toBe('cerberus');
    sim.events();
    boss.health = boss.maxHealth * 0.45;
    run(sim, 0.5);
    expect(boss.boss.phase).toBe(1);
    expect(sim.events().some((e) => e.type === 'announcement' && e.text.includes('pack'))).toBe(
      true,
    );
    // Its first enraged attack is the call.
    boss.boss.attackTimer = 0;
    const before = sim.state.enemies.filter((e) => e.def.id === 'orthrus').length;
    run(sim, 0.5);
    expect(sim.state.enemies.filter((e) => e.def.id === 'orthrus').length).toBeGreaterThan(before);
  });

  it('the Hydra calls its brood of swamp serpents (spec: realm-lerna)', () => {
    const sim = new RunSimulation(
      { runId: 'h', godId: 'zeus', realmId: 'lernaean_marsh', seed: 3, modifiers: [] },
      CONTENT,
    );
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 419.5 });
    run(sim, 1);
    const boss = sim.state.enemies.find((e) => e.boss);
    if (!boss?.boss) throw new Error('no Hydra');
    expect(boss.def.id).toBe('hydra');
    const near = () =>
      sim.state.enemies.filter(
        (e) => e.def.id === 'swamp_serpent' && Math.hypot(e.x - boss.x, e.y - boss.y) < 200,
      ).length;
    // Its third attack is the brood.
    boss.boss.attackIndex = 2;
    boss.boss.attackTimer = 0;
    const before = near();
    run(sim, 0.2);
    expect(near()).toBeGreaterThan(before);
  });

  it('Asterion calls minotaurs, then goes berserk (spec: realm-labyrinth)', () => {
    const sim = new RunSimulation(
      { runId: 'a', godId: 'zeus', realmId: 'labyrinth_of_crete', seed: 4, modifiers: [] },
      CONTENT,
    );
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 419.5 });
    run(sim, 1);
    const boss = sim.state.enemies.find((e) => e.boss);
    if (!boss?.boss) throw new Error('no Asterion');
    expect(boss.def.id).toBe('asterion');
    const announced: string[] = [];
    const emit = sim.state.emit.bind(sim.state);
    sim.state.emit = (event) => {
      if (event.type === 'announcement') announced.push(event.text);
      emit(event);
    };
    boss.health = boss.maxHealth * 0.55;
    run(sim, 0.5);
    expect(boss.boss.phase).toBe(1);
    boss.boss.attackIndex = 0;
    boss.boss.attackTimer = 0;
    const near = () =>
      sim.state.enemies.filter(
        (e) => e.def.id === 'minotaur' && Math.hypot(e.x - boss.x, e.y - boss.y) < 220,
      ).length;
    const before = near();
    run(sim, 0.2);
    expect(near()).toBeGreaterThan(before);
    boss.health = boss.maxHealth * 0.2;
    run(sim, 0.5);
    expect(boss.boss.phase).toBe(2);
    expect(announced).toContain('Asterion goes berserk!');
  });

  it('Scylla calls the drowned when enraged (spec: realm-aegean)', () => {
    const sim = new RunSimulation(
      { runId: 's', godId: 'zeus', realmId: 'aegean_shore', seed: 4, modifiers: [] },
      CONTENT,
    );
    sim.state.godMode = true;
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 419.5 });
    run(sim, 1);
    const boss = sim.state.enemies.find((e) => e.boss);
    if (!boss?.boss) throw new Error('no Scylla');
    expect(boss.def.id).toBe('scylla');
    boss.health = boss.maxHealth * 0.45;
    run(sim, 0.5);
    expect(boss.boss.phase).toBe(1);
    boss.boss.attackIndex = 0;
    boss.boss.attackTimer = 0;
    const near = () =>
      sim.state.enemies.filter(
        (e) => e.def.id === 'drowned_sailor' && Math.hypot(e.x - boss.x, e.y - boss.y) < 200,
      ).length;
    const before = near();
    run(sim, 0.2);
    expect(near()).toBeGreaterThan(before);
  });
});
