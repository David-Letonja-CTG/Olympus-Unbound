import { CONTENT } from '../testing/content';
import { armsFirst, playRun } from '../testing/autopilot';
import { disarm, quietSim } from '../testing/fixtures';
import { validateContent } from '../data/content-index';
import { normaliseMove } from './players';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT } from './types';

const olympus = (
  seed: number,
  modifiers = [] as ConstructorParameters<typeof RunSimulation>[0]['modifiers'],
) =>
  new RunSimulation(
    { runId: `run-${seed}`, godId: 'zeus', realmId: 'mount_olympus', seed, modifiers },
    CONTENT,
  );

describe('content', () => {
  it('is valid', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('draws every character from an animated pack sheet (spec: asset-pipeline / character art)', () => {
    const keys = new Set([
      ...CONTENT.gods.map((g) => g.visual.sprite),
      ...CONTENT.enemies.map((e) => e.visual.sprite),
      ...CONTENT.bosses.map((b) => b.visual.sprite),
      ...CONTENT.cutscenes.flatMap((c) =>
        c.cues.flatMap((cue) =>
          cue.type === 'spawn' ? [cue.actor.sprite] : cue.type === 'horde' ? [cue.sprite] : [],
        ),
      ),
    ]);
    const missing = [...keys].filter((key) => {
      const animations = CONTENT.assets.sprites[key]?.animations;
      return !(animations?.idle && animations.walk && animations.death);
    });
    expect(missing).toEqual([]);
  });

  it('reports broken references', () => {
    const broken = {
      ...CONTENT,
      gods: [{ ...CONTENT.gods[0], startingWeapon: 'missing_weapon' }],
      synergies: [...CONTENT.synergies, { ...CONTENT.synergies[0], id: 'storm' }],
    };
    const errors = validateContent(broken);
    expect(errors).toContain('God "zeus" starts with unknown weapon "missing_weapon".');
    expect(errors).toContain('Duplicate synergy id "storm".');
  });

  it('has the vertical slice’s content', () => {
    expect(CONTENT.weapons.length).toBeGreaterThanOrEqual(6);
    expect(CONTENT.armour).toHaveLength(4);
    expect(CONTENT.relics.filter((r) => !r.event)).toHaveLength(6);
    // Mount Olympus's own enemy types (spec: enemy-spawning), other realms bring theirs.
    const olympus = CONTENT.realms.find((r) => r.id === 'mount_olympus');
    const ids = new Set([
      ...(olympus?.timeline.flatMap((p) => [
        ...p.enemies.map((e) => e.id),
        ...(p.groups ?? []).map((g) => g.id),
      ]) ?? []),
      ...(olympus?.events.map((e) => e.enemy) ?? []),
    ]);
    expect(ids.size).toBe(8);
  });

  it('chains Mount Olympus into the Underworld, guarded by Cerberus (spec: realm-underworld)', () => {
    expect(CONTENT.realms.filter((r) => !r.event).map((r) => r.id)).toEqual([
      'mount_olympus',
      'the_underworld',
      'lernaean_marsh',
      'aegean_shore',
      'labyrinth_of_crete',
      'mount_othrys',
    ]);
    const underworld = CONTENT.realms.find((r) => r.id === 'the_underworld');
    expect(underworld?.boss.id).toBe('cerberus');
    const ids = new Set(underworld?.timeline.flatMap((p) => p.enemies.map((e) => e.id)));
    expect([...ids].sort()).toEqual(['corrupted_hoplite', 'fury', 'lampad', 'orthrus', 'shade']);
  });

  it('has Mount Othrys after the Labyrinth, guarded by Kronos (spec: realm-othrys)', () => {
    const othrys = CONTENT.realms.find((r) => r.id === 'mount_othrys');
    expect(othrys?.boss.id).toBe('kronos');
    const ids = new Set(othrys?.timeline.flatMap((p) => p.enemies.map((e) => e.id)));
    expect([...ids].sort()).toEqual(['gigas', 'kampe_scorpion', 'ker', 'titan_soldier']);
    const kronos = CONTENT.bosses.find((b) => b.id === 'kronos');
    expect(kronos?.phases.map((ph) => ph.announcement)).toEqual([
      'Kronos rises from his throne on Othrys!',
      'Kronos remembers his hunger!',
      'Time itself bends to Kronos!',
    ]);
    expect(kronos?.phases[1].attacks.map((a) => a.type)).toContain('devour');
    expect(kronos?.phases[1].attacks).toContainEqual(
      expect.objectContaining({ type: 'summon', enemy: 'titan_soldier' }),
    );
  });

  it('has the Aegean Shore, guarded by Scylla (spec: realm-aegean)', () => {
    const shore = CONTENT.realms.find((r) => r.id === 'aegean_shore');
    expect(shore?.boss.id).toBe('scylla');
    const ids = new Set(shore?.timeline.flatMap((p) => p.enemies.map((e) => e.id)));
    expect([...ids].sort()).toEqual(['drowned_sailor', 'giant_crab', 'siren', 'triton']);
  });

  it('has the Labyrinth of Crete, guarded by Asterion (spec: realm-labyrinth)', () => {
    const labyrinth = CONTENT.realms.find((r) => r.id === 'labyrinth_of_crete');
    expect(labyrinth?.boss.id).toBe('asterion');
    const ids = new Set(labyrinth?.timeline.flatMap((p) => p.enemies.map((e) => e.id)));
    expect([...ids].sort()).toEqual(['bronze_guardian', 'curete', 'minotaur', 'snake_priestess']);
    expect(labyrinth?.map.roads?.thread).toBeDefined();
  });

  it('has the Lernaean Marsh, guarded by the Hydra (spec: realm-lerna)', () => {
    const marsh = CONTENT.realms.find((r) => r.id === 'lernaean_marsh');
    expect(marsh?.boss.id).toBe('hydra');
    const ids = new Set(marsh?.timeline.flatMap((p) => p.enemies.map((e) => e.id)));
    expect([...ids].sort()).toEqual(['giant_crab', 'lamia', 'naiad', 'swamp_serpent']);
  });
});

describe('player movement', () => {
  it('moves diagonally no faster than straight', () => {
    const sim = quietSim();
    disarm(sim);
    const p = sim.state.players[0];
    const start = { x: p.x, y: p.y };
    for (let i = 0; i < 60; i++) sim.step(STEP, [{ moveX: 1, moveY: 1, ability: false }]);
    expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeCloseTo(p.stats.moveSpeed, 0);
  });

  it('ignores stick input inside the dead zone', () => {
    expect(normaliseMove({ moveX: 0.1, moveY: 0.1, ability: false })).toEqual({ x: 0, y: 0 });
    expect(normaliseMove({ moveX: 0.5, moveY: 0, ability: false })).toEqual({ x: 0.5, y: 0 });
  });
});

describe('run phases', () => {
  it('does not advance time while paused and resumes where it stopped', () => {
    const sim = quietSim();
    for (let i = 0; i < 90; i++) sim.step(STEP, [NO_INPUT]);
    const time = sim.state.time;
    expect(sim.pause()).toBe(true);
    for (let i = 0; i < 600; i++) sim.step(STEP, [NO_INPUT]);
    expect(sim.state.time).toBe(time);
    expect(sim.resume()).toBe(true);
    expect(sim.phase).toBe('playing');
  });

  it('returns to the open choice when resumed during a level-up', () => {
    const sim = quietSim();
    sim.state.addXp(5);
    sim.step(STEP, [NO_INPUT]);
    sim.pause();
    expect(sim.choose(0)).toBe(false);
    sim.resume();
    expect(sim.phase).toBe('choosing');
  });

  it('ignores stale or invalid choices', () => {
    const sim = quietSim();
    sim.state.addXp(5);
    sim.step(STEP, [NO_INPUT]);
    const id = sim.currentChoice?.id ?? 0;
    expect(sim.choose(0, id + 1)).toBe(false);
    expect(sim.choose(7, id)).toBe(false);
    expect(sim.choose(0, id)).toBe(true);
    expect(sim.choose(0, id)).toBe(false);
  });

  it('ends once; a second end changes nothing', () => {
    const sim = quietSim();
    expect(sim.abandon()).toBe(true);
    const result = sim.result;
    expect(sim.end('defeat')).toBe(false);
    expect(sim.result).toBe(result);
    expect(sim.events().filter((e) => e.type === 'runEnded')).toHaveLength(1);
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.time).toBe(0);
  });

  it('counts the boss when the player and the boss die in the same step (spec: run-outcome)', () => {
    const sim = quietSim();
    // Both fell during the step: the boss's kill is recorded and the god is down.
    sim.state.bossDefeated = true;
    const god = sim.state.players[0];
    god.health = 0;
    god.alive = false;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.result?.outcome).toBe('defeat');
    expect(sim.result?.realmsCleared).toBe(1);
    expect(sim.result?.gold).toBe(sim.state.realm.rewards.bossGold);
  });
});

