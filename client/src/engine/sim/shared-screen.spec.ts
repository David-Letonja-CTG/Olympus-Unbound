import { LocalDriver } from '../net/driver';
import { quietContent } from '../testing/fixtures';
import { RunSimulation, STEP } from './run-simulation';
import { PartySeat } from './run-state';
import { maxSpread } from './shared-screen';
import { NO_INPUT, PlayerInput } from './types';

const seat = (godId: string, name: string, bot = false): PartySeat => ({
  godId,
  name,
  modifiers: [],
  ...(bot ? { bot: { skill: 'normal' as const } } : {}),
});

function sharedRun(seats: readonly PartySeat[], sharedScreen = true) {
  const sim = new RunSimulation(
    {
      runId: 'local',
      godId: seats[0].godId,
      realmId: 'mount_olympus',
      seed: 7,
      modifiers: [],
      party: seats,
      sharedScreen,
    },
    quietContent(),
  );
  sim.setView(400, 240);
  return sim;
}

const walk = (moveX: number, moveY = 0): PlayerInput => ({ ...NO_INPUT, moveX, moveY });

/** Both gods stand at the spawn; then they walk apart along x for `seconds`. */
function walkApart(sim: RunSimulation, seconds: number, inputs = [walk(-1), walk(1)]) {
  const [a, b] = sim.state.players;
  const { x, y } = sim.state.arena.spawn;
  for (const p of [a, b]) {
    p.x = p.px = x;
    p.y = p.py = y;
  }
  for (let t = 0; t < seconds; t += STEP) sim.step(STEP, inputs);
  return Math.abs(b.x - a.x);
}

describe('local co-op on one screen (spec: co-op / local co-op on one screen)', () => {
  it('holds the gods within the zoomed-out view (framing the party)', () => {
    const sim = sharedRun([seat('zeus', 'Player 1'), seat('athena', 'Player 2')]);
    const limit = maxSpread(sim.state.view).x;
    expect(walkApart(sim, 6)).toBeLessThanOrEqual(limit + 1);
    // Without a shared screen they walk on.
    expect(walkApart(sharedRun(sim.state.party, false), 6)).toBeGreaterThan(limit + 50);
  });

  it('never drags a god: the one held back still walks back freely', () => {
    const sim = sharedRun([seat('zeus', 'Player 1'), seat('athena', 'Player 2')]);
    walkApart(sim, 6);
    const [a, b] = sim.state.players;
    const ax = a.x;
    const bx = b.x;
    // Player 1 stands while player 2 walks back toward them.
    for (let t = 0; t < 0.5; t += STEP) sim.step(STEP, [NO_INPUT, walk(-1)]);
    expect(a.x).toBe(ax);
    expect(b.x).toBeLessThan(bx);
  });

  it('does not hold bots or fallen gods', () => {
    const sim = sharedRun([seat('zeus', 'Player 1'), seat('athena', 'Bot', true)]);
    const limit = maxSpread(sim.state.view).x;
    const [, bot] = sim.state.players;
    bot.x = bot.px = sim.state.players[0].x + limit + 300;
    sim.step(STEP, [NO_INPUT]);
    expect(Math.abs(bot.x - sim.state.players[0].x)).toBeGreaterThan(limit);
  });

  it('gives each local player their own input and choices (taking turns at a level-up)', () => {
    const sim = sharedRun([
      seat('zeus', 'Player 1'),
      seat('athena', 'Player 2'),
      seat('hades', 'Bot', true),
    ]);
    const driver = new LocalDriver(sim, undefined, 2);
    driver.markLoaded();
    const [p1, p2] = sim.state.players;
    expect(driver.localIds).toEqual([p1.id, p2.id]);
    // Each local player's own HUD, in seat order (spec: hud / local players on the hud).
    expect(driver.huds().map((h) => h.party.find((m) => m.self)?.id)).toEqual([p1.id, p2.id]);
    const y = p2.y;
    driver.advance(0.5, [NO_INPUT, walk(0, 1)], () => undefined);
    expect(p2.y).toBeGreaterThan(y);

    sim.state.pendingLevels = 1;
    driver.advance(STEP, [NO_INPUT, NO_INPUT], () => undefined);
    const choices = driver.events().flatMap((e) => (e.type === 'choice' ? [e.choice] : []));
    // The bot has answered at once; both people's choices reach this screen.
    expect(choices.map((c) => c.playerId)).toEqual([p1.id, p2.id]);
    expect(driver.phase).toBe('choosing');
    const second = choices.find((c) => c.playerId === p2.id)!;
    driver.choose(second.id, 0);
    expect(sim.choiceFor(p2.id)).toBeUndefined();
    expect(driver.phase).toBe('choosing');
    driver.choose(choices.find((c) => c.playerId === p1.id)!.id, 0);
    expect(driver.phase).toBe('playing');
  });

  it('frames the living local gods for the camera', () => {
    const sim = sharedRun([seat('zeus', 'Player 1'), seat('athena', 'Player 2')]);
    const driver = new LocalDriver(sim, undefined, 2);
    const [a, b] = sim.state.players;
    a.x = a.px = 100;
    b.x = b.px = 500;
    a.y = a.py = b.y = b.py = 300;
    expect(driver.focus()).toEqual({ x: 300, y: 300 });
    expect(driver.spread()).toEqual({ x: 400, y: 0 });
    b.alive = false;
    expect(driver.spread()).toEqual({ x: 0, y: 0 });
    expect(driver.focus()).toEqual({ x: 100, y: 300 });
  });
});
