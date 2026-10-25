import { FLEE_RANGE, FLEE_TIME, Flock, Storm } from './wildlife';

/** A repeatable stand-in for Math.random. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const view = { x: 0, y: 0, width: 2000, height: 2000 };
const focus = { x: 1000, y: 1000 };
const open = () => false;

describe('wildlife (spec: visual-atmosphere / ambient life)', () => {
  it('places its creatures near the gods, on open ground in view', () => {
    const flock = new Flock(6, 'bird', seeded());
    for (let i = 0; i < 300; i++) flock.update(1 / 60, focus, [focus], view, open);
    const idle = flock.creatures.filter((c) => c.state === 'idle');
    expect(idle.length).toBe(6);
    for (const c of idle) {
      const d = Math.hypot(c.x - focus.x, c.y - focus.y);
      expect(d).toBeGreaterThanOrEqual(FLEE_RANGE * 1.5);
      expect(d).toBeLessThanOrEqual(520);
    }
  });

  it('never places a creature on blocked ground', () => {
    const flock = new Flock(4, 'crawler', seeded(3));
    for (let i = 0; i < 300; i++) flock.update(1 / 60, focus, [focus], view, () => true);
    expect(flock.creatures.every((c) => c.state === 'gone')).toBe(true);
  });

  it('flies off when a god comes close, fades, and is placed again later', () => {
    const flock = new Flock(1, 'bird', seeded(5));
    for (let i = 0; i < 300; i++) flock.update(1 / 60, focus, [focus], view, open);
    const c = flock.creatures[0];
    expect(c.state).toBe('idle');
    const god = { x: c.x + 50, y: c.y };
    flock.update(1 / 60, focus, [god], view, open);
    expect(c.state).toBe('fleeing');
    // Away from the god and up into the sky.
    expect(c.vx).toBeLessThan(0);
    expect(c.vy).toBeLessThan(0);
    for (let i = 0; i < FLEE_TIME * 60 + 2; i++) flock.update(1 / 60, focus, [god], view, open);
    expect(c.state).toBe('gone');
    expect(flock.alpha(c)).toBe(0);
    for (let i = 0; i < 4 * 60; i++) flock.update(1 / 60, focus, [focus], view, open);
    expect(c.state).toBe('idle');
  });

  it('runs off along the ground when it cannot fly', () => {
    const flock = new Flock(1, 'hopper', seeded(7));
    for (let i = 0; i < 300; i++) flock.update(1 / 60, focus, [focus], view, open);
    const c = flock.creatures[0];
    flock.update(1 / 60, focus, [{ x: c.x, y: c.y + 40 }], view, open);
    expect(c.state).toBe('fleeing');
    expect(c.vy).toBeLessThan(0);
    expect(Math.hypot(c.vx, c.vy)).toBeCloseTo(190, 5);
  });
});

describe('the storm (spec: visual-atmosphere / ambient life)', () => {
  it('flashes within its interval and rolls thunder after each flash', () => {
    const storm = new Storm([10, 20], seeded(11));
    let flashes = 0;
    let thunders = 0;
    let lit = false;
    for (let i = 0; i < 60 * 60; i++) {
      const { flash, thunder } = storm.update(1 / 60);
      if (flash > 0.9 && !lit) flashes++;
      lit = flash > 0.9;
      if (thunder) thunders++;
    }
    expect(flashes).toBeGreaterThanOrEqual(3);
    expect(flashes).toBeLessThanOrEqual(6);
    expect(Math.abs(thunders - flashes)).toBeLessThanOrEqual(1);
  });
});
