import { TestBed } from '@angular/core/testing';
import { CONTENT } from '../../../content';
import { RunResult } from '../../../engine';
import { Progression } from '../progression';
import { applyRunResult } from './rewards';
import { freshSave, parseSave, permanentModifiers, SAVE_VERSION } from './save-data';
import { SAVE_KEY, SAVE_STORAGE, SaveStore } from './save-store';

const result = (overrides: Partial<RunResult> = {}): RunResult => ({
  runId: 'run-1',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  outcome: 'victory',
  timeSeconds: 450,
  level: 20,
  kills: 900,
  gold: 180,
  bossDefeated: true,
  loadout: {
    weapons: [{ id: 'war_hammer', level: 3, damage: 1000 }],
    relics: ['zeus_eye'],
    skills: [],
    synergies: [],
  },
  ...overrides,
});

describe('parseSave', () => {
  it('starts fresh without a save', () => {
    expect(parseSave(null, CONTENT)).toEqual(freshSave());
  });

  it('starts fresh from corrupt JSON instead of crashing', () => {
    expect(parseSave('{not json', CONTENT)).toEqual(freshSave());
    expect(parseSave('[1,2]', CONTENT)).toEqual(freshSave());
  });

  it('keeps valid fields when another is missing', () => {
    const save = parseSave(JSON.stringify({ version: 1, gold: 500 }), CONTENT);
    expect(save.gold).toBe(500);
    expect(save.settings).toEqual(freshSave().settings);
  });

  it('drops unknown IDs and invalid values field by field', () => {
    const save = parseSave(
      JSON.stringify({
        version: 1,
        gold: -5,
        permanentUpgrades: { vitality: 2, removed_upgrade: 3, might: 99 },
        discovered: { weapons: ['war_hammer', 'old_sword', 7], relics: 'nope' },
        settings: { sfxVolume: 4, screenShake: false },
      }),
      CONTENT,
    );
    expect(save.gold).toBe(0);
    expect(save.permanentUpgrades).toEqual({ vitality: 2, might: 5 });
    expect(save.discovered.weapons).toEqual(['war_hammer']);
    expect(save.discovered.relics).toEqual([]);
    expect(save.settings.sfxVolume).toBe(freshSave().settings.sfxVolume);
    expect(save.settings.screenShake).toBe(false);
  });

  it('migrates an unversioned (version 0) save', () => {
    const save = parseSave(JSON.stringify({ gold: 42, stats: { runs: 3 } }), CONTENT);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.gold).toBe(42);
    expect(save.stats.runs).toBe(3);
  });

  it('does not misread a save from a newer version', () => {
    expect(parseSave(JSON.stringify({ version: SAVE_VERSION + 1, gold: 9 }), CONTENT)).toEqual(
      freshSave(),
    );
  });

  it('turns permanent upgrade levels into run modifiers', () => {
    const save = { ...freshSave(), permanentUpgrades: { vitality: 3 } };
    expect(permanentModifiers(save, CONTENT)).toEqual([
      { stat: 'maxHealth', flat: 30, percent: undefined },
    ]);
  });
});

describe('applyRunResult', () => {
  it('grants collected gold plus the victory bonus', () => {
    const { save, rewards } = applyRunResult(freshSave(), result(), CONTENT);
    expect(rewards.totalGold).toBe(430);
    expect(save.gold).toBe(430);
    expect(save.stats).toEqual({ runs: 1, victories: 1, kills: 900, bestTimeSeconds: 450 });
  });

  it('grants half the gold, rounded down, for an abandoned run', () => {
    const { rewards } = applyRunResult(
      freshSave(),
      result({ outcome: 'abandoned', gold: 75 }),
      CONTENT,
    );
    expect(rewards.totalGold).toBe(37);
  });

  it('grants nothing for the same run twice', () => {
    const once = applyRunResult(freshSave(), result(), CONTENT).save;
    const twice = applyRunResult(once, result(), CONTENT);
    expect(twice.rewards.alreadyProcessed).toBe(true);
    expect(twice.save.gold).toBe(430);
  });

  it('discovers held items once', () => {
    const { save, rewards } = applyRunResult(freshSave(), result(), CONTENT);
    expect(rewards.newlyDiscovered).toEqual([
      { kind: 'weapons', id: 'war_hammer' },
      { kind: 'relics', id: 'zeus_eye' },
    ]);
    const again = applyRunResult(save, result({ runId: 'run-2' }), CONTENT);
    expect(again.rewards.newlyDiscovered).toEqual([]);
  });
});

describe('SaveStore and Progression', () => {
  function setup(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    TestBed.configureTestingModule({ providers: [{ provide: SAVE_STORAGE, useValue: storage }] });
    return { store: TestBed.inject(SaveStore), progression: TestBed.inject(Progression) };
  }

  function memoryStorage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return {
      data,
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
    };
  }

  it('keeps progress in memory when storage throws', () => {
    const { progression, store } = setup({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    progression.recordRun(result());
    expect(progression.gold()).toBe(430);
    expect(store.load().gold).toBe(430);
  });

  it('buys a permanent upgrade, saves it, and applies it to the next run', () => {
    const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 1, gold: 200 }) });
    const { progression } = setup(storage);
    const vitality = CONTENT.permanentUpgrades.find((u) => u.id === 'vitality');
    if (!vitality) throw new Error('missing');
    expect(progression.buy(vitality)).toBe(true);
    expect(progression.gold()).toBe(100);
    expect(progression.level(vitality)).toBe(1);
    expect(JSON.parse(storage.data[SAVE_KEY]).permanentUpgrades).toEqual({ vitality: 1 });
    expect(progression.runModifiers()).toEqual([
      { stat: 'maxHealth', flat: 10, percent: undefined },
    ]);
  });

  it('refuses an upgrade the player cannot afford', () => {
    const { progression } = setup(
      memoryStorage({ [SAVE_KEY]: JSON.stringify({ version: 1, gold: 50 }) }),
    );
    const might = CONTENT.permanentUpgrades.find((u) => u.id === 'might');
    if (!might) throw new Error('missing');
    expect(progression.canBuy(might)).toBe(false);
    expect(progression.buy(might)).toBe(false);
    expect(progression.gold()).toBe(50);
  });

  it('persists settings changes', () => {
    const storage = memoryStorage();
    const { progression } = setup(storage);
    progression.updateSettings({ sfxVolume: 0 });
    expect(JSON.parse(storage.data[SAVE_KEY]).settings.sfxVolume).toBe(0);
  });
});
