import { Rng } from '../core/rng';
import { SpatialHash } from '../core/spatial-hash';
import { distanceSq } from '../core/vector';
import { MapGenConfig, ObstacleKind, PointOfInterestRule } from '../data/types';
import { ValueNoise } from './value-noise';

export interface ArenaObstacle {
  readonly id: number;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ArenaDecoration {
  readonly kind: string;
  readonly x: number;
  readonly y: number;
}

/** The playable rectangle (inside the cliff border), in world units. */
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Generated arena data, independent of how it is drawn. */
export interface ArenaData {
  readonly seed: number;
  readonly widthTiles: number;
  readonly heightTiles: number;
  readonly tileSize: number;
  readonly width: number;
  readonly height: number;
  /** Terrain per tile (row-major), as an index into `terrainTypes`. */
  readonly terrain: Uint8Array;
  readonly terrainTypes: readonly string[];
  readonly bounds: Bounds;
  readonly obstacles: readonly ArenaObstacle[];
  readonly decorations: readonly ArenaDecoration[];
  readonly spawn: { readonly x: number; readonly y: number };
  readonly bossArena: { readonly x: number; readonly y: number; readonly radius: number };
  /** Round marble floors (spawn plaza, boss arena, temple plazas), for drawing. */
  readonly plazas: readonly { readonly x: number; readonly y: number; readonly radius: number }[];
}

/**
 * Generates an arena from a realm's map configuration and a seed (D5). Pure and deterministic: the same
 * configuration and seed always produce the same arena. Steps: terrain from noise → spawn plaza and boss arena
 * → points of interest → scattered obstacles → decorations.
 */
export function generateArena(config: MapGenConfig, seed: number): ArenaData {
  const rng = new Rng(`arena:${seed}`);
  const { widthTiles, heightTiles, tileSize, borderTiles } = config;
  const width = widthTiles * tileSize;
  const height = heightTiles * tileSize;
  const bounds: Bounds = {
    minX: borderTiles * tileSize,
    minY: borderTiles * tileSize,
    maxX: width - borderTiles * tileSize,
    maxY: height - borderTiles * tileSize,
  };
  const terrainTypes = config.terrain.types.map((t) => t.id);
  const terrainIndex = (id: string) => terrainTypes.indexOf(id);

  // 1. Terrain bands from fractal noise; cliffs around the edge.
  const noise = new ValueNoise(rng.fork('terrain'));
  const terrain = new Uint8Array(widthTiles * heightTiles);
  const border = terrainIndex(config.terrain.border);
  for (let ty = 0; ty < heightTiles; ty++) {
    for (let tx = 0; tx < widthTiles; tx++) {
      const edge = Math.min(tx, ty, widthTiles - 1 - tx, heightTiles - 1 - ty);
      let value = border;
      if (edge >= borderTiles) {
        const n = noise.fractal(tx / config.terrain.noiseScale, ty / config.terrain.noiseScale);
        const band = config.terrain.bands.find((b) => n < b.below) ?? config.terrain.bands.at(-1);
        value = terrainIndex(band?.terrain ?? config.terrain.plaza);
      }
      terrain[ty * widthTiles + tx] = value;
    }
  }
  const plazas: { x: number; y: number; radius: number }[] = [];
  const stamp = (cx: number, cy: number, radius: number, terrainId: string) => {
    if (terrainId === config.terrain.plaza) plazas.push({ x: cx, y: cy, radius });
    const value = terrainIndex(terrainId);
    const r = Math.ceil(radius / tileSize);
    const ctx = Math.floor(cx / tileSize);
    const cty = Math.floor(cy / tileSize);
    for (let ty = cty - r; ty <= cty + r; ty++) {
      for (let tx = ctx - r; tx <= ctx + r; tx++) {
        if (
          tx < borderTiles ||
          ty < borderTiles ||
          tx >= widthTiles - borderTiles ||
          ty >= heightTiles - borderTiles
        )
          continue;
        const px = (tx + 0.5) * tileSize;
        const py = (ty + 0.5) * tileSize;
        if (distanceSq(px, py, cx, cy) <= radius * radius) terrain[ty * widthTiles + tx] = value;
      }
    }
  };

  // 2. Spawn plaza in the centre; boss arena far from it.
  const spawn = { x: width / 2, y: height / 2 };
  stamp(spawn.x, spawn.y, config.spawnClearRadius * 0.75, config.terrain.plaza);
  const bossArena = placeBossArena(config, bounds, spawn, rng.fork('boss-arena'));
  stamp(bossArena.x, bossArena.y, bossArena.radius, config.terrain.plaza);

  // Obstacle placement shared by every rule.
  const kinds = new Map(config.obstacles.map((o) => [o.id, o]));
  const obstacles: ArenaObstacle[] = [];
  const placed = new SpatialHash<ArenaObstacle>(128);
  const tryPlace = (kind: ObstacleKind, x: number, y: number): boolean => {
    if (obstacles.length >= config.maxObstacles) return false;
    const r = kind.radius;
    if (x - r < bounds.minX || y - r < bounds.minY || x + r > bounds.maxX || y + r > bounds.maxY)
      return false;
    const clear = config.spawnClearRadius + r;
    if (distanceSq(x, y, spawn.x, spawn.y) < clear * clear) return false;
    const arenaClear = bossArena.radius + r;
    if (distanceSq(x, y, bossArena.x, bossArena.y) < arenaClear * arenaClear) return false;
    let blocked = false;
    placed.query(x, y, r + config.minObstacleGap, () => {
      blocked = true;
      return false;
    });
    if (blocked) return false;
    const obstacle: ArenaObstacle = { id: obstacles.length, kind: kind.id, x, y, radius: r };
    obstacles.push(obstacle);
    placed.insert(obstacle);
    return true;
  };
  const randomPoint = (r: Rng, margin: number) => ({
    x: r.range(bounds.minX + margin, bounds.maxX - margin),
    y: r.range(bounds.minY + margin, bounds.maxY - margin),
  });

  // 3. Points of interest first, so they get the space they need.
  const poiRng = rng.fork('poi');
  for (const rule of config.pointsOfInterest) {
    placePointsOfInterest(rule, poiRng, kinds, tryPlace, randomPoint, stamp, (x, y, reach) => {
      const spawnReach = config.spawnClearRadius + reach;
      const arenaReach = bossArena.radius + reach;
      return (
        distanceSq(x, y, spawn.x, spawn.y) > spawnReach * spawnReach &&
        distanceSq(x, y, bossArena.x, bossArena.y) > arenaReach * arenaReach
      );
    });
  }

  // 4. Scattered single obstacles.
  const playableTiles = (widthTiles - 2 * borderTiles) * (heightTiles - 2 * borderTiles);
  const scatterRng = rng.fork('scatter');
  const terrainAt = (x: number, y: number) =>
    terrainTypes[terrain[Math.floor(y / tileSize) * widthTiles + Math.floor(x / tileSize)]];
  for (const rule of config.scatter) {
    const kind = kinds.get(rule.kind);
    if (!kind) continue;
    const target = Math.round((rule.density * playableTiles) / 1000);
    let count = 0;
    for (let attempt = 0; attempt < target * 6 && count < target; attempt++) {
      const p = randomPoint(scatterRng, kind.radius);
      if (rule.terrain && !rule.terrain.includes(terrainAt(p.x, p.y))) continue;
      if (tryPlace(kind, p.x, p.y)) count++;
    }
  }

  // 5. Decorations: never on obstacles, only on their terrain.
  const decorations: ArenaDecoration[] = [];
  const decorationRng = rng.fork('decorations');
  for (const rule of config.decorations) {
    const target = Math.round((rule.density * playableTiles) / 1000);
    for (let i = 0; i < target; i++) {
      const p = randomPoint(decorationRng, 8);
      if (!rule.terrain.includes(terrainAt(p.x, p.y))) continue;
      let covered = false;
      placed.query(p.x, p.y, 10, () => {
        covered = true;
        return false;
      });
      if (!covered) decorations.push({ kind: rule.id, x: Math.round(p.x), y: Math.round(p.y) });
    }
  }

  return {
    seed,
    widthTiles,
    heightTiles,
    tileSize,
    width,
    height,
    terrain,
    terrainTypes,
    bounds,
    obstacles,
    decorations,
    spawn,
    bossArena,
    plazas,
  };
}

function placeBossArena(
  config: MapGenConfig,
  bounds: Bounds,
  spawn: { x: number; y: number },
  rng: Rng,
) {
  const radius = config.bossArena.radius;
  const margin = radius + 32;
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = rng.range(bounds.minX + margin, bounds.maxX - margin);
    const y = rng.range(bounds.minY + margin, bounds.maxY - margin);
    const min = config.bossArena.minDistanceFromSpawn;
    if (distanceSq(x, y, spawn.x, spawn.y) >= min * min) return { x, y, radius };
  }
  // Small maps: the corner farthest from the spawn (all corners are equally far from the centre).
  return { x: bounds.minX + margin, y: bounds.minY + margin, radius };
}

