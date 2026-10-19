import { CONTENT } from '../../../content';
import { GameContent, RunResult, spriteKeys } from '../../../engine';
import { localDate, questsFor, scoreOf } from './glory';
import { applyRunResult } from './rewards';
import { freshSave, parseSave, SAVE_VERSION, SaveData } from './save-data';

const NOW = new Date(2026, 9, 19, 12, 0, 0);
const run = (overrides: Partial<RunResult> = {}): RunResult => ({
  runId: 'g-1',
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 1,
  outcome: 'defeat',
  timeSeconds: 400,
  level: 12,
  kills: 300,
  gold: 100,
  realmsCleared: 0,
  realmReached: 'mount_olympus',
  players: 1,
  bots: 0,
  loadout: {
    weapons: [{ id: 'thunder_spear', level: 2, damage: 500 }],
    relics: [],
    skills: [],
    synergies: [],
  },
  ...overrides,
});
/** Content with only the given achievements and quests. */
const only = (changes: Partial<GameContent>): GameContent => ({
  ...CONTENT,
  achievements: [],
  dailyQuests: [],
  ...changes,
});
const achievement = (id: string) => CONTENT.achievements.find((a) => a.id === id)!;
const quest = (id: string) => CONTENT.dailyQuests.find((q) => q.id === id)!;
const QUESTS = () =>
  only({ dailyQuests: [quest('slay_600'), quest('three_runs'), quest('level_20')] });

let counter = 0;
function play(save: SaveData, content: GameContent, r: Partial<RunResult>, now = NOW) {
  return applyRunResult(save, run({ runId: `g-${++counter}`, ...r }), content, now);
}

describe('achievement content', () => {
  it('draws every achievement with a known icon', () => {
    const keys = new Set(spriteKeys());
    for (const a of CONTENT.achievements) expect(keys.has(a.sprite), a.id).toBe(true);
  });
});

describe('glory score (spec: glory / glory score)', () => {
  it('is kills + 2 per second + 10 per level + 1,000 per realm', () => {
    expect(scoreOf({ kills: 300, timeSeconds: 400, level: 12, realmsCleared: 1 })).toBe(2220);
  });
});

describe('high scores (spec: glory / high scores)', () => {
  const content = only({});

  it('puts a new best solo run first and leaves co-op alone', () => {
    let save = freshSave();
    save = play(save, content, { kills: 10 }).save;
    const best = play(save, content, { kills: 5000 });
    expect(best.rewards.glory.highScore).toEqual({ mode: 'solo', rank: 1 });
    expect(best.save.highScores.solo[0].kills).toBe(5000);
    expect(best.save.highScores.coop).toEqual([]);
  });

  it('keeps ten and turns away a run below all of them', () => {
    let save = freshSave();
    for (let i = 0; i < 10; i++) save = play(save, content, { kills: 1000 + i }).save;
    const low = play(save, content, { kills: 1, timeSeconds: 1, level: 1 });
    expect(low.rewards.glory.highScore).toBeUndefined();
    expect(low.save.highScores.solo).toEqual(save.highScores.solo);
  });

  it('puts a run with bot allies in its own table, never co-op (spec: glory / runs with allies)', () => {
    const { save, rewards } = play(freshSave(), content, { players: 3, bots: 2 });
    expect(rewards.glory.highScore?.mode).toBe('allies');
    expect(save.highScores.allies).toHaveLength(1);
    expect(save.highScores.solo).toEqual([]);
    expect(save.highScores.coop).toEqual([]);
  });

  it('counts a party of two as co-op', () => {
    const { save, rewards } = play(freshSave(), content, { players: 2 });
    expect(rewards.glory.highScore?.mode).toBe('coop');
    expect(save.highScores.solo).toEqual([]);
  });
});

describe('achievements (spec: glory / achievements)', () => {
  it('pays first_gate once, when a realm is first cleared', () => {
    const content = only({ achievements: [achievement('first_gate')] });
    const first = play(freshSave(), content, { realmsCleared: 1, gold: 0 });
    expect(first.rewards.glory.achievements.map((a) => a.id)).toEqual(['first_gate']);
    expect(first.save.gold).toBe(100);
    const again = play(first.save, content, { realmsCleared: 2, gold: 0 });
    expect(again.rewards.glory.achievements).toEqual([]);
    expect(again.save.gold).toBe(100);
  });

  it('adds lifetime kills up', () => {
    const content = only({ achievements: [achievement('slayer_10000')] });
    const save = play(freshSave(), content, { kills: 9800 }).save;
    expect(save.achievementProgress['slayer_10000']).toBe(9800);
    expect(save.achievements['slayer_10000']).toBeUndefined();
    const done = play(save, content, { kills: 300 });
    expect(done.rewards.glory.achievements.map((a) => a.id)).toEqual(['slayer_10000']);
  });

  it('waits for every god', () => {
    const content = only({ achievements: [achievement('pantheon')] });
    let save = freshSave();
    for (const godId of ['zeus', 'hades', 'poseidon']) {
      const r = play(save, content, { godId, realmsCleared: 1 });
      expect(r.rewards.glory.achievements).toEqual([]);
      save = r.save;
    }
    save = play(save, content, { godId: 'athena', realmsCleared: 0 }).save;
    expect(save.achievements['pantheon']).toBeUndefined();
    const last = play(save, content, { godId: 'athena', realmsCleared: 1 });
    expect(last.rewards.glory.achievements.map((a) => a.id)).toEqual(['pantheon']);
  });

  it('does not count a run with allies as co-op', () => {
    const content = only({
      achievements: [achievement('brothers_in_arms'), achievement('first_gate')],
    });
    const r = play(freshSave(), content, { realmsCleared: 1, players: 2, bots: 1 });
    expect(r.rewards.glory.achievements.map((a) => a.id)).toEqual(['first_gate']);
  });

  it('only counts co-op runs for a co-op goal', () => {
    const content = only({ achievements: [achievement('brothers_in_arms')] });
    expect(play(freshSave(), content, { realmsCleared: 1 }).rewards.glory.achievements).toEqual([]);
    expect(
      play(freshSave(), content, { realmsCleared: 1, players: 3 }).rewards.glory.achievements,
    ).toHaveLength(1);
  });
});

