import { Rng } from '../core/rng';
import { validateContent } from '../data/content-index';
import { FUSION_CRESTS } from '../art/sprites';
import { CONTENT } from '../testing/content';
import { quietContent, quietSim, spawnNear } from '../testing/fixtures';
import { RunSimulation } from '../sim/run-simulation';
import { applyOffer, createWeapon, refreshPlayer } from './loadout';
import { hitEnemy } from '../combat/damage';
import { collect } from '../sim/pickups';
import { HitSource } from '../sim/types';

const strike: Omit<HitSource, 'ownerId'> = {
  weaponId: 'test',
  element: 'physical',
  damage: 1e9,
  critChance: 0,
  knockback: 0,
  effects: [],
  lifesteal: 0,
};
import { generateOffers, offerCandidates } from './offers';

const player = (sim: RunSimulation) => sim.state.players[0];
const give = (sim: RunSimulation, weaponId: string, level: number) => {
  const p = player(sim);
  const held = p.loadout.weapons.find((w) => w.def.id === weaponId);
  if (held) held.level = level;
  else {
    const w = createWeapon(sim.state.index.weapon(weaponId), p.stats);
    w.level = level;
    p.loadout.weapons.push(w);
  }
};
const offered = (sim: RunSimulation, id: string) =>
  offerCandidates(sim.state, player(sim)).find((c) => c.offer.itemId === id)?.offer;
const combo = (sim: RunSimulation, id: string) => sim.hud().build.tree.find((c) => c.id === id);

/** Every weapon (evolved), armour, relic and skill of the god at its top: only fusions and ascensions are left. */
function maxEverything(sim: RunSimulation) {
  const p = player(sim);
  const content = sim.state.index.content;
  p.loadout.weapons.length = 0;
  for (const def of content.weapons.filter((w) => !w.gods || w.gods.includes(p.god.id)).slice(0, 6))
    give(sim, def.id, def.levels.length + 1);
  const armour = content.armour[0];
  p.loadout.armour = { def: armour, level: armour.levels.length };
  p.loadout.relics = content.relics.slice(0, 4);
  for (const skill of content.skills) p.loadout.skills.set(skill.id, skill.maxLevel);
  for (const w of p.loadout.weapons)
    w.evolution = content.evolutions.find((e) => e.weapon === w.def.id);
}

