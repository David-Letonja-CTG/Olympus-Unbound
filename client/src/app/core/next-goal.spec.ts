import { CONTENT } from '../../content';
import { localDate, questsFor } from './save/glory';
import { nextGoal } from './next-goal';
import { freshSave, SaveData } from './save/save-data';

const NOW = new Date(2026, 9, 21, 12, 0, 0);
const TODAY = localDate(NOW);
const quests = questsFor(TODAY, CONTENT.dailyQuests);
/** Every quest of today done, so later candidates can be reached. */
const questsDone = (save: SaveData): SaveData => ({
  ...save,
  daily: { date: TODAY, progress: {}, done: quests.map((q) => q.id) },
});

describe('nextGoal (spec: run-setup / main menu)', () => {
  it("puts an unplayed Daily Trial first, then never once it's played", () => {
    const save = { ...freshSave(), gold: 1000 };
    expect(nextGoal(save, CONTENT, NOW, { playedToday: false })).toMatchObject({
      kind: 'trial',
      route: '/daily',
    });
    expect(nextGoal(save, CONTENT, NOW, { playedToday: true })?.kind).toBe('blessing');
  });

  it('names the cheapest blessing the gold covers, with its next level and price', () => {
    const save: SaveData = { ...freshSave(), gold: 150, permanentUpgrades: { magnetism: 1 } };
    // Attraction II costs 180 (too much); Vitality I and Greed I cost 100, the first listed wins.
    expect(nextGoal(save, CONTENT, NOW)).toEqual({
      kind: 'blessing',
      text: 'Buy Vitality I',
      detail: '100 gold',
      route: '/progression',
    });
  });

  it('then the daily quest closest to done, with its progress', () => {
    const [a, b] = quests;
    const save: SaveData = {
      ...freshSave(),
      daily: {
        date: TODAY,
        progress: { [a.id]: a.goal.target * 0.2, [b.id]: b.goal.target * 0.6 },
        done: [],
      },
    };
    const goal = nextGoal(save, CONTENT, NOW);
    expect(goal).toMatchObject({ kind: 'quest', text: `Daily quest: ${b.description}` });
    expect(goal?.route).toBe('/glory');
  });

  it("forgets yesterday's quest progress", () => {
    const save: SaveData = {
      ...freshSave(),
      daily: { date: '2026-10-20', progress: {}, done: quests.map((q) => q.id) },
    };
    expect(nextGoal(save, CONTENT, NOW)?.kind).toBe('quest');
  });

  it('then the achievement closest to done, by its added-up progress', () => {
    const save = questsDone({
      ...freshSave(),
      achievementProgress: { slayer_1000: 640, slayer_10000: 640 },
    });
    expect(nextGoal(save, CONTENT, NOW)).toEqual({
      kind: 'achievement',
      text: 'Achievement: Slayer',
      detail: '640 / 1,000',
      route: '/glory',
    });
  });

  it('counts gods for every-god achievements', () => {
    const save = questsDone({ ...freshSave(), achievementGods: { pantheon: ['zeus', 'hades'] } });
    expect(nextGoal(save, CONTENT, NOW)?.detail).toBe(`2 / ${CONTENT.gods.length} gods`);
  });

  it('shows time goals in minutes', () => {
    const timed = quests.find((q) => q.goal.measure === 'timeSeconds');
    if (!timed) return;
    const save: SaveData = {
      ...freshSave(),
      daily: {
        date: TODAY,
        progress: { [timed.id]: 90 },
        done: quests.filter((q) => q !== timed).map((q) => q.id),
      },
    };
    expect(nextGoal(save, CONTENT, NOW)?.detail).toMatch(/^1:30 \/ \d+:\d\d$/);
  });

  it('is empty when nothing is left to show', () => {
    expect(nextGoal(questsDone(freshSave()), CONTENT, NOW)).toBeUndefined();
  });
});
