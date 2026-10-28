import { ContentIndex } from '../data/content-index';
import { decodeSnapshot, encodeSnapshot } from '../net/snapshot';
import { runFiles } from '../data/run-files';
import { CONTENT } from '../testing/content';
import { quietSim } from '../testing/fixtures';
import { playerLook } from './look';
import { RunSimulation } from './run-simulation';
import { Loadout, WeaponInstance } from './types';

const armour = (id: string, level: number) => ({
  def: CONTENT.armour.find((a) => a.id === id)!,
  level,
});
const weapon = (id: string, level: number, evolved = false) =>
  ({
    def: CONTENT.weapons.find((w) => w.id === id)!,
    level,
    evolution: evolved ? CONTENT.evolutions.find((e) => e.weapon === id) : undefined,
  }) as WeaponInstance;
const loadout = (parts: Partial<Loadout>): Pick<Loadout, 'weapons' | 'armour' | 'relics'> => ({
  weapons: [],
  relics: [],
  ...parts,
});

// spec: god-appearance
describe('a god’s look', () => {
  it('follows the armour: bare, look 1 at level 1, look 2 from level 2, look 3 at the last level', () => {
    expect(playerLook(loadout({})).look).toBe(0);
    const aegis = CONTENT.armour.find((a) => a.id === 'aegis_of_olympus')!;
    expect(aegis.levels).toHaveLength(3);
    expect(playerLook(loadout({ armour: armour('aegis_of_olympus', 1) })).look).toBe(1);
    expect(playerLook(loadout({ armour: armour('aegis_of_olympus', 2) })).look).toBe(2);
    const full = playerLook(loadout({ armour: armour('aegis_of_olympus', 3) }));
    expect(full.look).toBe(3);
    expect(full.armourColor).toBe(aegis.visual.color);
  });

  it('holds the strongest weapon, the one taken first on a tie, and its evolution’s colour', () => {
    expect(
      playerLook(loadout({ weapons: [weapon('thunder_spear', 3), weapon('divine_bow', 5)] }))
        .weapon,
    ).toBe('divine_bow');
    expect(
      playerLook(loadout({ weapons: [weapon('thunder_spear', 4), weapon('war_hammer', 4)] }))
        .weapon,
    ).toBe('thunder_spear');
    const evolved = playerLook(loadout({ weapons: [weapon('thunderbolt', 8, true)] }));
    expect(evolved.evolutionColor).toBe(
      CONTENT.evolutions.find((e) => e.weapon === 'thunderbolt')!.visual.color,
    );
    expect(playerLook(loadout({})).weapon).toBeUndefined();
  });

  it('shows at most six relic motes', () => {
    const relics = CONTENT.relics.slice(0, 7);
    expect(relics).toHaveLength(7);
    expect(playerLook(loadout({ relics })).relicColors).toHaveLength(6);
  });

  it('reaches a room guest as the host derives it (spec: co-op / seeing each other’s gear)', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    p.loadout.armour = armour('aegis_of_olympus', 3);
    p.loadout.relics.push(CONTENT.relics[0]);
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), new ContentIndex(CONTENT));
    expect(snap.players[0].gear).toEqual(playerLook(p.loadout));
  });
});

// spec: asset-pipeline / character sheets load with the run
describe('the sheets a run loads up front', () => {
  it('are its gods with their gear and its realm’s monsters, not the other gods', () => {
    const hades = CONTENT.gods.find((g) => g.id === 'hades')!;
    const realm = CONTENT.realms.find((r) => r.id === 'mount_olympus')!;
    const wanted = runFiles(CONTENT, realm, [hades]);
    const file = (id: string) => CONTENT.assets.files.find((f) => f.id === id)!;
    expect(wanted(file('hades_body'))).toBe(true);
    expect(wanted(file('armour_hero_2'))).toBe(true);
    expect(wanted(file('weapon_hero_bident'))).toBe(true);
    expect(wanted(file('zeus_body'))).toBe(false);
    expect(wanted(file('weapon_heroine_bident'))).toBe(false);
    expect(wanted(file('cyclops'))).toBe(true);
    expect(wanted(file('hydra'))).toBe(false);
  });
});

describe('a player’s skin and crown (spec: co-op / seeing each other’s gear)', () => {
  it('reach a guest through the snapshot', () => {
    const sim = new RunSimulation(
      {
        runId: 'skin',
        godId: 'hades',
        realmId: 'mount_olympus',
        seed: 1,
        modifiers: [],
        skin: 'hades_shroud',
        crown: 'laurel',
      },
      CONTENT,
    );
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), new ContentIndex(CONTENT));
    expect(snap.players[0].skin).toBe('hades_shroud');
    expect(snap.players[0].crown).toBe('laurel');
  });
});

describe('a skinned figure (spec: god-appearance / skins, boss trophies)', () => {
  it('keeps the head positions its crown sits on', () => {
    const base = CONTENT.assets.sprites['hades_body'];
    const skinned = CONTENT.assets.sprites['hades_body@hades_shroud'];
    expect(base.heads).toHaveLength(64);
    expect(skinned.heads).toEqual(base.heads);
    expect(skinned.recolor).toBe(CONTENT.skins.find((s) => s.id === 'hades_shroud')?.recolor);
  });
});

describe('skins in event shops (spec: seasonal-events / skins in event shops)', () => {
  it('sells one skin in every event’s shop, three for each god', () => {
    for (const event of CONTENT.events)
      expect(
        CONTENT.eventRewards.filter((r) => r.event === event.id && r.effect.type === 'skin'),
      ).toHaveLength(1);
    const sold = CONTENT.skins.filter((s) => 'eventReward' in s.unlock);
    for (const god of CONTENT.gods) expect(sold.filter((s) => s.god === god.id)).toHaveLength(3);
  });
});