describe('daily quests (spec: glory / daily quests)', () => {
  it('chooses the same three different quests for the same date', () => {
    const a = questsFor('2026-10-19', CONTENT.dailyQuests).map((q) => q.id);
    expect(a).toEqual(questsFor('2026-10-19', CONTENT.dailyQuests).map((q) => q.id));
    expect(new Set(a).size).toBe(3);
    const days = new Set(
      ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((d) =>
        questsFor(d, CONTENT.dailyQuests)
          .map((q) => q.id)
          .join(),
      ),
    );
    expect(days.size).toBeGreaterThan(1);
  });

  it('asks for at most one particular god a day', () => {
    for (let day = 1; day <= 28; day++) {
      const date = `2026-11-${String(day).padStart(2, '0')}`;
      const quests = questsFor(date, CONTENT.dailyQuests);
      expect(quests).toHaveLength(3);
      expect(quests.filter((q) => q.goal.god).length).toBeLessThanOrEqual(1);
    }
  });

  it('adds the day’s kills up and pays once', () => {
    const content = QUESTS();
    let r = play(freshSave(), content, { kills: 350, level: 5, gold: 0 });
    expect(r.rewards.glory.quests).toEqual([]);
    r = play(r.save, content, { kills: 300, level: 5, gold: 0 });
    expect(r.rewards.glory.quests.map((q) => q.id)).toEqual(['slay_600']);
    expect(r.save.gold).toBe(150);
    r = play(r.save, content, { kills: 900, level: 5, gold: 0 });
    expect(r.rewards.glory.quests.map((q) => q.id)).toEqual(['three_runs']);
  });

  it('counts the best run of the day for a within-run goal', () => {
    const content = QUESTS();
    let r = play(freshSave(), content, { level: 15 });
    r = play(r.save, content, { level: 12 });
    expect(r.save.daily.progress['level_20']).toBe(15);
  });

  it('starts the next day over', () => {
    const content = QUESTS();
    const today = play(freshSave(), content, { kills: 500 }).save;
    const tomorrow = new Date(2026, 9, 20, 9, 0, 0);
    const next = play(today, content, { kills: 200 }, tomorrow).save;
    expect(next.daily.date).toBe(localDate(tomorrow));
    expect(next.daily.progress['slay_600']).toBe(200);
  });
});

describe('save format version 4 (spec: meta-progression / save format version 4)', () => {
  it('migrates a version 3 save with empty records', () => {
    const save = parseSave(JSON.stringify({ version: 3, gold: 800 }), CONTENT);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.gold).toBe(800);
    expect(save.history).toEqual([]);
    expect(save.highScores).toEqual({ solo: [], coop: [], allies: [] });
    expect(save.achievements).toEqual({});
  });

  it('keeps the valid high-score entries and drops a broken one', () => {
    const { save } = play(freshSave(), only({}), { kills: 50 });
    const entry = save.highScores.solo[0];
    const solo = [1, 2, 3, 4].map((i) => ({ ...entry, runId: `r${i}`, score: i * 10 }));
    const broken = { ...entry, runId: 'bad', score: undefined };
    const raw = JSON.stringify({ ...save, highScores: { solo: [...solo, broken], coop: [] } });
    const loaded = parseSave(raw, CONTENT);
    expect(loaded.highScores.solo.map((e) => e.runId)).toEqual(['r4', 'r3', 'r2', 'r1']);
  });

  it('round-trips history, records and quests, dropping unknown IDs', () => {
    let save = play(freshSave(), CONTENT, { realmsCleared: 1, kills: 700 }).save;
    save = { ...save, achievements: { ...save.achievements, removed_one: NOW.toISOString() } };
    const loaded = parseSave(JSON.stringify(save), CONTENT);
    expect(loaded.history).toEqual(save.history);
    expect(loaded.daily).toEqual(save.daily);
    expect(loaded.achievements['first_gate']).toBeDefined();
    expect(loaded.achievements['removed_one']).toBeUndefined();
  });

  it('migrates a version 4 save to 5 with an empty With allies table (spec: meta-progression / save format version 5)', () => {
    const { save } = play(freshSave(), only({}), { kills: 50 });
    const { bots: _bots, ...v4Entry } = save.highScores.solo[0];
    void _bots;
    const v4 = { ...save, version: 4, highScores: { solo: [v4Entry, v4Entry, v4Entry], coop: [] } };
    const loaded = parseSave(JSON.stringify(v4), CONTENT);
    expect(loaded.version).toBe(5);
    expect(loaded.highScores.solo).toHaveLength(3);
    expect(loaded.highScores.solo[0].bots).toBe(0);
    expect(loaded.highScores.allies).toEqual([]);
  });

  it('keeps the last 100 runs', () => {
    let save = freshSave();
    for (let i = 0; i < 101; i++) save = play(save, only({}), {}).save;
    expect(save.history).toHaveLength(100);
  });
});
