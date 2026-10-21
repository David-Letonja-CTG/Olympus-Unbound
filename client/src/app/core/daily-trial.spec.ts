import { CONTENT } from '../../content';
import { RunResult } from '../../engine';
import { challengeLink, challengeRun, parseChallenge } from './challenge';
import { dailyTrialFor, trialRun } from './daily-trial';
import { applyRunResult } from './save/rewards';
import { freshSave, parseSave, SAVE_VERSION, SaveData } from './save/save-data';

describe("the day's trial (spec: daily-trial / the day's trial)", () => {
  it('is the same for the same date, and made of real content', () => {
    const a = dailyTrialFor('2026-10-21', CONTENT);
    expect(dailyTrialFor('2026-10-21', CONTENT)).toEqual(a);
    expect(CONTENT.gods.map((g) => g.id)).toContain(a.godId);
    expect(CONTENT.realms.map((r) => r.id)).toContain(a.realmId);
    expect(CONTENT.twists).toContain(a.twist);
    expect(a.seed).toBeGreaterThanOrEqual(0);
    expect(a.seed).toBeLessThan(2 ** 32);
  });

  it('changes from day to day, and meets every twist over a month', () => {
    const days = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);
    const trials = days.map((d) => dailyTrialFor(d, CONTENT));
    expect(new Set(trials.map((t) => t.seed)).size).toBe(31);
    expect(new Set(trials.map((t) => t.twist.id)).size).toBeGreaterThan(CONTENT.twists.length / 2);
    expect(new Set(trials.map((t) => t.godId)).size).toBeGreaterThan(1);
  });

  it("plays by its twist's rules, marked as the day's trial", () => {
    const trial = dailyTrialFor('2026-10-21', CONTENT);
    expect(trialRun(trial)).toEqual({
      rules: trial.twist.rules,
      variant: { kind: 'daily', date: '2026-10-21', twistId: trial.twist.id },
    });
  });
});

const NOW = new Date(2026, 9, 21, 12, 0, 0);
let n = 0;
const result = (overrides: Partial<RunResult> = {}): RunResult => ({
  runId: `t-${++n}`,
  godId: 'zeus',
  realmId: 'mount_olympus',
  seed: 991,
  outcome: 'defeat',
  timeSeconds: 300,
  level: 10,
  kills: 400,
  gold: 50,
  realmsCleared: 0,
  realmReached: 'mount_olympus',
  players: 1,
  bots: 0,
  loadout: { weapons: [], relics: [], skills: [], synergies: [] },
  ...overrides,
});
const daily = { kind: 'daily' as const, date: '2026-10-21', twistId: 'swift_foes' };
const play = (save: SaveData, r: RunResult, now = NOW) => applyRunResult(save, r, CONTENT, now);

describe('daily best (spec: daily-trial / daily best)', () => {
  it('keeps the best attempt of the day and counts them', () => {
    const first = play(freshSave(), result({ variant: daily, kills: 200 }));
    expect(first.rewards.glory.trial).toEqual({
      best: first.rewards.glory.score,
      newBest: true,
      attempts: 1,
    });
    const better = play(first.save, result({ variant: daily, kills: 900 }));
    expect(better.rewards.glory.trial?.newBest).toBe(true);
    const worse = play(better.save, result({ variant: daily, kills: 10 }));
    expect(worse.rewards.glory.trial).toMatchObject({ newBest: false, attempts: 3 });
    expect(worse.save.dailyTrial.best?.kills).toBe(900);
  });

  it('never enters a high-score table, but counts for quests and stats', () => {
    const { save, rewards } = play(freshSave(), result({ variant: daily, kills: 99999 }));
    expect(rewards.glory.highScore).toBeUndefined();
    expect(save.highScores).toEqual({ solo: [], coop: [], allies: [], quick: [] });
    expect(save.stats.runs).toBe(1);
  });

  it("starts a new day's record over yesterday's", () => {
    const yesterday = play(freshSave(), result({ variant: { ...daily, date: '2026-10-20' } })).save;
    const today = play(yesterday, result({ variant: daily }));
    expect(today.save.dailyTrial).toMatchObject({ date: '2026-10-21', attempts: 1 });
  });
});

