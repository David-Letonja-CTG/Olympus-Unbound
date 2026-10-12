import { CONTENT } from '../testing/content';
import { MapGenConfig } from '../data/types';
import { distanceToPolyline, generateArena, templeEntrance } from './generate-arena';
import { WorldCollision } from '../core/collision';

const olympus = CONTENT.realms.find((r) => r.id === 'mount_olympus')?.map as MapGenConfig;

describe('generateArena', () => {
  it('produces identical arenas for the same seed', () => {
    expect(generateArena(olympus, 847291)).toEqual(generateArena(olympus, 847291));
  });

  it('produces different layouts for different seeds', () => {
    const a = generateArena(olympus, 1);
    const b = generateArena(olympus, 2);
    expect(a.obstacles.map((o) => [o.x, o.y])).not.toEqual(b.obstacles.map((o) => [o.x, o.y]));
  });

  it('keeps the spawn plaza and the boss arena clear for 50 seeds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const arena = generateArena(olympus, seed);
      for (const o of arena.obstacles) {
        expect(
          Math.hypot(o.x - arena.spawn.x, o.y - arena.spawn.y) - o.radius,
        ).toBeGreaterThanOrEqual(olympus.spawnClearRadius);
        expect(
          Math.hypot(o.x - arena.bossArena.x, o.y - arena.bossArena.y) - o.radius,
        ).toBeGreaterThanOrEqual(arena.bossArena.radius);
      }
      const bossDistance = Math.hypot(
        arena.bossArena.x - arena.spawn.x,
        arena.bossArena.y - arena.spawn.y,
      );
      expect(bossDistance).toBeGreaterThanOrEqual(olympus.bossArena.minDistanceFromSpawn);
    }
  });

  it('leaves a passable gap between obstacles and keeps them in bounds', () => {
    const arena = generateArena(olympus, 847291);
    const { bounds } = arena;
    expect(arena.obstacles.length).toBeGreaterThan(40);
    expect(arena.obstacles.length).toBeLessThanOrEqual(olympus.maxObstacles);
    for (const [i, a] of arena.obstacles.entries()) {
      expect(a.x - a.radius).toBeGreaterThanOrEqual(bounds.minX);
      expect(a.y + a.radius).toBeLessThanOrEqual(bounds.maxY);
      for (const b of arena.obstacles.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius).toBeGreaterThanOrEqual(
          olympus.minObstacleGap,
        );
      }
    }
  });

  it('uses only the realm’s own obstacle, decoration and terrain kinds', () => {
    const arena = generateArena(olympus, 99);
    const obstacleKinds = new Set(olympus.obstacles.map((o) => o.id));
    const decorationKinds = new Set(olympus.decorations.map((d) => d.id));
    expect(arena.obstacles.every((o) => obstacleKinds.has(o.kind))).toBe(true);
    expect(arena.decorations.every((d) => decorationKinds.has(d.kind))).toBe(true);
    expect(arena.decorations.length).toBeGreaterThan(100);
    expect(arena.terrainTypes).toEqual(olympus.terrain.types.map((t) => t.id));
  });

  it('builds a cliff border and temple plazas', () => {
    const arena = generateArena(olympus, 5);
    const cliff = arena.terrainTypes.indexOf('cliff');
    expect(arena.terrain[0]).toBe(cliff);
    expect(arena.terrain[arena.terrain.length - 1]).toBe(cliff);
    // Spawn plaza + boss arena + at least three temples.
    expect(arena.plazas.length).toBeGreaterThanOrEqual(5);
  });

  it('follows the configured dimensions', () => {
    const small = generateArena(
      {
        ...olympus,
        widthTiles: 20,
        heightTiles: 20,
        spawnClearRadius: 120,
        bossArena: { radius: 80, minDistanceFromSpawn: 300 },
      },
      3,
    );
    expect(small.terrain.length).toBe(400);
    expect(small.width).toBe(20 * olympus.tileSize);
    for (const o of small.obstacles) {
      expect(o.x).toBeLessThan(small.width);
      expect(o.y).toBeLessThan(small.height);
    }
  });
});

describe('braziers (plaza lights)', () => {
  it('places light-bearing braziers around the plazas, deterministically and outside the clear zones', () => {
    const arena = generateArena(olympus, 847291);
    const braziers = arena.obstacles.filter((o) => o.kind === 'brazier');
    expect(braziers.length).toBeGreaterThanOrEqual(8);
    expect(generateArena(olympus, 847291).obstacles.filter((o) => o.kind === 'brazier')).toEqual(
      braziers,
    );
    for (const b of braziers) {
      const nearest = Math.min(
        ...arena.plazas.map((p) => Math.hypot(b.x - p.x, b.y - p.y) - p.radius),
      );
      // Around a plaza, or flanking a temple's altar.
      const onTemple = arena.temples.some(
        (t) => Math.abs(b.x - t.x) <= t.width / 2 && Math.abs(b.y - t.y) <= t.depth / 2,
      );
      expect(onTemple || nearest < 140).toBe(true);
      expect(
        Math.hypot(b.x - arena.spawn.x, b.y - arena.spawn.y) - b.radius,
      ).toBeGreaterThanOrEqual(olympus.spawnClearRadius);
    }
    expect(olympus.obstacles.find((o) => o.id === 'brazier')?.light?.radius).toBeGreaterThan(0);
  });
});