describe('fusions (spec: run-progression / fusions)', () => {
  it('the content tree is valid', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('offers Forge of Hephaestus only with both weapons at level 6', () => {
    const sim = quietSim();
    give(sim, 'flaming_sword', 6);
    give(sim, 'war_hammer', 5);
    expect(offered(sim, 'forge_of_hephaestus')).toBeUndefined();
    expect(combo(sim, 'forge_of_hephaestus')?.state).toBe('locked');
    const hammer = combo(sim, 'forge_of_hephaestus')?.needs.find((n) => n.name === 'War Hammer');
    expect(hammer).toMatchObject({ have: 5, need: 6, met: false });

    give(sim, 'war_hammer', 6);
    expect(offered(sim, 'forge_of_hephaestus')?.kind).toBe('fusion');
    expect(combo(sim, 'forge_of_hephaestus')?.state).toBe('ready');
  });

  it('raises its level per pick, stacks its bonus and stops at the top', () => {
    const sim = quietSim();
    give(sim, 'flaming_sword', 6);
    give(sim, 'war_hammer', 6);
    const p = player(sim);
    const fire = p.stats.fireDamage;
    for (let i = 0; i < 3; i++) {
      const offer = offered(sim, 'forge_of_hephaestus');
      if (!offer) throw new Error('not offered');
      applyOffer(sim.state, p, offer);
    }
    expect(p.loadout.fusions.get('forge_of_hephaestus')).toBe(3);
    expect(p.stats.fireDamage).toBeCloseTo(fire + 0.45);
    expect(offered(sim, 'forge_of_hephaestus')).toBeUndefined();
    expect(combo(sim, 'forge_of_hephaestus')?.state).toBe('maxed');
  });

  it('opens a higher tier only with the tier below at its top', () => {
    const sim = quietSim();
    const p = player(sim);
    p.loadout.fusions.set('forge_of_hephaestus', 3);
    p.loadout.fusions.set('hunters_volley', 2);
    expect(offered(sim, 'wrath_of_the_twelve')).toBeUndefined();
    p.loadout.fusions.set('hunters_volley', 3);
    expect(offered(sim, 'wrath_of_the_twelve')?.level).toBe(1);
  });

  it('never offers nor shows another god’s fusion', () => {
    const sim = quietSim({ godId: 'hades' });
    expect(combo(sim, 'sky_father')).toBeUndefined();
    expect(combo(sim, 'lord_of_the_dead')).toBeDefined();
    const zeus = quietSim({ godId: 'zeus' });
    expect(combo(zeus, 'sky_father')).toBeDefined();
    expect(combo(zeus, 'lord_of_the_dead')).toBeUndefined();
  });

  it('names what an offer counts toward', () => {
    const sim = quietSim();
    give(sim, 'war_hammer', 2);
    const offer = offered(sim, 'war_hammer');
    expect(offer?.parts).toContain('Forge of Hephaestus');
  });
});

describe('ascensions (spec: run-progression / ascensions)', () => {
  it('are not offered while plenty of other upgrades remain', () => {
    const sim = quietSim();
    expect(offerCandidates(sim.state, player(sim)).some((c) => c.offer.kind === 'ascension')).toBe(
      false,
    );
  });

  it('fill the choice when everything else is at its top, without end', () => {
    const sim = quietSim();
    maxEverything(sim);
    for (const f of sim.state.index.content.fusions)
      player(sim).loadout.fusions.set(f.id, f.maxLevel);
    const offers = generateOffers(sim.state, player(sim), new Rng(3));
    expect(offers.map((o) => o.kind)).toEqual(['ascension', 'ascension', 'ascension']);
    const p = player(sim);
    refreshPlayer(sim.state, p);
    const might = p.stats.might;
    const ascend = offerCandidates(sim.state, p).find((c) => c.offer.itemId === 'ascend_might');
    if (!ascend) throw new Error('not offered');
    for (let i = 0; i < 50; i++) applyOffer(sim.state, p, { ...ascend.offer });
    expect(p.loadout.ascensions.get('ascend_might')).toBe(50);
    expect(p.stats.might).toBeCloseTo(might + 2.5);
    expect(sim.hud().build.ascensions[0]).toMatchObject({ id: 'ascend_might', level: 50 });
  });

  it('heal and gold remain for content without ascensions', () => {
    const sim = quietSim({ content: { ...quietContent(), ascensions: [], fusions: [] } });
    maxEverything(sim);
    const offers = generateOffers(sim.state, player(sim), new Rng(1));
    expect(offers.map((o) => o.kind)).toEqual(['heal', 'gold']);
  });
});

describe('fusion crests and fanfare (spec: run-progression / fusion crests and fanfare)', () => {
  it('gives every fusion a crest with one pip per tier', () => {
    for (const f of CONTENT.fusions) {
      expect(FUSION_CRESTS[f.visual.sprite], f.id).toBeDefined();
      expect(FUSION_CRESTS[f.visual.sprite].tier, f.id).toBe(f.tier);
    }
  });

  it('announces a fusion with its tier at the first level only', () => {
    const sim = quietSim();
    give(sim, 'flaming_sword', 6);
    give(sim, 'war_hammer', 6);
    const p = player(sim);
    const take = () => {
      const offer = offered(sim, 'forge_of_hephaestus');
      if (!offer) throw new Error('not offered');
      applyOffer(sim.state, p, offer);
      const taken = sim.state.events.filter((e) => e.type === 'fusionTaken');
      sim.state.events.length = 0;
      return taken;
    };
    expect(take()).toEqual([
      expect.objectContaining({ type: 'fusionTaken', id: 'forge_of_hephaestus', tier: 1 }),
    ]);
    expect(take()).toEqual([]);
  });
});

describe('event items (spec: seasonal-events / event items)', () => {
  const eventOffers = (eventId?: string) => {
    const sim = new RunSimulation(
      { runId: 'e', godId: 'zeus', realmId: 'mount_olympus', seed: 1, modifiers: [], eventId },
      quietContent(),
    );
    return offerCandidates(sim.state, player(sim)).map((c) => c.offer.itemId);
  };

  it('offers Hecate’s items only in runs of her event', () => {
    expect(eventOffers()).not.toContain('hecates_torches');
    expect(eventOffers()).not.toContain('key_of_hecate');
    expect(eventOffers('night_of_hecate')).toContain('hecates_torches');
    expect(eventOffers('night_of_hecate')).toContain('key_of_hecate');
  });

  it('offers every event’s items only in its own runs', () => {
    const outside = eventOffers();
    for (const event of CONTENT.events) {
      const items = [...CONTENT.weapons, ...CONTENT.relics].filter((i) => i.event === event.id);
      expect(items.length, event.id).toBeGreaterThan(0);
      const inside = eventOffers(event.id);
      for (const item of items) {
        expect(outside, item.id).not.toContain(item.id);
        expect(inside, item.id).toContain(item.id);
      }
    }
  });
});

describe('event currency (spec: seasonal-events / event currency)', () => {
  const run = (eventId?: string, unlocked?: string[]) =>
    new RunSimulation(
      {
        runId: 'c',
        godId: 'zeus',
        realmId: 'mount_olympus',
        seed: 2,
        modifiers: [],
        eventId,
        unlocked,
      },
      quietContent(),
    );

  it('drops honey cakes only in event runs: from elites always, and they are collected', () => {
    for (const [eventId, expected] of [
      [undefined, 0],
      ['night_of_hecate', 3],
    ] as const) {
      const sim = run(eventId);
      const elite = spawnNear(sim, 'satyr', 60, 0, { elite: true });
      hitEnemy(sim.state, elite, { ...strike, ownerId: player(sim).id }, 0, 0);
      const tokens = sim.state.pickups.filter((p) => p.kind === 'token' && !p.dead);
      expect(tokens.reduce((n, p) => n + p.value, 0)).toBe(expected);
      for (const t of tokens) collect(sim.state, player(sim), t);
      expect(sim.state.tokens).toBe(expected);
    }
  });

  it('offers an unlocked event item outside its event', () => {
    const sim = run(undefined, ['hecates_torches']);
    const ids = offerCandidates(sim.state, player(sim)).map((c) => c.offer.itemId);
    expect(ids).toContain('hecates_torches');
  });
});
