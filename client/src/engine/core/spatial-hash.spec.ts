import { Rng } from './rng';
import { Circle, SpatialHash } from './spatial-hash';

interface Item extends Circle {
  readonly id: number;
}

/** What a query must return: every overlapping item once, at its first cell in the query's column-then-row order. */
function reference(
  items: readonly Item[],
  cell: number,
  x: number,
  y: number,
  r: number,
): number[] {
  const at = (v: number) => Math.floor(v / cell);
  const result: number[] = [];
  for (let cx = at(x - r); cx <= at(x + r); cx++) {
    for (let cy = at(y - r); cy <= at(y + r); cy++) {
      for (const item of items) {
        const inCell =
          at(item.x - item.radius) <= cx &&
          cx <= at(item.x + item.radius) &&
          at(item.y - item.radius) <= cy &&
          cy <= at(item.y + item.radius);
        const overlaps = Math.hypot(item.x - x, item.y - y) <= r + item.radius;
        if (inCell && overlaps && !result.includes(item.id)) result.push(item.id);
      }
    }
  }
  return result;
}

describe('SpatialHash', () => {
  it('finds every overlapping circle once, in the same order as before (D5: same runs)', () => {
    const rng = new Rng(7);
    const cell = 64;
    const hash = new SpatialHash<Item>(cell);
    for (let round = 0; round < 5; round++) {
      hash.clear();
      const items: Item[] = [];
      for (let id = 0; id < 300; id++) {
        const item = {
          id,
          x: rng.range(-200, 1200),
          y: rng.range(-200, 1200),
          radius: rng.range(4, id % 10 === 0 ? 150 : 30),
        };
        items.push(item);
        hash.insert(item);
      }
      for (let q = 0; q < 200; q++) {
        const x = rng.range(-100, 1100);
        const y = rng.range(-100, 1100);
        const r = rng.range(1, 260);
        const found: number[] = [];
        hash.query(x, y, r, (item) => void found.push(item.id));
        expect(found).toEqual(reference(items, cell, x, y, r));
      }
    }
  });

  it('stops when the visitor returns false, and supports nested queries', () => {
    const hash = new SpatialHash<Item>(32);
    for (let id = 0; id < 10; id++) hash.insert({ id, x: id * 5, y: 0, radius: 20 });
    let visits = 0;
    hash.query(0, 0, 100, () => ++visits < 3);
    expect(visits).toBe(3);
    const pairs: number[][] = [];
    hash.query(0, 0, 100, (a) => {
      hash.query(a.x, a.y, 1, (b) => void pairs.push([a.id, b.id]));
    });
    expect(pairs.filter(([a, b]) => a === b)).toHaveLength(10);
  });
});
