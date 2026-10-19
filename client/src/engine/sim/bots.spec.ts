import { CONTENT } from '../testing/content';
import { quietContent } from '../testing/fixtures';
import { autopilot } from '../testing/autopilot';
import { BotSkill } from './bots';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT } from './types';

function withAllies(
  allies: { godId: string; skill: BotSkill }[],
  options: { seed?: number; quiet?: boolean } = {},
): RunSimulation {
  const sim = new RunSimulation(
    {
      runId: 'bots',
      godId: 'zeus',
      realmId: 'mount_olympus',
      seed: options.seed ?? 3,
      modifiers: [],
      party: [
        { godId: 'zeus', name: 'You', modifiers: [] },
        ...allies.map((a) => ({
          godId: a.godId,
          name: `${a.godId} (bot)`,
          modifiers: [],
          bot: { skill: a.skill },
        })),
      ],
    },
    options.quiet === false ? CONTENT : quietContent(),
  );
  sim.setView(720, 420);
  return sim;
}

const run = (sim: RunSimulation, seconds: number, input = NO_INPUT) => {
  for (let i = 0; i < seconds * 60 && sim.phase !== 'ended'; i++) {
    if (sim.phase === 'choosing') sim.choose(0);
    sim.step(STEP, [input]);
  }
};

describe('a party like co-op (spec: bot-allies / a party like co-op)', () => {
  it('is harder with more gods, as in co-op', () => {
    const sim = withAllies([
      { godId: 'hades', skill: 'normal' },
      { godId: 'athena', skill: 'easy' },
    ]);
    const coop = sim.state.balance.coop;
    expect(sim.state.partyScale.enemyHealth).toBeCloseTo(1 + coop.enemyHealthPerPlayer * 2);
    expect(sim.state.players.map((p) => p.bot)).toEqual([undefined, 'normal', 'easy']);
    expect(sim.hud().party.map((m) => !!m.bot)).toEqual([false, true, true]);
  });

  it('lets allies choose at once; only the player is asked', () => {
    const sim = withAllies([{ godId: 'hades', skill: 'normal' }]);
    const growth = (p: (typeof sim.state.players)[number]) =>
      p.loadout.weapons.reduce((s, w) => s + w.level, 0) +
      p.loadout.skills.size +
      p.loadout.relics.length +
      (p.loadout.armour ? 1 : 0);
    const before = growth(sim.state.players[1]);
    sim.debug({ type: 'grantXp', amount: sim.state.xpToNext() });
    sim.step(STEP, [NO_INPUT]);
    const [player, bot] = sim.state.players;
    expect(sim.phase).toBe('choosing');
    expect(sim.choiceFor(bot.id)).toBeUndefined();
    expect(sim.choiceFor(player.id)).toBeDefined();
    expect(sim.hud().waitingFor).toEqual([]);
    sim.choose(0);
    expect(sim.phase).toBe('playing');
    const after = growth(bot);
    expect(after).toBeGreaterThan(before);
  });

  it('an ally revives the fallen player', () => {
    const sim = withAllies([{ godId: 'hades', skill: 'normal' }]);
    run(sim, 1);
    sim.debug({ type: 'killPlayer', slot: 0 });
    expect(sim.phase).toBe('playing');
    run(sim, 15);
    expect(sim.state.players[0].alive).toBe(true);
    expect(sim.events().some((e) => e.type === 'playerRevived')).toBe(true);
  });

  it('allies walk to the open gate', () => {
    const sim = withAllies([{ godId: 'athena', skill: 'easy' }]);
    run(sim, 1);
    sim.debug({ type: 'skipTo', seconds: 1 });
    const bot = sim.state.players[1];
    sim.state.gate = {
      x: bot.x + 500,
      y: bot.y,
      radius: 70,
      to: sim.state.realm,
      standing: 0,
      closesIn: 999,
    };
    const start = Math.abs(sim.state.gate.x - bot.x);
    run(sim, 2);
    expect(Math.abs(sim.state.gate.x - bot.x)).toBeLessThan(start - 200);
  });

  it('bots leave the merchant to the player', () => {
    const sim = withAllies([{ godId: 'hades', skill: 'hard' }]);
    sim.debug({ type: 'summonMerchant' });
    sim.step(STEP, [NO_INPUT]);
    const m = sim.state.merchant!;
    const bot = sim.state.players[1];
    bot.x = bot.px = m.x;
    bot.y = bot.py = m.y;
    sim.step(STEP, [NO_INPUT]);
    expect(sim.state.shopQueue).toEqual([]);
    expect(sim.phase).toBe('playing');
  });
});

describe('how bots play (spec: bot-allies / how bots play)', () => {
  it('a Normal bot steps out of a warned slam; an Easy one does not try', () => {
    for (const skill of ['normal', 'easy'] as const) {
      const sim = withAllies([{ godId: 'hades', skill }]);
      run(sim, 1);
      const bot = sim.state.players[1];
      // Keep the player beside it, so it has no other reason to move.
      const player = sim.state.players[0];
      player.x = player.px = bot.x + 30;
      player.y = player.py = bot.y;
      sim.state.hazards.push({
        id: sim.state.id(),
        kind: 'slam',
        shape: 'circle',
        x: bot.x,
        y: bot.y,
        radius: 120,
        x2: 0,
        y2: 0,
        width: 0,
        warn: 1.2,
        timer: 1.2,
        damage: 0,
        sourceId: 0,
        dead: false,
      });
      const hazard = sim.state.hazards[0];
      run(sim, 1.1);
      const outside = Math.hypot(bot.x - hazard.x, bot.y - hazard.y) > hazard.radius;
      expect(outside, skill).toBe(skill === 'normal');
    }
  });

  it('plays the same way for the same run (D5)', () => {
    const play = () => {
      const sim = withAllies(
        [
          { godId: 'hades', skill: 'hard' },
          { godId: 'poseidon', skill: 'normal' },
        ],
        { seed: 21, quiet: false },
      );
      sim.debug({ type: 'godMode', enabled: true });
      for (let i = 0; i < 60 * 60; i++) {
        if (sim.phase === 'choosing') sim.choose(0);
        sim.step(STEP, [autopilot(sim)]);
      }
      return sim.state.players.map((p) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        build: p.loadout.weapons.map((w) => `${w.def.id}:${w.level}`),
      }));
    };
    const a = play();
    expect(play()).toEqual(a);
    expect(a[1].build.length).toBeGreaterThan(1);
  }, 60_000);

  it('allies fight: they kill foes on their own', () => {
    const sim = withAllies([{ godId: 'hades', skill: 'hard' }], { seed: 5, quiet: false });
    sim.debug({ type: 'godMode', enabled: true });
    const bot = sim.state.players[1];
    run(sim, 60);
    const damage = bot.loadout.weapons.reduce((s, w) => s + w.damageDealt, 0);
    expect(damage).toBeGreaterThan(1000);
  }, 60_000);
});
