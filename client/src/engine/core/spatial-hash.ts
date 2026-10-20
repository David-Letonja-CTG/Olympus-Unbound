export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/** One cell's items, each with the first cell (lowest column, then row) it was inserted into. */
interface Bucket<T> {
  readonly items: T[];
  readonly firstX: number[];
  readonly firstY: number[];
}

/**
 * Uniform grid of buckets for fast "who is near this point" queries. Rebuilt once per step for moving
 * entities (cheap: clear + insert), built once for static obstacles.
 */
export class SpatialHash<T extends Circle> {
  private readonly buckets = new Map<number, Bucket<T>>();
  private readonly pool: Bucket<T>[] = [];

  constructor(private readonly cellSize: number) {}

  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.items.length = 0;
      bucket.firstX.length = 0;
      bucket.firstY.length = 0;
      this.pool.push(bucket);
    }
    this.buckets.clear();
  }

  /** Inserts by bounding box, so large circles are found from every cell they touch. */
  insert(item: T): void {
    const minX = this.cell(item.x - item.radius);
    const maxX = this.cell(item.x + item.radius);
    const minY = this.cell(item.y - item.radius);
    const maxY = this.cell(item.y + item.radius);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.key(cx, cy);
        let bucket = this.buckets.get(key);
        if (!bucket) {
          bucket = this.pool.pop() ?? { items: [], firstX: [], firstY: [] };
          this.buckets.set(key, bucket);
        }
        bucket.items.push(item);
        bucket.firstX.push(minX);
        bucket.firstY.push(minY);
      }
    }
  }

  /**
   * Calls `visit` once for every item whose circle overlaps the query circle. Returning `false` from `visit`
   * stops the query early.
   */
  query(x: number, y: number, radius: number, visit: (item: T) => boolean | void): void {
    const minX = this.cell(x - radius);
    const maxX = this.cell(x + radius);
    const minY = this.cell(y - radius);
    const maxY = this.cell(y + radius);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.buckets.get(this.key(cx, cy));
        if (!bucket) continue;
        const { items, firstX, firstY } = bucket;
        for (let i = 0; i < items.length; i++) {
          // An item in several cells is met first in the first cell both ranges share: visit it there only. This
          // is the order a set of seen items gave, without its cost (spec: phone-play / phone performance).
          if (
            cx !== (firstX[i] > minX ? firstX[i] : minX) ||
            cy !== (firstY[i] > minY ? firstY[i] : minY)
          )
            continue;
          const item = items[i];
          const reach = radius + item.radius;
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= reach * reach && visit(item) === false) return;
        }
      }
    }
  }

  private cell(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  private key(cx: number, cy: number): number {
    // Cells stay within ±32k for any realistic map, which fits the packing.
    return ((cx + 32768) << 16) | (cy + 32768);
  }
}
