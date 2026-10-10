import { DEFAULT_SETTINGS, GameContent, GameSettings, Modifier } from '../../../engine';

/** Current save format version (D8). Bump it and add a migration when the shape changes. */
export const SAVE_VERSION = 1;
/** How many processed run IDs are remembered to keep rewards idempotent. */
export const REMEMBERED_RUNS = 20;

export interface SaveStats {
  readonly runs: number;
  readonly victories: number;
  readonly kills: number;
  readonly bestTimeSeconds: number;
}

export interface Discovered {
  readonly weapons: readonly string[];
  readonly armour: readonly string[];
  readonly relics: readonly string[];
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
}

export function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    gold: 0,
    permanentUpgrades: {},
    discovered: { weapons: [], armour: [], relics: [] },
    stats: { runs: 0, victories: 0, kills: 0, bestTimeSeconds: 0 },
    settings: DEFAULT_SETTINGS,
    processedRunIds: [],
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
};

/**
 * Reads a stored save without ever throwing (spec: meta-progression / robust loading): invalid JSON starts
 * fresh, older versions are migrated, every field is validated on its own and unknown IDs are dropped.
 */
export function parseSave(raw: string | null, content: GameContent): SaveData {
  const fresh = freshSave();
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

  const discovered = isObject(save['discovered']) ? save['discovered'] : {};
  const stats = isObject(save['stats']) ? save['stats'] : {};
  const settings = isObject(save['settings']) ? save['settings'] : {};
  const volume = settings['sfxVolume'];

  return {
    version: SAVE_VERSION,
    gold: count(save['gold']),
    permanentUpgrades: upgradeLevels,
    discovered: {
      weapons: ids(discovered['weapons'], new Set(content.weapons.map((w) => w.id))),
      armour: ids(discovered['armour'], new Set(content.armour.map((a) => a.id))),
      relics: ids(discovered['relics'], new Set(content.relics.map((r) => r.id))),
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
      screenShake: flag(settings['screenShake'], DEFAULT_SETTINGS.screenShake),
      damageNumbers: flag(settings['damageNumbers'], DEFAULT_SETTINGS.damageNumbers),
    },
    processedRunIds: Array.isArray(save['processedRunIds'])
      ? save['processedRunIds']
          .filter((id): id is string => typeof id === 'string')
          .slice(-REMEMBERED_RUNS)
      : [],
  };
}

/** The modifiers bought permanent upgrades add to every run. */
export function permanentModifiers(save: SaveData, content: GameContent): Modifier[] {
  const result: Modifier[] = [];
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
