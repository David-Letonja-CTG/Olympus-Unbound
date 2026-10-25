import { TestBed } from '@angular/core/testing';
import { CONTENT } from '../../../content';
import { RunResult } from '../../../engine';
import { isSoftwareRenderer } from '../graphics-quality';
import { Progression } from '../progression';
import { applyRunResult } from './rewards';
import {
  freshSave,
  MAX_PLAYER_NAME,
  parseSave,
  permanentModifiers,
  SAVE_VERSION,
} from './save-data';
import { SAVE_KEY, SAVE_STORAGE, SaveStore } from './save-store';

const result = (overrides: Partial<RunResult> = {}): RunResult => ({
  runId: 'run-1',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  outcome: 'defeat',
  timeSeconds: 450,
  level: 20,
  kills: 900,
  // 250 of it from the Cyclops: boss gold is part of the run's gold.
  gold: 430,
  realmsCleared: 1,
  realmReached: 'mount_olympus',
  players: 1,
  bots: 0,
  loadout: {
    weapons: [{ id: 'war_hammer', level: 3, damage: 1000 }],
    relics: ['zeus_eye'],
    skills: [],
    synergies: [],
    fusions: [],
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

/** Rewards without achievements or quests, so gold is the run's own. */
const plain = { ...CONTENT, achievements: [], dailyQuests: [] };
const NOW = new Date(2026, 9, 19, 12, 0, 0);
const apply = (save: ReturnType<typeof freshSave>, r: RunResult) =>
  applyRunResult(save, r, plain, NOW);

describe('applyRunResult', () => {
  it('grants the collected gold, boss gold included, and counts realms cleared', () => {
    const { save, rewards } = apply(freshSave(), result());
    expect(rewards.totalGold).toBe(430);
    expect(save.gold).toBe(430);
    expect(save.stats).toEqual({ runs: 1, victories: 1, kills: 900, bestTimeSeconds: 450 });
  });

  it('grants half the gold, rounded down, for an abandoned run', () => {
    const { rewards } = apply(freshSave(), result({ outcome: 'abandoned', gold: 75 }));
    expect(rewards.totalGold).toBe(37);
  });

  it('grants nothing for the same run twice', () => {
    const once = apply(freshSave(), result()).save;
    const twice = apply(once, result());
    expect(twice.rewards.alreadyProcessed).toBe(true);
    expect(twice.save.gold).toBe(430);
  });

  it('discovers held items once', () => {
    const { save, rewards } = apply(freshSave(), result());
    expect(rewards.newlyDiscovered).toEqual([
      { kind: 'weapons', id: 'war_hammer' },
      { kind: 'relics', id: 'zeus_eye' },
    ]);
    const again = apply(save, result({ runId: 'run-2' }));
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
    // The run's 430 gold, plus what its achievements and quests pay.
    const rewards = progression.recordRun(result(), NOW);
    expect(rewards.totalGold).toBeGreaterThanOrEqual(430);
    expect(progression.gold()).toBe(rewards.totalGold);
    expect(store.load().gold).toBe(rewards.totalGold);
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

  it("remembers the player's name, trimmed and cut to its length (spec: meta-progression)", () => {
    const storage = memoryStorage();
    const { progression } = setup(storage);
    progression.setPlayerName('  Ada of the very long name  ');
    expect(progression.playerName()).toBe('Ada of the very');
    expect(JSON.parse(storage.data[SAVE_KEY]).playerName).toBe('Ada of the very');
  });
});

describe('save format v9', () => {
  it('migrates a version 8 save with no name, keeping its progress', () => {
    const save = parseSave(JSON.stringify({ version: 8, gold: 120, introSeen: true }), CONTENT);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.playerName).toBe('');
    expect(save.gold).toBe(120);
    expect(save.introSeen).toBe(true);
  });

  it('keeps a saved name and drops one that is not text', () => {
    const parse = (playerName: unknown) =>
      parseSave(JSON.stringify({ version: 9, playerName }), CONTENT).playerName;
    expect(parse('Ada')).toBe('Ada');
    expect(parse(42)).toBe('');
    expect(parse('x'.repeat(40))).toHaveLength(MAX_PLAYER_NAME);
  });
});

describe('save format v2', () => {
  it('migrates a version 1 save, keeping progress, with the intro not yet seen', () => {
    const save = parseSave(
      JSON.stringify({ version: 1, gold: 300, permanentUpgrades: { vitality: 2 } }),
      CONTENT,
      'high',
    );
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.gold).toBe(300);
    expect(save.permanentUpgrades).toEqual({ vitality: 2 });
    expect(save.introSeen).toBe(false);
    expect(save.settings.quality).toBe('high');
  });

  it('keeps a chosen graphics quality and replaces an invalid one with the default', () => {
    expect(
      parseSave(JSON.stringify({ version: 2, settings: { quality: 'low' } }), CONTENT, 'high')
        .settings.quality,
    ).toBe('low');
    expect(
      parseSave(JSON.stringify({ version: 2, settings: { quality: 'ultra' } }), CONTENT, 'medium')
        .settings.quality,
    ).toBe('medium');
  });

  it('remembers that the intro was seen', () => {
    expect(parseSave(JSON.stringify({ version: 2, introSeen: true }), CONTENT).introSeen).toBe(
      true,
    );
  });
});

describe('save format v3', () => {
  it('migrates a version 2 save with the enemy health bars on, keeping its settings', () => {
    const save = parseSave(
      JSON.stringify({
        version: 2,
        introSeen: true,
        settings: { damageNumbers: false, quality: 'low' },
      }),
      CONTENT,
    );
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.settings.enemyHealthBars).toBe(true);
    expect(save.settings.damageNumbers).toBe(false);
    expect(save.settings.quality).toBe('low');
  });

  it('remembers that the enemy health bars are off', () => {
    expect(
      parseSave(JSON.stringify({ version: 3, settings: { enemyHealthBars: false } }), CONTENT)
        .settings.enemyHealthBars,
    ).toBe(false);
  });
});

describe('graphics quality default', () => {
  it('chooses Low for software renderers', () => {
    expect(
      isSoftwareRenderer(
        'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      ),
    ).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(
      isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)'),
    ).toBe(false);
  });
});

describe('save format v10 (spec: meta-progression / save format version 10)', () => {
  it('migrates a version 9 save with no fusions discovered, keeping its progress', () => {
    const save = parseSave(
      JSON.stringify({ version: 9, gold: 80, discovered: { weapons: ['war_hammer'] } }),
      CONTENT,
    );
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.discovered.fusions).toEqual([]);
    expect(save.discovered.weapons).toEqual(['war_hammer']);
    expect(save.gold).toBe(80);
  });

  it('drops fusion IDs that are not in the content', () => {
    const save = parseSave(
      JSON.stringify({ version: 10, discovered: { fusions: ['apotheosis', 'gone_fusion'] } }),
      CONTENT,
    );
    expect(save.discovered.fusions).toEqual(['apotheosis']);
  });

  it('discovers the fusions a run ends with, once (spec: codex and statistics)', () => {
    const forged = result({
      loadout: {
        ...result().loadout,
        fusions: [{ id: 'forge_of_hephaestus', level: 1, tier: 1 }],
      },
    });
    const first = applyRunResult(freshSave(), forged, CONTENT, new Date(2026, 9, 24));
    expect(first.save.discovered.fusions).toEqual(['forge_of_hephaestus']);
    expect(first.rewards.newlyDiscovered).toContainEqual({
      kind: 'fusions',
      id: 'forge_of_hephaestus',
    });
    const again = applyRunResult(
      first.save,
      { ...forged, runId: 'run-2' },
      CONTENT,
      new Date(2026, 9, 25),
    );
    expect(again.rewards.newlyDiscovered).toEqual([]);
  });
});

describe('save format v11 (spec: meta-progression / save format version 11)', () => {
  it('migrates a version 10 save with no event currency, rewards or event table', () => {
    const save = parseSave(JSON.stringify({ version: 10, gold: 50 }), CONTENT);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.eventTokens).toEqual({});
    expect(save.eventRewards).toEqual([]);
    expect(save.highScores.event).toEqual([]);
    expect(save.gold).toBe(50);
  });

  it('keeps an event run’s honey cakes once, and puts a crossroads run in the event table', () => {
    const night = result({
      realmId: 'crossroads_of_hecate',
      eventId: 'night_of_hecate',
      tokens: 12,
    });
    const first = applyRunResult(freshSave(), night, CONTENT, new Date(2026, 9, 31));
    expect(first.save.eventTokens['night_of_hecate']).toBe(12);
    expect(first.rewards.tokens).toBe(12);
    expect(first.save.highScores.event).toHaveLength(1);
    expect(first.save.highScores.solo).toHaveLength(0);
    const again = applyRunResult(first.save, night, CONTENT, new Date(2026, 9, 31));
    expect(again.save.eventTokens['night_of_hecate']).toBe(12);
  });

  it('buys event rewards with honey cakes, for good (spec: seasonal-events / event shop)', () => {
    const storage = { data: {} as Record<string, string> };
    storage.data[SAVE_KEY] = JSON.stringify({ version: 11, eventTokens: { night_of_hecate: 100 } });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SAVE_STORAGE,
          useValue: {
            getItem: (k: string) => storage.data[k] ?? null,
            setItem: (k: string, v: string) => (storage.data[k] = v),
            removeItem: (k: string) => delete storage.data[k],
          },
        },
      ],
    });
    const progression = TestBed.inject(Progression);
    const reward = (id: string) => CONTENT.eventRewards.find((r) => r.id === id)!;
    expect(progression.buyReward(reward('torchbearer'))).toBe(true);
    expect(progression.tokens('night_of_hecate')).toBe(20);
    expect(progression.unlockedItems()).toEqual(['hecates_torches']);
    expect(progression.buyReward(reward('torchbearer'))).toBe(false);
    expect(progression.buyReward(reward('ward_of_the_crossroads'))).toBe(false);
    expect(progression.buyReward(reward('hecates_blessing'))).toBe(false);
    expect(progression.runModifiers()).toEqual([]);
  });
});
