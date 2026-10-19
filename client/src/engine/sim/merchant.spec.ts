import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT, PlayerInput, UpgradeChoice } from './types';

const steps = (sim: RunSimulation, n: number, input: PlayerInput = NO_INPUT) => {
  for (let i = 0; i < n; i++) sim.step(STEP, [input]);
};

/** Runs the realm's clock up to the merchant's first arrival. */
function arrive(sim: RunSimulation) {
  sim.state.realmTime = sim.state.balance.merchant.arrivals[0] - STEP / 2;
  steps(sim, 1);
  const merchant = sim.state.merchant;
  if (!merchant) throw new Error('The merchant did not arrive.');
  return merchant;
}

/** Puts the god in the merchant's ring and steps once: the shop opens. */
function stepIn(sim: RunSimulation): UpgradeChoice {
  const p = sim.state.players[0];
  const m = sim.state.merchant!;
  p.x = p.px = m.x;
  p.y = p.py = m.y;
  steps(sim, 1);
  const choice = sim.currentChoice;
  if (choice?.source !== 'shop') throw new Error('The shop did not open.');
  return choice;
}

const index = (choice: UpgradeChoice, itemId: string, target?: string) =>
  choice.offers.findIndex(
    (o) => o.itemId === itemId && (target === undefined || o.target === target),
  );
const leave = (choice: UpgradeChoice) => choice.offers.findIndex((o) => o.kind === 'leave');

describe("the merchant's visits (spec: merchant / the merchant's visits)", () => {
  it('arrives at 2:30 of the realm, is announced, and leaves 75 seconds later', () => {
    const sim = quietSim();
    const m = arrive(sim);
    const events = sim.events();
    expect(events.some((e) => e.type === 'merchantArrived')).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'announcement',
        text: 'A wandering merchant has arrived nearby',
      }),
    );
    const p = sim.state.players[0];
    expect(Math.hypot(m.x - p.x, m.y - p.y)).toBeGreaterThan(200);
    expect(sim.hud().merchant?.leavesIn).toBeCloseTo(75, 0);
    steps(sim, 75 * 60 + 2);
    expect(sim.state.merchant).toBeUndefined();
    expect(sim.events().some((e) => e.type === 'merchantLeft')).toBe(true);
  });

  it('appears at the same place for the same seed', () => {
    const a = arrive(quietSim({ seed: 9 }));
    const b = arrive(quietSim({ seed: 9 }));
    expect([a.x, a.y]).toEqual([b.x, b.y]);
  });
});

describe('the shop (spec: merchant / the shop)', () => {
  it('sells a companion from the run gold and shows the shop again without it', () => {
    const sim = quietSim();
    arrive(sim);
    sim.state.gold = 300;
    const shop = stepIn(sim);
    expect(sim.phase).toBe('choosing');
    expect(shop.gold).toBe(300);
    expect(sim.choose(index(shop, 'eagle_of_zeus'), shop.id)).toBe(true);
    expect(sim.state.gold).toBe(150);
    expect(sim.state.companions.map((c) => c.def.id)).toEqual(['eagle_of_zeus']);
    const again = sim.currentChoice!;
    expect(again.source).toBe('shop');
    expect(index(again, 'eagle_of_zeus')).toBe(-1);
    expect(sim.hud().companions.map((c) => c.id)).toEqual(['eagle_of_zeus']);
  });

  it('does not sell what the party cannot afford', () => {
    const sim = quietSim();
    arrive(sim);
    sim.state.gold = 40;
    const shop = stepIn(sim);
    expect(sim.choose(index(shop, 'whetstone'), shop.id)).toBe(false);
    expect(sim.state.gold).toBe(40);
    expect(sim.currentChoice?.id).toBe(shop.id);
  });

  it('opens again only after stepping out and back in', () => {
    const sim = quietSim();
    arrive(sim);
    const shop = stepIn(sim);
    sim.choose(leave(shop), shop.id);
    expect(sim.phase).toBe('playing');
    steps(sim, 30);
    expect(sim.phase).toBe('playing');
    const p = sim.state.players[0];
    p.x = p.px = p.x + 400;
    steps(sim, 1);
    expect(stepIn(sim).source).toBe('shop');
  });

  it('raises prices with every realm cleared', () => {
    const sim = quietSim();
    sim.state.depth = 2;
    arrive(sim);
    const shop = stepIn(sim);
    expect(shop.offers[index(shop, 'eagle_of_zeus')].price).toBe(300);
  });
});