function placePointsOfInterest(
  rule: PointOfInterestRule,
  rng: Rng,
  kinds: ReadonlyMap<string, ObstacleKind>,
  tryPlace: (kind: ObstacleKind, x: number, y: number) => boolean,
  randomPoint: (r: Rng, margin: number) => { x: number; y: number },
  stamp: (x: number, y: number, radius: number, terrain: string) => void,
  isClear: (x: number, y: number, reach: number) => boolean,
): void {
  const kind = kinds.get(rule.kind);
  if (!kind) return;
  const count = rng.int(rule.count[0], rule.count[1]);
  for (let i = 0; i < count; i++) {
    if (rule.type === 'ring') {
      const radius = rng.range(rule.radius[0], rule.radius[1]);
      const reach = radius + kind.radius;
      for (let attempt = 0; attempt < 30; attempt++) {
        const c = randomPoint(rng, reach + 16);
        if (!isClear(c.x, c.y, reach)) continue;
        stamp(c.x, c.y, radius + 24, rule.plazaTerrain);
        const start = rng.angle();
        let placed = 0;
        for (let p = 0; p < rule.pieces; p++) {
          if (rng.chance(rule.missingChance)) continue;
          const a = start + (p / rule.pieces) * Math.PI * 2;
          if (tryPlace(kind, c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius)) placed++;
        }
        if (placed > 0) break;
      }
    } else {
      const center = randomPoint(rng, rule.spread);
      if (!isClear(center.x, center.y, rule.spread)) continue;
      const size = rng.int(rule.size[0], rule.size[1]);
      for (let n = 0, attempts = 0; n < size && attempts < size * 8; attempts++) {
        const a = rng.angle();
        const d = Math.sqrt(rng.next()) * rule.spread;
        if (tryPlace(kind, center.x + Math.cos(a) * d, center.y + Math.sin(a) * d)) n++;
      }
    }
  }
}
