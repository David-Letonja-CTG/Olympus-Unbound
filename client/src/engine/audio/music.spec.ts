import { musicIntensity, TierTracker } from './music-intensity';
import { barNotes, TIERS } from './music-score';

const calm = { realmTime: 5, bossAt: 420, depth: 0, enemiesNear: 3, bossAwake: false };

/** Feeds a situation for `seconds` at 10 updates a second; returns the tier reached. */
function hold(tracker: TierTracker, intensity: number, seconds: number) {
  let tier = tracker.tier;
  for (let i = 0; i < seconds * 10; i++) tier = tracker.update(intensity, 0.1);
  return tier;
}

describe('what drives the music (spec: music / what drives the music)', () => {
  it('begins calm', () => {
    expect(hold(new TierTracker(), musicIntensity(calm), 5)).toBe(0);
  });

  it('builds toward the boss to Battle or above', () => {
    const near = musicIntensity({ ...calm, realmTime: 400, enemiesNear: 15 });
    expect(hold(new TierTracker(), near, 5)).toBeGreaterThanOrEqual(2);
  });

  it('starts above Calm in the third realm', () => {
    expect(hold(new TierTracker(), musicIntensity({ ...calm, depth: 2 }), 5)).toBeGreaterThan(0);
  });

  it('rises when surrounded and falls back slowly after', () => {
    const tracker = new TierTracker();
    const before = hold(tracker, musicIntensity(calm), 5);
    const surrounded = hold(tracker, musicIntensity({ ...calm, enemiesNear: 40 }), 3);
    expect(surrounded).toBeGreaterThan(before);
    // A moment later the tier still holds (it falls slowly), and long after it is back.
    expect(hold(tracker, musicIntensity(calm), 1)).toBe(surrounded);
    expect(hold(tracker, musicIntensity(calm), 40)).toBe(before);
  });

  it('plays Titan while a boss is awake, and only then', () => {
    const tracker = new TierTracker();
    expect(hold(tracker, musicIntensity({ ...calm, bossAwake: true }), 1)).toBe(4);
    const worst = musicIntensity({
      realmTime: 999,
      bossAt: 420,
      depth: 9,
      enemiesNear: 200,
      bossAwake: false,
    });
    expect(hold(new TierTracker(), worst, 10)).toBe(3);
  });
});

describe('the score (spec: music / battle music)', () => {
  it('gets faster and heavier tier by tier', () => {
    for (let t = 1; t < TIERS.length; t++) expect(TIERS[t].bpm).toBeGreaterThan(TIERS[t - 1].bpm);
    const parts = (tier: 0 | 1 | 2 | 3 | 4) => new Set(barNotes(tier, 1).map((n) => n.part));
    expect(parts(0).has('guitar')).toBe(false);
    expect(parts(0).has('lyre')).toBe(true);
    expect(parts(2).has('guitar')).toBe(true);
    expect(parts(3).has('mute')).toBe(true);
    const kicks = (tier: 2 | 3 | 4) => barNotes(tier, 1).filter((n) => n.part === 'kick').length;
    expect(kicks(4)).toBeGreaterThan(kicks(3));
    expect(kicks(3)).toBeGreaterThan(kicks(2));
  });

  it('keeps every note inside its bar, the same for the same bar', () => {
    for (const tier of [0, 1, 2, 3, 4] as const)
      for (let bar = 0; bar < 8; bar++) {
        const notes = barNotes(tier, bar);
        expect(notes.length).toBeGreaterThan(0);
        for (const n of notes) {
          expect(n.beat).toBeGreaterThanOrEqual(0);
          expect(n.beat).toBeLessThan(4);
          expect(n.velocity).toBeGreaterThan(0);
          expect(n.velocity).toBeLessThanOrEqual(1);
        }
        expect(barNotes(tier, bar)).toEqual(notes);
      }
  });

  it('follows the D minor progression in the bass', () => {
    const roots = [0, 1, 2, 3].map((bar) => barNotes(2, bar).find((n) => n.part === 'bass')?.pitch);
    expect(roots).toEqual([38, 34, 36, 33]);
  });
});
