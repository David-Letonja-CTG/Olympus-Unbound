import { GameContent, Goal } from '../../engine';
import { dailyOf, questsFor } from './save/glory';
import { SaveData } from './save/save-data';

/** One line on the main menu: the nearest unfinished thing, and the screen where it lives (spec: run-setup). */
export interface NextGoal {
  readonly kind: 'trial' | 'blessing' | 'quest' | 'achievement';
  readonly text: string;
  /** Progress or price, shown after the text. */
  readonly detail?: string;
  readonly route: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** A goal's value as people read it: time as minutes and seconds, the rest as counts. */
function amount(goal: Goal, value: number): string {
  if (goal.measure !== 'timeSeconds') return Math.floor(value).toLocaleString('en-US');
  const s = Math.floor(value);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The player's next goal (spec: run-setup / main menu): today's Daily Trial if unplayed, then a blessing they can
 * afford, then the daily quest closest to done, then the achievement closest to done (where its progress is known).
 * Pure; undefined when nothing is left.
 */
export function nextGoal(
  save: SaveData,
  content: GameContent,
  now: Date,
  trial?: { readonly playedToday: boolean },
): NextGoal | undefined {
  if (trial && !trial.playedToday)
    return { kind: 'trial', text: "Today's Daily Trial awaits", route: '/daily' };

  // The cheapest next level the gold already covers.
  let blessing: { name: string; level: number; cost: number } | undefined;
  for (const u of content.permanentUpgrades) {
    const level = save.permanentUpgrades[u.id] ?? 0;
    const cost = u.costs[level];
    if (cost === undefined || cost > save.gold) continue;
    if (!blessing || cost < blessing.cost) blessing = { name: u.name, level: level + 1, cost };
  }
  if (blessing)
    return {
      kind: 'blessing',
      text: `Buy ${blessing.name} ${ROMAN[blessing.level - 1] ?? blessing.level}`,
      detail: `${blessing.cost.toLocaleString('en-US')} gold`,
      route: '/progression',
    };

  const closest = <T>(items: readonly { item: T; share: number }[]) =>
    items.reduce<{ item: T; share: number } | undefined>(
      (best, x) => (!best || x.share > best.share ? x : best),
      undefined,
    )?.item;

  const day = dailyOf(save, now);
  const quest = closest(
    questsFor(day.date, content.dailyQuests)
      .filter((q) => !day.done.includes(q.id))
      .map((q) => ({ item: q, share: (day.progress[q.id] ?? 0) / q.goal.target })),
  );
  if (quest) {
    const progress = Math.min(quest.goal.target, day.progress[quest.id] ?? 0);
    return {
      kind: 'quest',
      text: `Daily quest: ${quest.description}`,
      detail: `${amount(quest.goal, progress)} / ${amount(quest.goal, quest.goal.target)}`,
      route: '/glory',
    };
  }

  // Achievements whose progress adds up over runs or over gods; one-run goals have no progress to show.
  const achievement = closest(
    content.achievements
      .filter((a) => !save.achievements[a.id])
      .map((a) => {
        const done = a.goal.everyGod
          ? (save.achievementGods[a.id]?.length ?? 0)
          : a.goal.over === 'total'
            ? (save.achievementProgress[a.id] ?? 0)
            : 0;
        const target = a.goal.everyGod ? content.gods.length : a.goal.target;
        return { item: { a, done, target }, share: done / target };
      })
      .filter((x) => x.share > 0),
  );
  if (achievement) {
    const { a, done, target } = achievement;
    return {
      kind: 'achievement',
      text: `Achievement: ${a.name}`,
      detail: a.goal.everyGod
        ? `${done} / ${target} gods`
        : `${amount(a.goal, done)} / ${amount(a.goal, target)}`,
      route: '/glory',
    };
  }
  return undefined;
}
