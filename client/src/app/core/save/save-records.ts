import { GameContent, RunOutcome } from '../../../engine';

/** The run history keeps this many runs (spec: run-statistics / run history). */
export const HISTORY_SIZE = 100;
/** Each high-score table keeps this many entries (spec: glory / high scores). */
export const HIGH_SCORES = 10;

/** One finished run, as the statistics screen reads it. */
export interface RunRecord {
  readonly runId: string;
  /** ISO time the run ended (the application's clock). */
  readonly endedAt: string;
  readonly godId: string;
  readonly realmId: string;
  readonly realmReached: string;
  readonly players: number;
  readonly outcome: RunOutcome;
  readonly seed: number;
  readonly timeSeconds: number;
  readonly level: number;
  readonly kills: number;
  readonly gold: number;
  readonly realmsCleared: number;
  readonly score: number;
  readonly weapons: readonly {
    readonly id: string;
    readonly level: number;
    readonly damage: number;
  }[];
  readonly relics: readonly string[];
  readonly synergies: readonly string[];
}

export interface ScoreEntry {
  readonly runId: string;
  readonly endedAt: string;
  readonly godId: string;
  readonly realmId: string;
  readonly players: number;
  readonly score: number;
  readonly realmsCleared: number;
  readonly timeSeconds: number;
  readonly kills: number;
  readonly level: number;
}

export interface HighScores {
  readonly solo: readonly ScoreEntry[];
  readonly coop: readonly ScoreEntry[];
}

/** The day's quests: progress per quest and the ones already paid (spec: glory / daily quests). */
export interface DailyState {
  /** Local date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly progress: Readonly<Record<string, number>>;
  readonly done: readonly string[];
}

export const EMPTY_HIGH_SCORES: HighScores = { solo: [], coop: [] };
export const EMPTY_DAILY: DailyState = { date: '', progress: {}, done: [] };

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const OUTCOMES: readonly RunOutcome[] = ['defeat', 'abandoned'];

/** Validates a list entry by entry: a broken entry is dropped, the rest load (spec: meta-progression). */
function entries<T>(v: unknown, parse: (raw: Raw) => T | undefined, max: number): T[] {
  if (!Array.isArray(v)) return [];
  const result: T[] = [];
  for (const raw of v) {
    const parsed = isObject(raw) ? parse(raw) : undefined;
    if (parsed) result.push(parsed);
  }
  return result.slice(-max);
}

const COMMON = ['runId', 'endedAt', 'godId', 'realmId'] as const;
const NUMBERS = ['players', 'score', 'realmsCleared', 'timeSeconds', 'kills', 'level'] as const;

function parseEntry(raw: Raw, content: GameContent): ScoreEntry | undefined {
  if (!COMMON.every((k) => str(raw[k])) || !NUMBERS.every((k) => num(raw[k]))) return undefined;
  if (!content.gods.some((g) => g.id === raw['godId'])) return undefined;
  const n = (k: (typeof NUMBERS)[number]) => raw[k] as number;
  return {
    runId: raw['runId'] as string,
    endedAt: raw['endedAt'] as string,
    godId: raw['godId'] as string,
    realmId: raw['realmId'] as string,
    players: n('players'),
    score: n('score'),
    realmsCleared: n('realmsCleared'),
    timeSeconds: n('timeSeconds'),
    kills: n('kills'),
    level: n('level'),
  };
}

function parseRecord(raw: Raw, content: GameContent): RunRecord | undefined {
  const entry = parseEntry(raw, content);
  if (!entry || !str(raw['realmReached']) || !num(raw['seed']) || !num(raw['gold']))
    return undefined;
  if (!OUTCOMES.includes(raw['outcome'] as RunOutcome)) return undefined;
  const weapons = Array.isArray(raw['weapons'])
    ? raw['weapons'].filter(
        (w): w is RunRecord['weapons'][number] =>
          isObject(w) && str(w['id']) && num(w['level']) && num(w['damage']),
      )
    : [];
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter(str) : []);
  return {
    ...entry,
    realmReached: raw['realmReached'] as string,
    outcome: raw['outcome'] as RunOutcome,
    seed: raw['seed'] as number,
    gold: raw['gold'] as number,
    weapons: weapons.map((w) => ({ id: w.id, level: w.level, damage: w.damage })),
    relics: strings(raw['relics']),
    synergies: strings(raw['synergies']),
  };
}

export function parseHistory(v: unknown, content: GameContent): RunRecord[] {
  return entries(v, (raw) => parseRecord(raw, content), HISTORY_SIZE);
}

export function parseHighScores(v: unknown, content: GameContent): HighScores {
  const raw = isObject(v) ? v : {};
  const table = (t: unknown) =>
    entries(t, (e) => parseEntry(e, content), HIGH_SCORES).sort((a, b) => b.score - a.score);
  return { solo: table(raw['solo']), coop: table(raw['coop']) };
}

/** Unlocked achievements (id → date), known IDs only. */
export function parseUnlocked(v: unknown, content: GameContent): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isObject(v)) return result;
  for (const a of content.achievements) if (str(v[a.id])) result[a.id] = v[a.id] as string;
  return result;
}

export function parseNumbers(v: unknown, known: ReadonlySet<string>): Record<string, number> {
  const result: Record<string, number> = {};
  if (!isObject(v)) return result;
  for (const [k, n] of Object.entries(v)) if (known.has(k) && num(n)) result[k] = n;
  return result;
}

export function parseGodLists(
  v: unknown,
  known: ReadonlySet<string>,
  content: GameContent,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!isObject(v)) return result;
  const gods = new Set(content.gods.map((g) => g.id));
  for (const [k, list] of Object.entries(v))
    if (known.has(k) && Array.isArray(list))
      result[k] = [...new Set(list.filter((g): g is string => str(g) && gods.has(g)))];
  return result;
}

export function parseDaily(v: unknown, content: GameContent): DailyState {
  if (!isObject(v) || !str(v['date']) || !/^\d{4}-\d{2}-\d{2}$/.test(v['date'] as string))
    return EMPTY_DAILY;
  const known = new Set(content.dailyQuests.map((q) => q.id));
  return {
    date: v['date'] as string,
    progress: parseNumbers(v['progress'], known),
    done: Array.isArray(v['done'])
      ? [...new Set(v['done'].filter((id): id is string => str(id) && known.has(id)))]
      : [],
  };
}