describe('roads and landmarks (spec: arena-generation / roads, temple landmark)', () => {
  it('joins the spawn to every ruin, the temple and the boss arena, with no obstacle on a road', () => {
    for (let seed = 0; seed < 20; seed++) {
      const arena = generateArena(olympus, seed);
      const ruins = arena.plazas.filter(
        (p) =>
          !(p.x === arena.spawn.x && p.y === arena.spawn.y) &&
          !(p.x === arena.bossArena.x && p.y === arena.bossArena.y),
      );
      const ends = arena.roads.map((r) => r.points.slice(-2).join(':'));
      for (const target of [
        ...ruins,
        ...arena.temples.map((tp) => templeEntrance(tp, arena.spawn)),
        arena.bossArena,
      ])
        expect(ends).toContain(`${Math.round(target.x)}:${Math.round(target.y)}`);
      for (const road of arena.roads) {
        expect(road.points.slice(0, 2)).toEqual([
          Math.round(arena.spawn.x),
          Math.round(arena.spawn.y),
        ]);
        for (const o of arena.obstacles)
          expect(distanceToPolyline(o.x, o.y, road.points)).toBeGreaterThanOrEqual(
            road.width / 2 + o.radius,
          );
      }
    }
  });

  it('places exactly one walkable temple with its altar, away from the spawn and the boss arena', () => {
    for (let seed = 0; seed < 20; seed++) {
      const arena = generateArena(olympus, seed);
      expect(arena.temples.length).toBe(1);
      const [t] = arena.temples;
      const reach = Math.hypot(t.width, t.depth) / 2;
      expect(Math.hypot(t.x - arena.spawn.x, t.y - arena.spawn.y)).toBeGreaterThan(
        olympus.spawnClearRadius + reach,
      );
      expect(Math.hypot(t.x - arena.bossArena.x, t.y - arena.bossArena.y)).toBeGreaterThan(
        arena.bossArena.radius + reach,
      );
      const inside = arena.obstacles.filter(
        (o) => Math.abs(o.x - t.x) <= t.width / 2 + 1 && Math.abs(o.y - t.y) <= t.depth / 2 + 1,
      );
      expect(inside.filter((o) => o.kind === 'altar').length).toBe(1);
      expect(
        inside.filter((o) => o.kind === 'column' || o.kind === 'broken_column').length,
      ).toBeGreaterThan(4);
    }
  });
});

describe('the Labyrinth (spec: arena-generation / maze)', () => {
  const labyrinth = CONTENT.realms.find((r) => r.id === 'labyrinth_of_crete')?.map as MapGenConfig;
  const PLAYER = 14;

  /** Flood fill over a 16-unit grid of places a player can stand, from the spawn. */
  function reachable(arena: ReturnType<typeof generateArena>) {
    const collision = new WorldCollision(arena.bounds, arena.obstacles);
    const step = 16;
    const cols = Math.ceil(arena.width / step);
    const rows = Math.ceil(arena.height / step);
    const seen = new Uint8Array(cols * rows);
    const open = (c: number, r: number) =>
      !collision.isBlocked(c * step + step / 2, r * step + step / 2, PLAYER);
    const start = Math.floor(arena.spawn.y / step) * cols + Math.floor(arena.spawn.x / step);
    const queue = [start];
    seen[start] = 1;
    let free = 0;
    let reached = 0;
    for (let i = 0; i < cols * rows; i++) if (open(i % cols, Math.floor(i / cols))) free++;
    while (queue.length) {
      const at = queue.pop() as number;
      reached++;
      const c = at % cols;
      const r = Math.floor(at / cols);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const [nc, nr] = [c + dc, r + dr];
        const n = nr * cols + nc;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen[n] || !open(nc, nr)) continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
    const at = (x: number, y: number) => seen[Math.floor(y / step) * cols + Math.floor(x / step)];
    return { share: reached / free, at };
  }

  it('builds walls no god or creature fits through', () => {
    const arena = generateArena(labyrinth, 7);
    const walls = arena.obstacles.filter((o) => o.kind === 'wall');
    expect(walls.length).toBeGreaterThan(200);
    const tight = walls.filter((a) =>
      walls.some(
        (b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius < PLAYER * 2,
      ),
    );
    expect(tight.length / walls.length).toBeGreaterThan(0.8);
  });

  it('keeps the boss arena and nearly all the floor reachable from the spawn for 10 seeds', () => {
    for (let seed = 0; seed < 10; seed++) {
      const arena = generateArena(labyrinth, seed);
      const { share, at } = reachable(arena);
      expect(at(arena.bossArena.x, arena.bossArena.y)).toBe(1);
      expect(share).toBeGreaterThan(0.97);
    }
  });

  it("marks the road to the boss arena for Ariadne's thread", () => {
    const arena = generateArena(labyrinth, 3);
    const toBoss = arena.roads.filter((r) => r.toBoss);
    expect(toBoss).toHaveLength(1);
    expect(toBoss[0].points.slice(-2)).toEqual([
      Math.round(arena.bossArena.x),
      Math.round(arena.bossArena.y),
    ]);
  });
});
