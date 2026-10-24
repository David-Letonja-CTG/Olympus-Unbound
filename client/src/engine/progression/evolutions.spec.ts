import { quietSim, spawnNear } from '../testing/fixtures';
import { hitEnemy } from '../combat/damage';
import { hitSource } from '../weapons/behaviors';
import { RunSimulation } from '../sim/run-simulation';
import { applyOffer, createWeapon, refreshPlayer } from './loadout';
import { offerCandidates } from './offers';

const player = (sim: RunSimulation) => sim.state.players[0];
const relic = (sim: RunSimulation, id: string) => {
  const def = sim.state.index.relics.get(id);
  if (def) player(sim).loadout.relics.push(def);
};
const spear = (sim: RunSimulation) =>
  player(sim).loadout.weapons.find((w) => w.def.id === 'thunder_spear')!;
const offered = (sim: RunSimulation, id: string) =>
  offerCandidates(sim.state, player(sim)).find((c) => c.offer.itemId === id)?.offer;

/** Zeus's spear at `level` with Zeus's Eye held. */
function ready(level = 6) {
  const sim = quietSim();
  spear(sim).level = level;
  relic(sim, 'zeus_eye');
  refreshPlayer(sim.state, player(sim));
  return sim;
}

function evolve(sim: RunSimulation) {
  const offer = offered(sim, 'spear_of_olympus');
  if (!offer) throw new Error('not offered');
  applyOffer(sim.state, player(sim), offer);
}

describe('weapon evolutions (spec: run-progression / weapon evolutions)', () => {
  it('offers the Spear of Olympus only at the top level with Zeus’s Eye', () => {
    expect(offered(ready(5), 'spear_of_olympus')).toBeUndefined();
    const noRelic = quietSim();
    spear(noRelic).level = 6;
    expect(offered(noRelic, 'spear_of_olympus')).toBeUndefined();
    expect(offered(ready(6), 'spear_of_olympus')?.kind).toBe('evolution');
  });

  it('transforms the weapon once: new name, more damage, a splash, the same identity', () => {
    const sim = ready();
    const before = spear(sim).stats.damage;
    evolve(sim);
    const evolved = spear(sim);
    expect(evolved.evolution?.id).toBe('spear_of_olympus');
    expect(evolved.stats.damage).toBeGreaterThan(before);
    expect(hitSource(player(sim), evolved).splash?.fraction).toBe(0.5);
    expect(sim.hud().weapons[0]).toMatchObject({ id: 'thunder_spear', name: 'Spear of Olympus' });
    expect(offered(sim, 'spear_of_olympus')).toBeUndefined();
    const entry = sim.hud().build.tree.find((c) => c.id === 'spear_of_olympus');
    expect(entry?.kind).toBe('evolution');
    expect(entry?.level).toBe(1);
  });

  it('keeps counting for fusions after evolving', () => {
    const sim = quietSim();
    const p = player(sim);
    for (const id of ['war_hammer', 'flaming_sword']) {
      const w = createWeapon(sim.state.index.weapon(id), p.stats);
      w.level = 6;
      p.loadout.weapons.push(w);
    }
    relic(sim, 'golden_fleece');
    const evo = offered(sim, 'hammer_of_hephaestus');
    if (!evo) throw new Error('not offered');
    applyOffer(sim.state, p, evo);
    expect(offered(sim, 'forge_of_hephaestus')?.kind).toBe('fusion');
  });

  it('never shows another god’s evolution', () => {
    const zeus = quietSim({ godId: 'zeus' })
      .hud()
      .build.tree.map((c) => c.id);
    expect(zeus).toContain('keraunos');
    expect(zeus).not.toContain('bident_of_tartarus');
  });

  it('names the evolution an item counts toward', () => {
    const sim = quietSim();
    spear(sim).level = 6;
    const eye = offerCandidates(sim.state, player(sim)).find((c) => c.offer.itemId === 'zeus_eye');
    expect(eye?.offer.parts).toContain('Spear of Olympus');
  });
});

describe('splash on hit (spec: combat / splash on hit)', () => {
  it('strikes the foes round the target once, never again from the burst', () => {
    const sim = ready();
    evolve(sim);
    const target = spawnNear(sim, 'satyr', 200, 0);
    const near = spawnNear(sim, 'satyr', 230, 0);
    const far = spawnNear(sim, 'satyr', 400, 0);
    for (const e of [target, near, far]) e.health = e.maxHealth = 1e6;
    sim.state.events.length = 0;
    hitEnemy(sim.state, target, hitSource(player(sim), spear(sim)), player(sim).x, player(sim).y);
    expect(near.health).toBeLessThan(1e6);
    expect(far.health).toBe(1e6);
    // One burst for the one hit: the burst's own strikes do not burst again.
    expect(sim.state.events.filter((e) => e.type === 'splash')).toHaveLength(1);
  });
});
