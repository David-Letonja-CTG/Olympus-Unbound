import { WorldCollision } from './collision';
import { hashSeed, Rng } from './rng';
import { SpatialHash } from './spatial-hash';
import { computeStats, DEFAULT_STATS, scaleModifiers } from './stats';

describe('Rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = new Rng(847291);
    const b = new Rng(847291);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds and stays in [0, 1)', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const values = Array.from({ length: 1000 }, () => a.next());
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(values.slice(0, 5)).not.toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('produces integers in the inclusive range and picks by weight', () => {
    const rng = new Rng('ranges');
    const ints = new Set(Array.from({ length: 500 }, () => rng.int(2, 4)));
    expect([...ints].sort()).toEqual([2, 3, 4]);
    const items = [
      { id: 'never', w: 0 },
      { id: 'always', w: 5 },
    ];
    for (let i = 0; i < 50; i++) expect(rng.weighted(items, (x) => x.w)?.id).toBe('always');
    expect(rng.weighted([{ w: 0 }], (x) => x.w)).toBeUndefined();
  });

  it('forks independent streams: using one does not shift another', () => {
    const plain = new Rng(5).fork('map');
    const root = new Rng(5);
    root.fork('combat').next();
    root.fork('combat').next();
    const map = root.fork('map');
    expect(map.next()).toBe(plain.next());
  });

  it('hashes numbers and their text the same way', () => {
    expect(hashSeed(847291)).toBe(hashSeed('847291'));
  });
});

describe('computeStats', () => {
  it('adds flat modifiers before applying percentages', () => {
    const stats = computeStats({ moveSpeed: 200 }, [
      { stat: 'moveSpeed', flat: 20 },
      { stat: 'moveSpeed', percent: 0.1 },
      { stat: 'moveSpeed', percent: 0.1 },
    ]);
    expect(stats.moveSpeed).toBeCloseTo(264);
  });

  it('starts from defaults and clamps reductions', () => {
    const stats = computeStats({}, [{ stat: 'cooldown', percent: -0.95 }]);
    expect(stats.might).toBe(DEFAULT_STATS.might);
    expect(stats.cooldown).toBe(0.3);
  });

  it('scales modifiers by level', () => {
    expect(scaleModifiers([{ stat: 'might', flat: 0.1 }], 3)[0].flat).toBeCloseTo(0.3);
  });
});

describe('SpatialHash', () => {
  it('finds overlapping circles across cells exactly once', () => {
    const grid = new SpatialHash<{ x: number; y: number; radius: number; id: number }>(32);
    grid.insert({ x: 10, y: 10, radius: 40, id: 1 });
    grid.insert({ x: 300, y: 300, radius: 5, id: 2 });
    const found: number[] = [];
    grid.query(30, 30, 20, (item) => {
      found.push(item.id);
    });
    expect(found).toEqual([1]);
  });
});

describe('WorldCollision', () => {
  const world = new WorldCollision({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 }, [
    { x: 500, y: 500, radius: 20 },
  ]);

  it('pushes a body out of an obstacle along the contact normal', () => {
    const body = { x: 510, y: 500, radius: 14 };
    world.resolve(body);
    expect(Math.hypot(body.x - 500, body.y - 500)).toBeCloseTo(34);
  });

  it('lets a body slide along an obstacle instead of stopping', () => {
    // Walking right into the column, slightly above its centre: the push-out keeps sideways progress.
    const body = { x: 470, y: 494, radius: 14 };
    for (let i = 0; i < 40; i++) {
      body.x += 3;
      world.resolve(body);
    }
    expect(body.x).toBeGreaterThan(520);
  });

  it('keeps bodies inside the playable bounds', () => {
    const body = { x: -50, y: 1200, radius: 14 };
    world.resolve(body);
    expect(body).toEqual({ x: 14, y: 986, radius: 14 });
  });

  it('reports blocked positions', () => {
    expect(world.isBlocked(500, 530, 14)).toBe(true);
    expect(world.isBlocked(100, 100, 14)).toBe(false);
  });
});
