import { CONTENT } from '../testing/content';
import { MapGenConfig } from '../data/types';
import { generateArena } from './generate-arena';

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
      expect(nearest).toBeLessThan(140);
      expect(
        Math.hypot(b.x - arena.spawn.x, b.y - arena.spawn.y) - b.radius,
      ).toBeGreaterThanOrEqual(olympus.spawnClearRadius);
    }
    expect(olympus.obstacles.find((o) => o.id === 'brazier')?.light?.radius).toBeGreaterThan(0);
  });
});
