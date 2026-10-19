import {
  AchievementDefinition,
  GameContent,
  Goal,
  QuestDefinition,
  RunResult,
} from '../../../engine';
import { SaveData } from './save-data';
import { HIGH_SCORES, HISTORY_SIZE, RunRecord, ScoreEntry } from './save-records';

/** What a run earned in glory (spec: glory, run-outcome / glory in the run summary). */
export interface GloryOutcome {
  readonly score: number;
  /** The run's place in its table, if it entered one. */
  readonly highScore?: { readonly mode: GloryMode; readonly rank: number };
  readonly achievements: readonly AchievementDefinition[];
  readonly quests: readonly QuestDefinition[];
  /** Gold from achievements and quests. */
  readonly gold: number;
}

export const NO_GLORY: GloryOutcome = { score: 0, achievements: [], quests: [], gold: 0 };

/** Kills + 2 per second + 10 per level + 1,000 per realm cleared (spec: glory / glory score). */
export function scoreOf(r: Pick<RunResult, 'kills' | 'timeSeconds' | 'level' | 'realmsCleared'>) {
  return r.kills + 2 * r.timeSeconds + 10 * r.level + 1000 * r.realmsCleared;
}

export type GloryMode = 'solo' | 'coop' | 'allies';

/**
 * Co-op needs two or more players; a solo run with bot allies is its own mode and never co-op (spec: glory / runs with
 * allies).
 */
export function modeOf(players: number, bots = 0): GloryMode {
  if (players - bots > 1) return 'coop';
  return bots > 0 ? 'allies' : 'solo';
}

/** The local calendar date, `YYYY-MM-DD`: daily quests change at local midnight. */
export function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The day's three quests, chosen by the date alone (spec: glory / same date, same quests). Not gameplay randomness,
 * so not the simulation's seeded streams (D5): FNV-1a of the date seeds a small LCG for a partial shuffle.
 */
export function questsFor(date: string, quests: readonly QuestDefinition[]): QuestDefinition[] {
  let seed = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) seed = Math.imul(seed ^ date.charCodeAt(i), 0x01000193);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const pool = [...quests];
  for (let i = 0; i < pool.length - 1; i++) {
    const j = i + Math.floor(next() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // At most one quest for a particular god a day, so a day never asks for two gods the player may not play.
  const picked: QuestDefinition[] = [];
  for (const q of pool) {
    if (picked.length === 3) break;
    if (q.goal.god && picked.some((p) => p.goal.god)) continue;
    picked.push(q);
  }
  return picked;
}

/** A run's value for a goal, or undefined when the run does not count for it (another god or mode). */
export function measure(goal: Goal, r: RunResult): number | undefined {
  if (goal.god && goal.god !== r.godId) return undefined;
  if (goal.mode && goal.mode !== modeOf(r.players, r.bots)) return undefined;
  switch (goal.measure) {
    case 'runs':
      return 1;
    case 'synergies':
      return r.loadout.synergies.length;
    default:
      return r[goal.measure];
  }
}

/** The day's quest progress as of `now`: another day starts empty. */
export function dailyOf(save: SaveData, now: Date): SaveData['daily'] {
  const date = localDate(now);
  return save.daily.date === date ? save.daily : { date, progress: {}, done: [] };
}

/**
 * Applies a finished run's glory to a save: history, high scores, achievements and daily quests, with their gold.
 * Pure; the caller keeps it to once per run ID (D8).
 */
export function applyGlory(
  save: SaveData,
  r: RunResult,
  content: GameContent,
  now: Date,
): { save: SaveData; glory: GloryOutcome } {
  const endedAt = now.toISOString();
  const score = scoreOf(r);
  const mode = modeOf(r.players, r.bots);

  const entry: ScoreEntry = {
    runId: r.runId,
    endedAt,
    godId: r.godId,
    realmId: r.realmId,
    players: r.players,
    bots: r.bots,
    score,
    realmsCleared: r.realmsCleared,
    timeSeconds: r.timeSeconds,
    kills: r.kills,
    level: r.level,
  };
  const table = [...save.highScores[mode].filter((e) => e.runId !== r.runId), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, HIGH_SCORES);
  const rank = table.indexOf(entry) + 1;

  const record: RunRecord = {
    ...entry,
    realmReached: r.realmReached,
    outcome: r.outcome,
    seed: r.seed,
    gold: r.gold,
    weapons: r.loadout.weapons.map((w) => ({ id: w.id, level: w.level, damage: w.damage })),
    relics: [...r.loadout.relics],
    synergies: [...r.loadout.synergies],
  };

  // Achievements (spec: glory / achievements).
  const achievements = { ...save.achievements };
  const progress = { ...save.achievementProgress };
  const godsMet = { ...save.achievementGods };
  const unlocked: AchievementDefinition[] = [];
  for (const a of content.achievements) {
    if (achievements[a.id]) continue;
    const value = measure(a.goal, r);
    if (value === undefined) continue;
    let met: boolean;
    if (a.goal.everyGod) {
      if (value >= a.goal.target) godsMet[a.id] = [...new Set([...(godsMet[a.id] ?? []), r.godId])];
      met = content.gods.every((g) => godsMet[a.id]?.includes(g.id));
    } else if (a.goal.over === 'total') {
      progress[a.id] = (progress[a.id] ?? 0) + value;
      met = progress[a.id] >= a.goal.target;
    } else {
      met = value >= a.goal.target;
    }
    if (met) {
      achievements[a.id] = endedAt;
      unlocked.push(a);
    }
  }

  // Daily quests (spec: glory / daily quests).
  const day = dailyOf(save, now);
  const questProgress = { ...day.progress };
  const done = [...day.done];
  const completed: QuestDefinition[] = [];
  for (const q of questsFor(day.date, content.dailyQuests)) {
    if (done.includes(q.id)) continue;
    const value = measure(q.goal, r);
    if (value === undefined) continue;
    const before = questProgress[q.id] ?? 0;
    questProgress[q.id] = q.goal.over === 'total' ? before + value : Math.max(before, value);
    if (questProgress[q.id] >= q.goal.target) {
      done.push(q.id);
      completed.push(q);
    }
  }

  const gold = [...unlocked, ...completed].reduce((sum, item) => sum + item.gold, 0);
  return {
    save: {
      ...save,
      gold: save.gold + gold,
      history: [...save.history, record].slice(-HISTORY_SIZE),
      highScores: { ...save.highScores, [mode]: table },
      achievements,
      achievementProgress: progress,
      achievementGods: godsMet,
      daily: { date: day.date, progress: questProgress, done },
    },
    glory: {
      score,
      highScore: rank > 0 ? { mode, rank } : undefined,
      achievements: unlocked,
      quests: completed,
      gold,
    },
  };
}
