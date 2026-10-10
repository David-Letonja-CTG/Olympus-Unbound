import { Rng } from '../core/rng';
import { quietSim } from '../testing/fixtures';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { NO_INPUT, UpgradeOffer } from '../sim/types';
import { applyOffer, createWeapon } from './loadout';
import { generateOffers, offerCandidates } from './offers';

const player = (sim: RunSimulation) => sim.state.players[0];
const give = (sim: RunSimulation, weaponId: string, level = 1) => {
  const w = createWeapon(sim.state.index.weapon(weaponId), player(sim).stats);
  w.level = level;
  player(sim).loadout.weapons.push(w);
};

describe('XP and levels', () => {
  it('carries excess XP over to the next level', () => {
    const sim = quietSim();
    expect(sim.state.xpToNext(1)).toBe(5);
    sim.state.addXp(7);
    expect(sim.state.level).toBe(2);
    expect(sim.state.xp).toBe(2);
  });

  it('gives one choice per level when several levels are gained at once', () => {
    const sim = quietSim();
    sim.state.addXp(sim.state.xpToNext(1) + sim.state.xpToNext(2));
    sim.step(STEP, [NO_INPUT]);
    expect(sim.phase).toBe('choosing');
    expect(sim.currentChoice?.level).toBe(2);
    sim.choose(0);
    expect(sim.phase).toBe('choosing');
    expect(sim.currentChoice?.level).toBe(3);
    sim.choose(0);
    expect(sim.phase).toBe('playing');
  });
});

describe('level-up offers', () => {
  it('offers three different, valid upgrades', () => {
    const sim = quietSim();
    const offers = generateOffers(sim.state, player(sim), new Rng(1));
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => `${o.kind}:${o.itemId}`)).size).toBe(3);
  });

  it('applying a weapon level raises it and resumes play', () => {
    const sim = quietSim();
    sim.state.addXp(5);
    sim.step(STEP, [NO_INPUT]);
    const choice = sim.currentChoice;
    if (!choice) throw new Error('no choice');
    const offer: UpgradeOffer = {
      ...choice.offers[0],
      kind: 'weaponLevel',
      itemId: 'thunder_spear',
    };
    (choice.offers as UpgradeOffer[])[0] = offer;
    expect(sim.choose(0)).toBe(true);
    expect(player(sim).loadout.weapons[0].level).toBe(2);
    expect(sim.phase).toBe('playing');
  });

  it('never offers maxed weapons or new weapons when all slots are full', () => {
    const sim = quietSim();
    const p = player(sim);
    p.loadout.weapons[0].level = p.loadout.weapons[0].def.levels.length + 1;
    for (const id of ['divine_bow', 'trident', 'lightning_orb', 'war_hammer', 'flaming_sword'])
      give(sim, id);
    const kinds = offerCandidates(sim.state, p).map((c) => c.offer);
    expect(kinds.some((o) => o.kind === 'newWeapon')).toBe(false);
    expect(kinds.some((o) => o.kind === 'weaponLevel' && o.itemId === 'thunder_spear')).toBe(false);
  });

  it('offers healing and gold when nothing else is valid', () => {
    const sim = quietSim();
    const content = sim.state.index.content;
    const p = player(sim);
    p.loadout.weapons.length = 0;
    for (const def of content.weapons.slice(0, 6)) {
      const w = createWeapon(def, p.stats);
      w.level = def.levels.length + 1;
      p.loadout.weapons.push(w);
    }
    const armour = content.armour[0];
    p.loadout.armour = { def: armour, level: armour.levels.length };
    p.loadout.relics = content.relics.slice(0, 4);
    for (const skill of content.skills) p.loadout.skills.set(skill.id, skill.maxLevel);
    const offers = generateOffers(sim.state, p, new Rng(1));
    expect(offers.map((o) => o.kind)).toEqual(['heal', 'gold']);
  });

  it('wears one armour: others are not offered, levelling it is', () => {
    const sim = quietSim();
    const p = player(sim);
    applyOffer(sim.state, p, {
      kind: 'armour',
      itemId: 'aegis_of_olympus',
      name: '',
      description: '',
      level: 1,
      maxLevel: 3,
      sprite: '',
      color: 0,
    });
    const offers = offerCandidates(sim.state, p).map((c) => c.offer);
    expect(offers.filter((o) => o.kind === 'armour')).toHaveLength(0);
    expect(offers.some((o) => o.kind === 'armourLevel' && o.itemId === 'aegis_of_olympus')).toBe(
      true,
    );
    expect(p.stats.armor).toBe(2);
  });

  it('only offers element skills for elements the player wields', () => {
    const sim = quietSim();
    const ids = () => offerCandidates(sim.state, player(sim)).map((c) => c.offer.itemId);
    expect(ids()).not.toContain('fury_of_flames');
    expect(ids()).toContain('storm_caller');
    give(sim, 'flaming_sword');
    expect(ids()).toContain('fury_of_flames');
  });

  it('weights items of the build’s elements up', () => {
    const sim = quietSim();
    const weight = (id: string) =>
      offerCandidates(sim.state, player(sim)).find((c) => c.offer.itemId === id)?.weight ?? 0;
    expect(weight('thunderbolt')).toBeGreaterThan(weight('war_hammer'));
  });

  it('multishot adds a projectile to projectile weapons', () => {
    const sim = quietSim();
    const spear = player(sim).loadout.weapons[0];
    const before = spear.stats.amount;
    applyOffer(sim.state, player(sim), {
      kind: 'skill',
      itemId: 'multishot',
      name: '',
      description: '',
      level: 1,
      maxLevel: 2,
      sprite: '',
      color: 0,
    });
    expect(spear.stats.amount).toBe(before + 1);
  });
});

describe('synergies', () => {
  it('activates Storm once when its requirements are met', () => {
    const sim = quietSim();
    const p = player(sim);
    const relic = (id: string): UpgradeOffer => ({
      kind: 'relic',
      itemId: id,
      name: '',
      description: '',
      level: 1,
      maxLevel: 1,
      sprite: '',
      color: 0,
    });
    const weapon = (id: string): UpgradeOffer => ({
      kind: 'newWeapon',
      itemId: id,
      name: '',
      description: '',
      level: 1,
      maxLevel: 6,
      sprite: '',
      color: 0,
    });
    const lightningBefore = p.stats.lightningDamage;
    applyOffer(sim.state, p, relic('zeus_eye'));
    expect(p.loadout.synergies).toHaveLength(0);
    applyOffer(sim.state, p, weapon('thunderbolt'));
    expect(p.loadout.synergies.map((s) => s.id)).toEqual(['storm']);
    expect(p.stats.lightningDamage).toBeCloseTo(lightningBefore + 0.25);
    expect(p.stats.chains).toBe(1);
    applyOffer(sim.state, p, weapon('lightning_orb'));
    expect(sim.events().filter((e) => e.type === 'synergy')).toHaveLength(1);
  });
});

describe('treasure chests', () => {
  it('offer a choice without granting a level', () => {
    const sim = quietSim();
    const p = player(sim);
    sim.state.spawnPickup('chest', p.x + 5, p.y, 1);
    sim.step(STEP, [NO_INPUT]);
    expect(sim.phase).toBe('choosing');
    expect(sim.currentChoice?.source).toBe('chest');
    expect(sim.state.level).toBe(1);
    sim.choose(1);
    expect(sim.phase).toBe('playing');
  });
});