describe('full runs (autopilot)', () => {
  it('replays identically with the same seed and inputs', () => {
    const a = olympus(11);
    const b = olympus(11);
    playRun(a, 60);
    playRun(b, 60);
    expect(a.hud()).toEqual(b.hud());
    expect(a.state.kills).toBeGreaterThan(20);
  });

  it('a strong build defeats the boss and passes the gate into the next realm', () => {
    const sim = olympus(847291, [
      { stat: 'might', flat: 6 },
      { stat: 'maxHealth', flat: 3000 },
      { stat: 'armor', flat: 8 },
      { stat: 'regen', flat: 20 },
    ]);
    // Picks like a player building an arsenal; the first offer alone may leave weapon slots empty.
    playRun(sim, 9 * 60, armsFirst);
    expect(sim.state.depth).toBeGreaterThanOrEqual(1);
    expect(sim.state.time).toBeGreaterThan(420);
    expect(sim.state.level).toBeGreaterThan(10);
  }, 120_000);

  it('an unarmed god eventually falls', () => {
    const sim = olympus(5, [{ stat: 'might', flat: -0.99 }]);
    playRun(sim, 15 * 60);
    expect(sim.result?.outcome).toBe('defeat');
    expect(sim.result?.realmsCleared).toBe(0);
  }, 120_000);
});
