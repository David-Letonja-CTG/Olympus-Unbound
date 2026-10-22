import { WorldCollision } from '../core/collision';
import { Vec2 } from '../core/vector';

/** Side of a navigation cell, in world units. */
export const NAV_CELL = 32;
/** By default a cell is blocked when its centre lies within an obstacle's radius plus this: seams between wall blocks close. */
export const CLEARANCE = 16;
/** The distances are refreshed at most this often (steps), and only when a god changed cell or walls moved. */
const REFRESH_STEPS = 6;
/** Beyond this distance an enemy follows the field instead of testing its sight. */
export const SIGHT_RANGE = 900;
/** Line-of-sight sampling step along the line. */
const SIGHT_STEP = 24;
/** Blocked cells this close to either end of a sight line do not count (a body pressed against a wall). */
const SIGHT_SLACK = 24;

// Step costs in tenths of a cell: integers, so the pass is a bucket queue in linear time (10 and 14 ≈ 1 and √2).
const STRAIGHT = 10;
const DIAGONAL = 14;
const BUCKETS = DIAGONAL + 1;
// Neighbour offsets: the four sides first, then the corners.
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

/**
 * A flow field toward the gods (spec: enemy-spawning / finding the way). The playable area is cut into cells; a
 * shortest-path pass from every living god's cell gives each open cell its distance to the nearest god by path,
 * around obstacles and standing walls. A walker steps toward its lowest neighbour. One pass serves the whole horde, so a
 * bigger horde costs nothing more per enemy. Arrays are allocated once per realm (performance, D5).
 */
export class NavField {
  readonly cols: number;
  readonly rows: number;
  private readonly minX: number;
  private readonly minY: number;
  /** Static obstacles only, and static plus standing walls. */
  private readonly fixed: Uint8Array;
  readonly blocked: Uint8Array;
  /** Distance to the nearest god by path, in tenths of a cell; Infinity where none can be reached. */
  readonly dist: Float64Array;
  /** Cells waiting at each distance modulo `BUCKETS` (reused; they keep their capacity). */
  private readonly buckets: number[][] = Array.from({ length: BUCKETS }, () => []);
  private readonly sources = new Int32Array(8);
  private sourceCount = 0;
  private wallsVersion = -1;
  private sinceRefresh = REFRESH_STEPS;
  /** Steps since the realm began; staggers the enemies' sight tests. */
  tick = 0;

  /** `clearance`: room around obstacles; a big walker (a boss) gets a field of its own with more. */
  constructor(
    private readonly collision: WorldCollision,
    readonly clearance = CLEARANCE,
  ) {
    const b = collision.bounds;
    this.minX = b.minX;
    this.minY = b.minY;
    this.cols = Math.max(1, Math.ceil((b.maxX - b.minX) / NAV_CELL));
    this.rows = Math.max(1, Math.ceil((b.maxY - b.minY) / NAV_CELL));
    const n = this.cols * this.rows;
    this.fixed = new Uint8Array(n);
    this.blocked = new Uint8Array(n);
    this.dist = new Float64Array(n).fill(Infinity);
    for (const o of collision.obstacles) this.stamp(this.fixed, o.x, o.y, o.radius);
  }