describe('wares (spec: merchant / wares)', () => {
  it('offers a whetstone per weapon below its maximum, and levels the chosen one', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    sim.state.gold = 1000;
    const spear = p.loadout.weapons[0];
    spear.level = 2;
    p.loadout.weapons.push({ ...spear, def: sim.state.index.weapon('divine_bow'), level: 6 });
    arrive(sim);
    const shop = stepIn(sim);
    const stones = shop.offers.filter((o) => o.itemId === 'whetstone');
    expect(stones.map((o) => o.target)).toEqual(['thunder_spear']);
    expect(stones[0].name).toContain('Thunder Spear');
    expect(stones[0].level).toBe(3);
    sim.choose(index(shop, 'whetstone', 'thunder_spear'), shop.id);
    expect(spear.level).toBe(3);
  });

  it('offers ambrosia only to the hurt', () => {
    const sim = quietSim();
    arrive(sim);
    let shop = stepIn(sim);
    expect(index(shop, 'ambrosia_flask')).toBe(-1);
    sim.choose(leave(shop), shop.id);
    const p = sim.state.players[0];
    p.health = p.stats.maxHealth / 2;
    p.x = p.px = p.x + 400;
    steps(sim, 1);
    sim.state.gold = 500;
    shop = stepIn(sim);
    expect(sim.choose(index(shop, 'ambrosia_flask'), shop.id)).toBe(true);
    expect(p.health).toBeCloseTo(p.stats.maxHealth * 0.9, 0);
  });
});

describe('companions (spec: merchant / companions)', () => {
  function withCompanion(id: string) {
    const sim = quietSim();
    disarm(sim);
    arrive(sim);
    sim.state.gold = 1000;
    const shop = stepIn(sim);
    sim.choose(index(shop, id), shop.id);
    sim.choose(leave(sim.currentChoice!), sim.currentChoice!.id);
    expect(sim.phase).toBe('playing');
    return sim;
  }

  it('the hound runs to an enemy and bites and burns it, as its god', () => {
    const sim = withCompanion('hound_of_the_underworld');
    steps(sim, 60);
    const enemy = spawnNear(sim, 'satyr', 220, 0);
    enemy.health = enemy.maxHealth = 10_000;
    steps(sim, 120);
    expect(enemy.health).toBeLessThan(10_000);
    expect(enemy.status.burn).toBeGreaterThan(0);
    const hits = sim.events().filter((e) => e.type === 'hit');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('the serpent heals its god', () => {
    const sim = withCompanion('temple_serpent');
    const p = sim.state.players[0];
    p.health = 50;
    steps(sim, 600);
    expect(p.health).toBeGreaterThanOrEqual(64);
  });

  it('keeps at most three, one of each', () => {
    const sim = quietSim();
    arrive(sim);
    sim.state.gold = 10_000;
    let shop = stepIn(sim);
    for (const id of ['eagle_of_zeus', 'hound_of_the_underworld', 'temple_serpent']) {
      sim.choose(index(shop, id), shop.id);
      shop = sim.currentChoice!;
    }
    expect(sim.state.companions).toHaveLength(3);
    expect(shop.offers.some((o) => sim.state.index.companions.has(o.itemId))).toBe(false);
  });

  it('follows its god through the gate', () => {
    const sim = withCompanion('eagle_of_zeus');
    sim.debug({ type: 'travel' });
    const p = sim.state.players[0];
    const c = sim.state.companions[0];
    expect(sim.state.depth).toBe(1);
    expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(120);
  });
});
