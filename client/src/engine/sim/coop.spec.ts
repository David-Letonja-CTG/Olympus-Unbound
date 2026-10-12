import { CONTENT } from '../testing/content';
import { quietContent } from '../testing/fixtures';
import { RunSimulation, STEP } from './run-simulation';
import { PartySeat } from './run-state';
import { NO_INPUT } from './types';

const seat = (godId: string, name: string, modifiers: PartySeat['modifiers'] = []): PartySeat => ({
  godId,
  name,
  modifiers,
});

function party(seats: PartySeat[], content = quietContent()) {
  return new RunSimulation(
    {
      runId: 'coop',
      godId: seats[0].godId,
      realmId: 'mount_olympus',
      seed: 7,
      modifiers: seats[0].modifiers,
      party: seats,
    },
    content,
  );
}

describe('co-op (spec: co-op)', () => {
  it('reports every god’s health to every screen, marking its own god (spec: hud / party health)', () => {
    const sim = party([seat('zeus', 'You'), seat('hades', 'Ana')]);
    const [you, ana] = sim.state.players;
    ana.health = 30;
    ana.alive = false;
    ana.revive = 0.25;
    const hud = sim.hud(you.id);
    expect(hud.party.map((m) => [m.name, m.seat, m.self, m.alive])).toEqual([
      ['You', 0, true, true],
      ['Ana', 1, false, false],
    ]);
    expect(hud.party[1].revive).toBe(0.25);
    expect(sim.hud(ana.id).party.map((m) => m.self)).toEqual([false, true]);
  });

  it('gives every player their own god, weapon and stats, side by side on the spawn plaza', () => {
    const sim = party([seat('zeus', 'You'), seat('hades', 'Ana'), seat('athena', 'Bo')]);
    const players = sim.state.players;
    expect(players.map((p) => [p.god.id, p.name])).toEqual([
      ['zeus', 'You'],
      ['hades', 'Ana'],
      ['athena', 'Bo'],
    ]);
    expect(players.map((p) => p.loadout.weapons[0].def.id)).toEqual([
      'thunder_spear',
      'bident',
      'spear_of_athena',
    ]);
    expect(players[1].stats.maxHealth).toBe(150);
    const positions = new Set(players.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
    expect(positions.size).toBe(3);
  });

  it("applies each player's own permanent upgrades", () => {
    const sim = party([
      seat('zeus', 'You', [{ stat: 'maxHealth', flat: 20 }]),
      seat('zeus', 'Ana'),
    ]);
    const [a, b] = sim.state.players;
    expect(a.stats.maxHealth - b.stats.maxHealth).toBe(20);
  });

  it('makes enemies tougher, more numerous and bosses stronger for each extra player', () => {
    const solo = party([seat('zeus', 'You')]);
    const trio = party([seat('zeus', 'You'), seat('hades', 'Ana'), seat('poseidon', 'Bo')]);
    const coop = CONTENT.balance.coop;
    const def = solo.state.index.enemy('satyr');
    const a = solo.state.spawnEnemy(def, 100, 100);
    const b = trio.state.spawnEnemy(def, 100, 100);
    expect((b?.maxHealth ?? 0) / (a?.maxHealth ?? 1)).toBeCloseTo(
      1 + 2 * coop.enemyHealthPerPlayer,
    );
    expect(trio.state.partyScale.spawnRate).toBeCloseTo(1 + 2 * coop.spawnRatePerPlayer);
    expect(trio.state.partyScale.maxAlive).toBeCloseTo(1 + 2 * coop.maxAlivePerPlayer);
    expect(trio.state.partyScale.bossHealth).toBeCloseTo(1 + 2 * coop.bossHealthPerPlayer);
    expect(solo.state.partyScale).toEqual({
      enemyHealth: 1,
      spawnRate: 1,
      maxAlive: 1,
      bossHealth: 1,
    });
  });

  it('gives each living player their own level-up choice and resumes when all have chosen', () => {
    const sim = party([seat('zeus', 'You'), seat('hades', 'Ana')]);
    const [you, ana] = sim.state.players;
    sim.debug({ type: 'grantXp', amount: sim.state.xpToNext() });
    sim.step(STEP, [NO_INPUT, NO_INPUT]);
    expect(sim.phase).toBe('choosing');
    const mine = sim.choiceFor(you.id);
    const hers = sim.choiceFor(ana.id);
    expect(mine?.playerId).toBe(you.id);
    expect(hers?.playerId).toBe(ana.id);
    expect(mine?.id).not.toBe(hers?.id);

    expect(sim.choose(0, mine?.id)).toBe(true);
    expect(sim.phase).toBe('choosing'); // still waiting for Ana
    expect(sim.choose(0, mine?.id)).toBe(false); // answered once only
    expect(sim.choose(0, hers?.id)).toBe(true);
    expect(sim.phase).toBe('playing');
    expect(sim.state.pendingLevels).toBe(0);
  });

  it('shows each player their own HUD and result', () => {
    const sim = party([seat('zeus', 'You'), seat('hades', 'Ana')]);
    const [you, ana] = sim.state.players;
    ana.health = 42;
    expect(sim.hud(ana.id).health).toBe(42);
    expect(sim.hud(ana.id).weapons[0].id).toBe('bident');
    expect(sim.hud(you.id).weapons[0].id).toBe('thunder_spear');
    sim.abandon();
    expect(sim.resultFor(ana.id).godId).toBe('hades');
    expect(sim.resultFor(ana.id).loadout.weapons[0].id).toBe('bident');
    expect(sim.result?.godId).toBe('zeus');
  });

  it('spawns enemies outside every player’s view', () => {
    const sim = party([seat('zeus', 'You'), seat('hades', 'Ana')], CONTENT);
    sim.setView(400, 240);
    const [you, ana] = sim.state.players;
    ana.x += 900; // far apart
    for (let i = 0; i < 60 * 20; i++) sim.step(STEP, [NO_INPUT, NO_INPUT]);
    // Fresh spawns this step: none may appear inside either player's view.
    const before = new Set(sim.state.enemies.map((e) => e.id));
    for (let i = 0; i < 60; i++) {
      sim.step(STEP, [NO_INPUT, NO_INPUT]);
      for (const e of sim.state.enemies) {
        if (before.has(e.id)) continue;
        before.add(e.id);
        for (const p of [you, ana])
          expect(Math.abs(e.x - p.x) >= 400 || Math.abs(e.y - p.y) >= 240).toBe(true);
      }
    }
  });
});