describe('challenges (spec: daily-trial / challenge links)', () => {
  it('round-trips a run through its link', () => {
    const r = result({
      godId: 'hades',
      realmId: 'the_underworld',
      seed: 991,
      variant: { kind: 'quick' },
    });
    const link = challengeLink('https://example.com/Olympus-Unbound/', r);
    expect(link.startsWith('https://example.com/Olympus-Unbound/challenge?')).toBe(true);
    const c = parseChallenge(new URL(link).searchParams, CONTENT);
    expect(c).toMatchObject({ godId: 'hades', realmId: 'the_underworld', seed: 991, quick: true });
    expect(c?.toBeat).toBe(400 + 600 + 100);
  });

  it("carries a Daily Trial's twist", () => {
    const link = challengeLink('https://example.com/', result({ variant: daily }));
    expect(parseChallenge(new URL(link).searchParams, CONTENT)?.twist?.id).toBe('swift_foes');
  });

  it('names its sender, cleaned, and works without one', () => {
    const named = challengeLink('https://example.com/', result(), '  Ada  ');
    expect(parseChallenge(new URL(named).searchParams, CONTENT)?.from).toBe('Ada');
    const nameless = challengeLink('https://example.com/', result(), '');
    expect(new URL(nameless).searchParams.has('n')).toBe(false);
    expect(parseChallenge(new URL(nameless).searchParams, CONTENT)?.from).toBeUndefined();
  });

  it('turns away a broken link', () => {
    const parse = (q: string) => parseChallenge(new URLSearchParams(q), CONTENT);
    expect(parse('g=nobody&r=mount_olympus&s=1')).toBeUndefined();
    expect(parse('g=zeus&r=mount_olympus&s=-4')).toBeUndefined();
    expect(parse('g=zeus&r=mount_olympus&s=1&t=no_such_twist')).toBeUndefined();
    expect(parse('g=zeus&r=mount_olympus&s=1')).toBeDefined();
  });

  it('plays by its length and twist', () => {
    const c = parseChallenge(
      new URLSearchParams('g=zeus&r=mount_olympus&s=5&q=1&t=iron_hides'),
      CONTENT,
    )!;
    const run = challengeRun(c);
    expect(run.rules?.pace).toBe(2);
    expect(run.rules?.enemies).toEqual({ health: 1.6 });
    expect(run.rules?.modifiers).toHaveLength(2);
    expect(run.variant).toEqual({ kind: 'challenge', quick: true, twistId: 'iron_hides' });
  });

  it('enters no table with a twist; a plain one is scored by its length', () => {
    const twisted = play(
      freshSave(),
      result({ variant: { kind: 'challenge', twistId: 'glass_god' } }),
    );
    expect(twisted.rewards.glory.highScore).toBeUndefined();
    const quick = play(freshSave(), result({ variant: { kind: 'challenge', quick: true } }));
    expect(quick.rewards.glory.highScore?.mode).toBe('quick');
    const full = play(freshSave(), result({ variant: { kind: 'challenge' } }));
    expect(full.rewards.glory.highScore?.mode).toBe('solo');
  });
});

describe('save format version 8 (spec: meta-progression / save format version 8)', () => {
  it('migrates a version 7 save with no trial played', () => {
    const loaded = parseSave(JSON.stringify({ version: 7, gold: 70 }), CONTENT);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.gold).toBe(70);
    expect(loaded.dailyTrial).toEqual({ date: '', attempts: 0 });
  });

  it('round-trips the record and drops a broken one', () => {
    const { save } = play(freshSave(), result({ variant: daily }));
    expect(parseSave(JSON.stringify(save), CONTENT).dailyTrial).toEqual(save.dailyTrial);
    const broken = { ...save, dailyTrial: { date: 'yesterday', attempts: 'many' } };
    expect(parseSave(JSON.stringify(broken), CONTENT).dailyTrial).toEqual({
      date: '',
      attempts: 0,
    });
  });
});
