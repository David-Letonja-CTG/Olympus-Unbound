import {
  DEFAULT_SETTINGS,
  GameContent,
  GameSettings,
  GRAPHICS_QUALITIES,
  GraphicsQuality,
  Modifier,
} from '../../../engine';
import {
  DailyState,
  EMPTY_DAILY,
  EMPTY_TRIAL,
  EMPTY_HIGH_SCORES,
  HighScores,
  parseDaily,
  parseGodLists,
  parseHighScores,
  parseHistory,
  parseNumbers,
  parseTrial,
  parseUnlocked,
  RunRecord,
  TrialRecord,
} from './save-records';

/** Current save format version (D8). Bump it and add a migration when the shape changes. */
export const SAVE_VERSION = 11;
/** Longest player name (spec: meta-progression / save format version 9; rooms use the same limit). */
export const MAX_PLAYER_NAME = 16;
/** How many processed run IDs are remembered to keep rewards idempotent. */
export const REMEMBERED_RUNS = 20;

export interface SaveStats {
  readonly runs: number;
  /** Realms cleared over all runs (named for the 7-minute runs, whose victory cleared one realm). */
  readonly victories: number;
  readonly kills: number;
  readonly bestTimeSeconds: number;
}

export interface Discovered {
  readonly weapons: readonly string[];
  readonly armour: readonly string[];
  readonly relics: readonly string[];
  /** Fusions ever held at the end of a run (spec: meta-progression / save format version 10). */
  readonly fusions: readonly string[];
}

/** Everything that persists between runs. Plain data only — never live game objects (spec: meta-progression). */
export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  readonly gold: number;
  readonly permanentUpgrades: Readonly<Record<string, number>>;
  readonly discovered: Discovered;
  readonly stats: SaveStats;
  readonly settings: GameSettings;
  readonly processedRunIds: readonly string[];
  /** The intro has finished or been skipped once (spec: intro-cutscene / plays once on first launch). */
  readonly introSeen: boolean;
  /** The last finished runs, oldest first (spec: run-statistics / run history). */
  readonly history: readonly RunRecord[];
  readonly highScores: HighScores;
  /** Unlocked achievements: id → ISO date (spec: glory / achievements). */
  readonly achievements: Readonly<Record<string, string>>;
  /** Added-up progress of achievements whose goal adds up. */
  readonly achievementProgress: Readonly<Record<string, number>>;
  /** Gods that met an every-god achievement's goal. */
  readonly achievementGods: Readonly<Record<string, readonly string[]>>;
  readonly daily: DailyState;
  /** The Daily Trial of the last day played (spec: daily-trial / daily best). */
  readonly dailyTrial: TrialRecord;
  /** The player's name for rooms and the share picture; empty when none was given. */
  readonly playerName: string;
  /** Each seasonal event's currency held (spec: meta-progression / save format version 11). */
  readonly eventTokens: Readonly<Record<string, number>>;
  /** Event shop rewards bought, kept for good. */
  readonly eventRewards: readonly string[];
}

export function freshSave(quality: GraphicsQuality = DEFAULT_SETTINGS.quality): SaveData {
  return {
    version: SAVE_VERSION,
    gold: 0,
    permanentUpgrades: {},
    discovered: { weapons: [], armour: [], relics: [], fusions: [] },
    stats: { runs: 0, victories: 0, kills: 0, bestTimeSeconds: 0 },
    settings: { ...DEFAULT_SETTINGS, quality },
    processedRunIds: [],
    introSeen: false,
    history: [],
    highScores: EMPTY_HIGH_SCORES,
    achievements: {},
    achievementProgress: {},
    achievementGods: {},
    daily: EMPTY_DAILY,
    dailyTrial: EMPTY_TRIAL,
    playerName: '',
    eventTokens: {},
    eventRewards: [],
  };
}

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const ids = (v: unknown, known: ReadonlySet<string>) =>
  Array.isArray(v)
    ? [...new Set(v.filter((id): id is string => typeof id === 'string' && known.has(id)))]
    : [];

/**
 * Older formats, keyed by the version they upgrade from. Version 0 is an unversioned save: its fields already
 * have today's names and are validated field by field below.
 */
const MIGRATIONS: Record<number, (save: Raw) => Raw> = {
  0: (save) => ({ ...save, version: 1 }),
  // v2 remembers the intro (not seen yet) and graphics quality (absent: the detected default).
  1: (save) => ({ ...save, version: 2, introSeen: false }),
  // v3 adds the enemy health bars setting (on, like a fresh save).
  2: (save) => ({
    ...save,
    version: 3,
    settings: { ...((save['settings'] as Raw | undefined) ?? {}), enemyHealthBars: true },
  }),
  // v4 adds the glory records and run history (spec: meta-progression / save format version 4), empty.
  3: (save) => ({ ...save, version: 4 }),
  // v5 adds the With allies high scores and bots in records (spec: meta-progression / save format version 5).
  4: (save) => ({ ...save, version: 5 }),
  // v6 adds the music volume (spec: meta-progression / save format version 6), at its default.
  5: (save) => ({ ...save, version: 6 }),
  // v7 adds the Quick high scores (spec: meta-progression / save format version 7), empty.
  6: (save) => ({ ...save, version: 7 }),
  // v8 adds the Daily Trial record (spec: meta-progression / save format version 8), none played.
  7: (save) => ({ ...save, version: 8 }),
  // v9 remembers the player's name (spec: meta-progression / save format version 9), none yet.
  8: (save) => ({ ...save, version: 9, playerName: '' }),
  // v10 remembers fusions in the codex (spec: meta-progression / save format version 10), none yet.
  9: (save) => ({ ...save, version: 10 }),
  // v11 keeps the seasonal events' currency, rewards and table (spec: meta-progression / save format version 11), none yet.
  10: (save) => ({ ...save, version: 11 }),
};

