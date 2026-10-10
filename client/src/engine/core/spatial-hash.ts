export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/**
 * Uniform grid of buckets for fast "who is near this point" queries. Rebuilt once per step for moving
 * entities (cheap: clear + insert), built once for static obstacles.
 */
export class SpatialHash<T extends Circle> {
  private readonly buckets = new Map<number, T[]>();
  private readonly pool: T[][] = [];
  private readonly seen = new Set<T>();
  private depth = 0;

  constructor(private readonly cellSize: number) {}

  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.length = 0;
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
          bucket = this.pool.pop() ?? [];
          this.buckets.set(key, bucket);
        }
        bucket.push(item);
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
    const single = minX === maxX && minY === maxY;
    // A query started from inside another query's callback gets its own de-duplication set.
    const seen = this.depth === 0 ? this.seen : new Set<T>();
    seen.clear();
    this.depth++;
    try {
      for (let cx = minX; cx <= maxX; cx++) {
        for (let cy = minY; cy <= maxY; cy++) {
          const bucket = this.buckets.get(this.key(cx, cy));
          if (!bucket) continue;
          for (const item of bucket) {
            if (!single) {
              if (seen.has(item)) continue;
              seen.add(item);
            }
            const reach = radius + item.radius;
            const dx = item.x - x;
            const dy = item.y - y;
            if (dx * dx + dy * dy <= reach * reach && visit(item) === false) return;
          }
        }
      }
    } finally {
      this.depth--;
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
