import { GameContent, RunConfig, RunResult, TwistDefinition } from '../../engine';
import { MAX_SEED } from './run-setup';

/** A run to repeat from a link: the same god, realm, seed, length and twist, and a score to beat (spec: daily-trial). */
export interface Challenge {
  readonly godId: string;
  readonly realmId: string;
  readonly seed: number;
  readonly quick: boolean;
  readonly twist?: TwistDefinition;
  /** The score the sender reached; links carry it as they were made (no server checks it, D1). */
  readonly toBeat?: number;
}

/** Quick runs' rules (spec: quick-runs): the realm clock at double speed, double experience. */
export const QUICK_RULES = { pace: 2, modifiers: [{ stat: 'xpGain' as const, flat: 1 }] };

/**
 * The link that replays a finished run for a friend (spec: daily-trial / challenge links), relative to the app's
 * base URL: `challenge?g=…&r=…&s=…[&q=1][&t=…]&b=…`.
 */
export function challengeLink(base: string, r: RunResult, twistId?: string): string {
  const v = r.variant;
  const quick = v?.kind === 'quick' || (v?.kind === 'challenge' && !!v.quick);
  const twist = twistId ?? (v?.kind === 'daily' || v?.kind === 'challenge' ? v.twistId : undefined);
  const params = new URLSearchParams({ g: r.godId, r: r.realmId, s: String(r.seed) });
  if (quick) params.set('q', '1');
  if (twist) params.set('t', twist);
  params.set('b', String(Math.floor(scoreFor(r))));
  return `${base.replace(/\/?$/, '/')}challenge?${params}`;
}

/** Kills + 2 per second + 10 per level + 1,000 per realm (spec: glory / glory score). */
function scoreFor(r: Pick<RunResult, 'kills' | 'timeSeconds' | 'level' | 'realmsCleared'>) {
  return r.kills + 2 * r.timeSeconds + 10 * r.level + 1000 * r.realmsCleared;
}

/** Reads a challenge link's parameters; undefined when a part is missing or unknown (spec: a broken link). */
export function parseChallenge(
  params: URLSearchParams,
  content: GameContent,
): Challenge | undefined {
  const god = content.gods.find((g) => g.id === params.get('g'));
  const realm = content.realms.find((r) => r.id === params.get('r'));
  const seedText = params.get('s') ?? '';
  const seed = /^\d+$/.test(seedText) ? Number(seedText) : NaN;
  if (!god || !realm || !Number.isSafeInteger(seed) || seed > MAX_SEED) return undefined;
  const twistId = params.get('t');
  const twist = twistId ? content.twists.find((t) => t.id === twistId) : undefined;
  if (twistId && !twist) return undefined;
  const toBeatText = params.get('b') ?? '';
  const toBeat = /^\d+$/.test(toBeatText) ? Number(toBeatText) : undefined;
  return { godId: god.id, realmId: realm.id, seed, quick: params.get('q') === '1', twist, toBeat };
}

/** What a challenge run plays by: its twist and length, marked as a challenge for the records. */
export function challengeRun(c: Challenge): Pick<RunConfig, 'rules' | 'variant'> {
  const modifiers = [
    ...(c.quick ? QUICK_RULES.modifiers : []),
    ...(c.twist?.rules.modifiers ?? []),
  ];
  return {
    rules: {
      ...(c.quick ? { pace: QUICK_RULES.pace } : {}),
      ...(modifiers.length ? { modifiers } : {}),
      ...(c.twist?.rules.enemies ? { enemies: c.twist.rules.enemies } : {}),
    },
    variant: { kind: 'challenge', quick: c.quick || undefined, twistId: c.twist?.id },
  };
}