/**
 * Reads a stored save without ever throwing (spec: meta-progression / robust loading): invalid JSON starts
 * fresh, older versions are migrated, every field is validated on its own and unknown IDs are dropped.
 * `defaultQuality` fills a missing or invalid graphics quality.
 */
export function parseSave(
  raw: string | null,
  content: GameContent,
  defaultQuality: GraphicsQuality = DEFAULT_SETTINGS.quality,
): SaveData {
  const fresh = freshSave(defaultQuality);
  if (!raw) return fresh;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fresh;
  }
  if (!isObject(data)) return fresh;

  let save: Raw = data;
  let version = count(save['version'], 0);
  if (version > SAVE_VERSION) return fresh;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    save = migrate ? migrate(save) : save;
    version++;
  }

  const upgradeLevels: Record<string, number> = {};
  const rawUpgrades = save['permanentUpgrades'];
  if (isObject(rawUpgrades)) {
    for (const def of content.permanentUpgrades) {
      const level = count(rawUpgrades[def.id]);
      if (level > 0) upgradeLevels[def.id] = Math.min(level, def.costs.length);
    }
  }

  const achievementIds = new Set(content.achievements.map((a) => a.id));
  const discovered = isObject(save['discovered']) ? save['discovered'] : {};
  const stats = isObject(save['stats']) ? save['stats'] : {};
  const settings = isObject(save['settings']) ? save['settings'] : {};
  const volume = settings['sfxVolume'];
  const music = settings['musicVolume'];
  const quality = settings['quality'];

  return {
    version: SAVE_VERSION,
    gold: count(save['gold']),
    permanentUpgrades: upgradeLevels,
    discovered: {
      weapons: ids(discovered['weapons'], new Set(content.weapons.map((w) => w.id))),
      armour: ids(discovered['armour'], new Set(content.armour.map((a) => a.id))),
      relics: ids(discovered['relics'], new Set(content.relics.map((r) => r.id))),
      fusions: ids(discovered['fusions'], new Set(content.fusions.map((f) => f.id))),
    },
    stats: {
      runs: count(stats['runs']),
      victories: count(stats['victories']),
      kills: count(stats['kills']),
      bestTimeSeconds: count(stats['bestTimeSeconds']),
    },
    settings: {
      sfxVolume:
        typeof volume === 'number' && volume >= 0 && volume <= 1
          ? volume
          : DEFAULT_SETTINGS.sfxVolume,
      musicVolume:
        typeof music === 'number' && music >= 0 && music <= 1
          ? music
          : DEFAULT_SETTINGS.musicVolume,
      screenShake: flag(settings['screenShake'], DEFAULT_SETTINGS.screenShake),
      damageNumbers: flag(settings['damageNumbers'], DEFAULT_SETTINGS.damageNumbers),
      enemyHealthBars: flag(settings['enemyHealthBars'], DEFAULT_SETTINGS.enemyHealthBars),
      quality: GRAPHICS_QUALITIES.includes(quality as GraphicsQuality)
        ? (quality as GraphicsQuality)
        : defaultQuality,
    },
    processedRunIds: Array.isArray(save['processedRunIds'])
      ? save['processedRunIds']
          .filter((id): id is string => typeof id === 'string')
          .slice(-REMEMBERED_RUNS)
      : [],
    introSeen: flag(save['introSeen'], false),
    history: parseHistory(save['history'], content),
    highScores: parseHighScores(save['highScores'], content),
    achievements: parseUnlocked(save['achievements'], content),
    achievementProgress: parseNumbers(save['achievementProgress'], achievementIds),
    achievementGods: parseGodLists(save['achievementGods'], achievementIds, content),
    daily: parseDaily(save['daily'], content),
    dailyTrial: parseTrial(save['dailyTrial']),
    playerName: cleanName(save['playerName']),
    eventTokens: parseNumbers(save['eventTokens'], new Set(content.events.map((e) => e.id))),
    eventRewards: ids(save['eventRewards'], new Set(content.eventRewards.map((r) => r.id))),
  };
}

/** A player name as kept: a trimmed string of at most 16 characters, else none. */
export function cleanName(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, MAX_PLAYER_NAME).trim() : '';
}

/** The modifiers bought permanent upgrades add to every run. */
export function permanentModifiers(save: SaveData, content: GameContent): Modifier[] {
  const result: Modifier[] = [];
  // Event shop rewards with modifiers last for good (spec: seasonal-events / event shop).
  for (const reward of content.eventRewards)
    if (reward.effect.type === 'modifiers' && save.eventRewards.includes(reward.id))
      result.push(...reward.effect.modifiers);
  for (const def of content.permanentUpgrades) {
    const level = save.permanentUpgrades[def.id] ?? 0;
    if (level <= 0) continue;
    for (const m of def.modifiers) {
      result.push({
        stat: m.stat,
        flat: m.flat !== undefined ? m.flat * level : undefined,
        percent: m.percent !== undefined ? m.percent * level : undefined,
      });
    }
  }
  return result;
}
