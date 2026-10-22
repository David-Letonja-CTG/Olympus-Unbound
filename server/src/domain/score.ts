import { cleanName, isContentId, isVersion } from './ids.js';

/** The world boards (spec: world-leaderboards): the Hall's four tables, and one board per Daily Trial date. */
export const BOARDS = ['solo', 'allies', 'coop', 'quick', 'daily'] as const;
export type Board = (typeof BOARDS)[number];

export function isBoard(value: unknown): value is Board {
  return typeof value === 'string' && (BOARDS as readonly string[]).includes(value);
}

/** A run's figures, as the game reports them. */
export interface RunFigures {
  readonly realmsCleared: number;
  readonly timeSeconds: number;
  readonly kills: number;
  readonly level: number;
}

/** An entry ready for a board: checked, with the score the server computed. */
export interface ScoreEntry extends RunFigures {
  readonly runId: string;
  readonly board: Board;
  /** `YYYY-MM-DD`, Daily Trial boards only. */
  readonly date?: string;
  readonly names: readonly string[];
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly bots: number;
  readonly score: number;
  readonly version: string;
}

/** Why an entry was refused; the game shows none of these, they are for logs and tests. */
export type ScoreRefusal =
  | 'bad-board'
  | 'bad-run-id'
  | 'bad-names'
  | 'bad-ids'
  | 'bad-party'
  | 'bad-figures'
  | 'impossible'
  | 'bad-date';

/** Kills + 2 per second + 10 per level + 1,000 per realm cleared (spec: glory / glory score). */
export function scoreOf(r: RunFigures): number {
  return r.kills + 2 * r.timeSeconds + 10 * r.level + 1000 * r.realmsCleared;
}

/** Plausibility (spec: world-leaderboards / fair scores): generous, but no real run can do more. */
export const LIMITS = {
  maxSeconds: 6 * 3600,
  maxLevel: 400,
  maxKillsPerSecond: 60,
  /** A realm's boss comes at 3:30 at the earliest (quick runs); 90 s a realm is beyond any real run. */
  minSecondsPerRealm: 90,
  maxPlayers: 4,
} as const;

const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** The UTC date `YYYY-MM-DD` of `at`. */
export function utcDate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** A Daily Trial date the server accepts: a real date within a day of its own (the trial follows local dates). */
export function isNearDate(date: unknown, now: Date): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const at = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(at) || utcDate(new Date(at)) !== date) return false;
  const today = Date.parse(`${utcDate(now)}T00:00:00Z`);
  return Math.abs(at - today) <= 86_400_000;
}

/** Checks a submitted run and computes its score; a refusal says why not. */
export function checkSubmission(
  input: unknown,
  now: Date,
): { entry: ScoreEntry } | { refusal: ScoreRefusal } {
  if (typeof input !== 'object' || input === null) return { refusal: 'bad-figures' };
  const v = input as Record<string, unknown>;
  const board = v['board'];
  if (!isBoard(board)) return { refusal: 'bad-board' };
  const runId = v['runId'];
  if (typeof runId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(runId))
    return { refusal: 'bad-run-id' };
  const rawNames = v['names'];
  if (!Array.isArray(rawNames) || rawNames.length < 1 || rawNames.length > LIMITS.maxPlayers)
    return { refusal: 'bad-names' };
  const names = rawNames.map(cleanName);
  if (names.some((n) => n === undefined)) return { refusal: 'bad-names' };
  const { godId, realmId, version } = v;
  if (!isContentId(godId) || !isContentId(realmId) || !isVersion(version))
    return { refusal: 'bad-ids' };
  const { players, bots } = v;
  if (!whole(players) || !whole(bots) || players < 1 || players > LIMITS.maxPlayers)
    return { refusal: 'bad-party' };
  if (bots >= players || (board === 'coop' && players - bots < 2)) return { refusal: 'bad-party' };
  const { realmsCleared, timeSeconds, kills, level } = v;
  if (!whole(realmsCleared) || !whole(timeSeconds) || !whole(kills) || !whole(level) || level < 1)
    return { refusal: 'bad-figures' };
  if (
    timeSeconds > LIMITS.maxSeconds ||
    level > LIMITS.maxLevel ||
    kills > timeSeconds * LIMITS.maxKillsPerSecond ||
    realmsCleared * LIMITS.minSecondsPerRealm > timeSeconds
  )
    return { refusal: 'impossible' };
  let date: string | undefined;
  if (board === 'daily') {
    const raw = v['date'];
    if (!isNearDate(raw, now)) return { refusal: 'bad-date' };
    date = raw;
  }
  const figures = { realmsCleared, timeSeconds, kills, level };
  return {
    entry: {
      runId,
      board,
      date,
      names: names as string[],
      godId,
      realmId,
      players,
      bots,
      ...figures,
      score: scoreOf(figures),
      version,
    },
  };
}
