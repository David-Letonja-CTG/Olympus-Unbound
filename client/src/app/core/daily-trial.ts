import { GameContent, RunConfig, TwistDefinition } from '../../engine';

/** One day's trial: the same for everyone on that date (spec: daily-trial / the day's trial). */
export interface DailyTrial {
  /** Local date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly godId: string;
  readonly realmId: string;
  readonly seed: number;
  readonly twist: TwistDefinition;
}

/**
 * The trial of a date, from the date alone, so every browser agrees without a network. Not gameplay randomness, so
 * not the simulation's seeded streams (D5): FNV-1a of the date seeds a small LCG, as for the daily quests. The first
 * realm of the chain comes one day in three, so new players often meet Olympus.
 */
export function dailyTrialFor(date: string, content: GameContent): DailyTrial {
  let hash = 0x811c9dc5;
  for (const ch of `trial:${date}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 0x01000193);
  let state = hash >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  const god = pick(content.gods);
  const realm = next() < 1 / 3 ? content.realms[0] : pick(content.realms);
  const twist = pick(content.twists);
  return {
    date,
    godId: god.id,
    realmId: realm.id,
    seed: Math.floor(next() * 2 ** 32),
    twist,
  };
}

/** What a trial run plays by: the twist's rules, marked as the day's trial for the records. */
export function trialRun(trial: DailyTrial): Pick<RunConfig, 'rules' | 'variant'> {
  return {
    rules: trial.twist.rules,
    variant: { kind: 'daily', date: trial.date, twistId: trial.twist.id },
  };
}
