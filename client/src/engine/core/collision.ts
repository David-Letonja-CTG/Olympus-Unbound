import { Bounds } from '../maps/generate-arena';
import { Circle, SpatialHash } from './spatial-hash';

/** Something that moves and collides as a circle. */
export interface Body {
  x: number;
  y: number;
  radius: number;
}

/**
 * Static world collision: circular obstacles plus the playable bounds. Bodies are pushed out of obstacles along
 * the contact normal, which makes them slide around obstacles instead of stopping.
 */
export class WorldCollision {
  private readonly grid = new SpatialHash<Circle>(128);
  /** Obstacles that come and go (shifting walls, spec: boss-encounter); few, so checked one by one. */
  private dynamic: readonly Circle[] = [];

  setDynamic(obstacles: readonly Circle[]): void {
    this.dynamic = obstacles;
  }

  /** True when a body overlaps one of the obstacles that come and go. */
  touchesDynamic(body: Body): boolean {
    for (const o of this.dynamic)
      if ((body.x - o.x) ** 2 + (body.y - o.y) ** 2 < (o.radius + body.radius) ** 2) return true;
    return false;
  }

  private pushOut(body: Body, o: Circle): void {
    const dx = body.x - o.x;
    const dy = body.y - o.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const overlap = o.radius + body.radius - dist;
    if (overlap <= 0) return;
    if (dist > 1e-6) {
      body.x += (dx / dist) * overlap;
      body.y += (dy / dist) * overlap;
    } else {
      body.x += overlap;
    }
  }

  constructor(
    readonly bounds: Bounds,
    readonly obstacles: readonly Circle[],
  ) {
    for (const o of obstacles) this.grid.insert(o);
  }

  resolve(body: Body): void {
    // Two passes settle bodies wedged between two close obstacles.
    for (let pass = 0; pass < 2; pass++) {
      this.grid.query(body.x, body.y, body.radius, (o) => {
        const dx = body.x - o.x;
        const dy = body.y - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const overlap = o.radius + body.radius - dist;
        if (overlap <= 0) return;
        if (dist > 1e-6) {
          body.x += (dx / dist) * overlap;
          body.y += (dy / dist) * overlap;
        } else {
          body.x += overlap;
        }
      });
      for (const o of this.dynamic) this.pushOut(body, o);
    }
    this.clampToBounds(body);
  }

  clampToBounds(body: Body): void {
    const b = this.bounds;
    if (body.x < b.minX + body.radius) body.x = b.minX + body.radius;
    if (body.x > b.maxX - body.radius) body.x = b.maxX - body.radius;
    if (body.y < b.minY + body.radius) body.y = b.minY + body.radius;
    if (body.y > b.maxY - body.radius) body.y = b.maxY - body.radius;
  }

  /** True when a circle at (x, y) would overlap an obstacle or leave the bounds. */
  isBlocked(x: number, y: number, radius: number): boolean {
    const b = this.bounds;
    if (x - radius < b.minX || y - radius < b.minY || x + radius > b.maxX || y + radius > b.maxY)
      return true;
    let blocked = false;
    this.grid.query(x, y, radius, () => {
      blocked = true;
      return false;
    });
    return blocked || this.touchesDynamic({ x, y, radius });
  }
}
