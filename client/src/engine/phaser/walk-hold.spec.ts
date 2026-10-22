import { WALK_HOLD_MS, WalkHold } from './walk-hold';

describe('walking figures', () => {
  it('keeps walking through short stops, and stops after a real pause', () => {
    const hold = new WalkHold();
    expect(hold.walking(1, false, 0)).toBe(false);
    expect(hold.walking(1, true, 100)).toBe(true);
    // Jitter: still for a frame or two between moves.
    expect(hold.walking(1, false, 117)).toBe(true);
    expect(hold.walking(1, true, 133)).toBe(true);
    expect(hold.walking(1, false, 133 + WALK_HOLD_MS - 1)).toBe(true);
    expect(hold.walking(1, false, 133 + WALK_HOLD_MS)).toBe(false);
  });

  it('tells figures apart and forgets the long still', () => {
    const hold = new WalkHold();
    hold.walking(1, true, 0);
    expect(hold.walking(2, false, 10)).toBe(false);
    hold.prune(2000);
    expect(hold.walking(1, false, 2000)).toBe(false);
  });
});
