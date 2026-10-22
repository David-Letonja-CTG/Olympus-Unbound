import { WorldCollision } from '../core/collision';
import { Circle } from '../core/spatial-hash';
import { Vec2 } from '../core/vector';
import { NAV_CELL, NavField } from './navigation';

const BOUNDS = { minX: 0, minY: 0, maxX: 1600, maxY: 1600 };

/** A wall of blocks from (x, y0) to (x, y1), `spacing` apart, like the Labyrinth's (radius 24, 67 apart). */
function wall(x: number, y0: number, y1: number, spacing = 67, radius = 24): Circle[] {
  const blocks: Circle[] = [];
  for (let y = y0; y <= y1; y += spacing) blocks.push({ x, y, radius });
  return blocks;
}

const god = (x: number, y: number) => ({ x, y, alive: true });

/** Walks a point along the field until it reaches `goal` or gives up; returns the steps taken, or -1. */
function walk(nav: NavField, collision: WorldCollision, from: Vec2, goal: Vec2): number {
  const body = { x: from.x, y: from.y, radius: 14 };
  const way = { x: 0, y: 0 };
  for (let i = 0; i < 2000; i++) {
    if (Math.hypot(body.x - goal.x, body.y - goal.y) < 40) return i;
    if (!nav.toward(body.x, body.y, way)) {
      const d = Math.hypot(goal.x - body.x, goal.y - body.y);
      way.x = (goal.x - body.x) / d;
      way.y = (goal.y - body.y) / d;
    }
    body.x += way.x * 4;
    body.y += way.y * 4;
    collision.resolve(body);
  }
  return -1;
}

describe('flow field (spec: enemy-spawning / finding the way)', () => {
  it('closes the seams between wall blocks and leaves a breach open', () => {
    const blocks = wall(800, 200, 1400).filter((b) => b.y !== 200 + 67 * 9);
    const nav = new NavField(new WorldCollision(BOUNDS, blocks));
    nav.update([god(1200, 800)]);
    const blockedAt = (x: number, y: number) => nav.blocked[nav.cellAt(x, y)] === 1;
    // Between two standing blocks (a 19 px seam): closed.
    expect(blockedAt(800, 200 + 67 * 3 + 33)).toBe(true);
    // Where the ninth block is missing: open.
    expect(blockedAt(800, 200 + 67 * 9)).toBe(false);
  });

  it('leads round the end of a wall, where walking straight would stop at it', () => {
    const collision = new WorldCollision(BOUNDS, wall(800, 300, 1300));
    const nav = new NavField(collision);
    const goal = { x: 1100, y: 800 };
    nav.update([god(goal.x, goal.y)]);
    expect(walk(nav, collision, { x: 500, y: 800 }, goal)).toBeGreaterThan(0);
    // The path goes round an end: longer than the straight line.
    const cell = nav.cellAt(500, 800);
    expect((nav.dist[cell] / 10) * NAV_CELL).toBeGreaterThan(700);
  });

  it('gives no way where no god can be reached, and none at the god', () => {
    // A closed ring of blocks around the god.
    const ring: Circle[] = [];
    for (let a = 0; a < 64; a++)
      ring.push({
        x: 800 + Math.cos(a / 10.2) * 200,
        y: 800 + Math.sin(a / 10.2) * 200,
        radius: 24,
      });
    const nav = new NavField(new WorldCollision(BOUNDS, ring));
    nav.update([god(800, 800)]);
    const way = { x: 0, y: 0 };
    expect(nav.toward(1300, 800, way)).toBe(false);
    expect(nav.toward(800, 800, way)).toBe(false);
    expect(nav.toward(900, 800, way)).toBe(true);
    expect(way.x).toBeLessThan(0);
  });

  it('heads for the god nearest by path, not by line', () => {
    // A long wall separates the walker from the nearer god; the farther god is on the walker's side.
    const nav = new NavField(new WorldCollision(BOUNDS, wall(800, 0, 1600)));
    nav.update([god(900, 800), god(200, 800)]);
    const way = { x: 0, y: 0 };
    expect(nav.toward(700, 800, way)).toBe(true);
    expect(way.x).toBeLessThan(-0.7);
  });

  it('follows walls as they rise and sink', () => {
    const collision = new WorldCollision(BOUNDS, []);
    const nav = new NavField(collision);
    nav.update([god(1200, 800)]);
    const way = { x: 0, y: 0 };
    nav.toward(1000, 800, way);
    expect(way.x).toBeGreaterThan(0.9);
    // A wall rises across the way, longer below than above: the field goes round above it at once.
    const risen = wall(1100, 500, 1500, 40);
    collision.setDynamic(risen);
    nav.update([god(1200, 800)]);
    nav.toward(1000, 800, way);
    expect(way.y).toBeLessThan(-0.3);
    collision.setDynamic([]);
    nav.update([god(1200, 800)]);
    nav.toward(1000, 800, way);
    expect(way.x).toBeGreaterThan(0.9);
  });

  it('sees across open ground and not through a wall', () => {
    const nav = new NavField(new WorldCollision(BOUNDS, wall(800, 300, 1300)));
    nav.update([god(1100, 800)]);
    expect(nav.clearLine(900, 800, 1300, 900)).toBe(true);
    expect(nav.clearLine(500, 800, 1100, 800)).toBe(false);
  });
});