  /** The cell holding (x, y), clamped to the grid. */
  cellAt(x: number, y: number): number {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.minX) / NAV_CELL)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor((y - this.minY) / NAV_CELL)));
    return r * this.cols + c;
  }

  /** Once per step: refreshes the distances when the gods changed cell or walls rose or sank. */
  update(gods: readonly { x: number; y: number; alive: boolean }[]): void {
    this.tick++;
    this.sinceRefresh++;
    const wallsMoved = this.collision.dynamicVersion !== this.wallsVersion;
    if (this.sinceRefresh < REFRESH_STEPS && !wallsMoved) return;
    let moved = wallsMoved;
    let count = 0;
    for (const g of gods) {
      if (!g.alive || count >= this.sources.length) continue;
      const cell = this.cellAt(g.x, g.y);
      if (count >= this.sourceCount || this.sources[count] !== cell) moved = true;
      this.sources[count++] = cell;
    }
    if (count !== this.sourceCount) moved = true;
    this.sourceCount = count;
    if (!moved) return;
    if (wallsMoved) {
      this.blocked.set(this.fixed);
      for (const w of this.collision.dynamicObstacles) this.stamp(this.blocked, w.x, w.y, w.radius);
      this.wallsVersion = this.collision.dynamicVersion;
    }
    this.sinceRefresh = 0;
    this.flood();
  }

  /**
   * Writes into `out` the unit direction from (x, y) toward the open neighbour cell nearest the gods by path.
   * False when there is none: at a god's cell, or cut off from every god (the caller walks straight).
   */
  toward(x: number, y: number, out: Vec2): boolean {
    const cell = this.cellAt(x, y);
    const own = this.blocked[cell] ? Infinity : this.dist[cell];
    if (!this.blocked[cell] && (own === 0 || own === Infinity)) return false;
    const c = cell % this.cols;
    const r = (cell - c) / this.cols;
    let best = -1;
    let bestD = own;
    for (let k = 0; k < 8; k++) {
      const n = this.neighbour(c, r, k);
      if (n < 0 || this.blocked[n]) continue;
      if (this.dist[n] < bestD) {
        bestD = this.dist[n];
        best = n;
      }
    }
    if (best < 0) return false;
    const bc = best % this.cols;
    const tx = this.minX + (bc + 0.5) * NAV_CELL;
    const ty = this.minY + ((best - bc) / this.cols + 0.5) * NAV_CELL;
    const dx = tx - x;
    const dy = ty - y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1e-6) return false;
    out.x = dx / length;
    out.y = dy / length;
    return true;
  }

  /**
   * True when a body of `radius` could walk the line between the points without meeting a blocked cell (their
   * ends excepted). Cells are blocked with room for a small body; a larger one also tests two side lines, so a big
   * walker does not see through a gap it would wedge in.
   */
  clearLine(ax: number, ay: number, bx: number, by: number, radius = 0): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > SIGHT_RANGE) return false;
    if (length < 1e-6) return true;
    const side = Math.max(0, radius - this.clearance);
    const nx = (-dy / length) * side;
    const ny = (dx / length) * side;
    for (let s = SIGHT_SLACK; s < length - SIGHT_SLACK; s += SIGHT_STEP) {
      const t = s / length;
      const x = ax + dx * t;
      const y = ay + dy * t;
      if (this.blocked[this.cellAt(x, y)]) return false;
      if (
        side > 0 &&
        (this.blocked[this.cellAt(x + nx, y + ny)] || this.blocked[this.cellAt(x - nx, y - ny)])
      )
        return false;
    }
    return true;
  }

  /** The neighbour `k` of cell (c, r), or -1 when off the grid or a corner cut past a blocked side. */
  private neighbour(c: number, r: number, k: number): number {
    const nc = c + DX[k];
    const nr = r + DY[k];
    if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) return -1;
    if (k >= 4) {
      // No corner cutting: both sides of a diagonal step must be open.
      if (this.blocked[r * this.cols + nc] || this.blocked[nr * this.cols + c]) return -1;
    }
    return nr * this.cols + nc;
  }

  private stamp(mask: Uint8Array, x: number, y: number, radius: number): void {
    const reach = radius + this.clearance;
    const c0 = Math.max(0, Math.floor((x - reach - this.minX) / NAV_CELL));
    const c1 = Math.min(this.cols - 1, Math.floor((x + reach - this.minX) / NAV_CELL));
    const r0 = Math.max(0, Math.floor((y - reach - this.minY) / NAV_CELL));
    const r1 = Math.min(this.rows - 1, Math.floor((y + reach - this.minY) / NAV_CELL));
    for (let r = r0; r <= r1; r++) {
      const cy = this.minY + (r + 0.5) * NAV_CELL - y;
      for (let c = c0; c <= c1; c++) {
        const cx = this.minX + (c + 0.5) * NAV_CELL - x;
        if (cx * cx + cy * cy <= reach * reach) mask[r * this.cols + c] = 1;
      }
    }
  }

  /**
   * Shortest paths from the gods' cells (seeds even when blocked: a god hugging a wall). Dial's algorithm: with
   * integer step costs ≤ 14 the open cells wait in 15 buckets by distance, so no heap is needed. A cell improved
   * after it was queued is met again later and skipped (its distance no longer matches the bucket's).
   */
  private flood(): void {
    const dist = this.dist;
    dist.fill(Infinity);
    const buckets = this.buckets;
    let pending = 0;
    for (let i = 0; i < this.sourceCount; i++) {
      const s = this.sources[i];
      if (dist[s] === 0) continue;
      dist[s] = 0;
      buckets[0].push(s);
      pending++;
    }
    for (let d = 0; pending > 0; d++) {
      const bucket = buckets[d % BUCKETS];
      while (bucket.length > 0) {
        const cell = bucket.pop() as number;
        pending--;
        if (dist[cell] !== d) continue;
        const c = cell % this.cols;
        const r = (cell - c) / this.cols;
        for (let k = 0; k < 8; k++) {
          const n = this.neighbour(c, r, k);
          if (n < 0 || this.blocked[n]) continue;
          const nd = d + (k < 4 ? STRAIGHT : DIAGONAL);
          if (nd < dist[n]) {
            dist[n] = nd;
            buckets[nd % BUCKETS].push(n);
            pending++;
          }
        }
      }
    }
  }
}
