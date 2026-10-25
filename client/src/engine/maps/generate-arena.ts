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

/** A breakable prop; `id` is its index, its bit in the broken mask (spec: arena-generation / breakable props). */
export interface ArenaProp {
  readonly id: number;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** Props per arena at most: their broken state fits one 32-bit mask (snapshot). */
export const MAX_PROPS = 32;

/**
 * A hazard or helper (spec: arena-generation / map hazards, map helpers): `rule` indexes the map's `features`, `id` is
 * its bit in the features mask; `angle` is a column's fall or a crusher's line.
 */
export interface ArenaFeature {
  readonly id: number;
  readonly rule: number;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

/** Features per arena at most (one 32-bit mask), and the least room between two. */
export const MAX_FEATURES = 32;
const FEATURE_GAP = 90;

export interface ArenaDecoration {
  readonly kind: string;
  readonly x: number;
  readonly y: number;
}

/** A road: a polyline (x0, y0, x1, y1, …) of open ground, `width` wide. */
export interface ArenaRoad {
  readonly points: readonly number[];
  readonly width: number;
  /** The road to the boss arena. */
  readonly toBoss: boolean;
}

/** A temple's stylobate (floor), centred on (x, y). */
export interface ArenaTemple {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly depth: number;
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
  readonly props: readonly ArenaProp[];
  readonly features: readonly ArenaFeature[];
  readonly spawn: { readonly x: number; readonly y: number };
  readonly bossArena: { readonly x: number; readonly y: number; readonly radius: number };
  /** Round marble floors (spawn plaza, boss arena, ruin plazas), for drawing. */
  readonly plazas: readonly { readonly x: number; readonly y: number; readonly radius: number }[];
  /** Roads from the spawn to every ruin, temple and the boss arena (open ground), for drawing. */
  readonly roads: readonly ArenaRoad[];
  /** Temple floors, for drawing. */
  readonly temples: readonly ArenaTemple[];
}

type RingRule = Extract<PointOfInterestRule, { type: 'ring' }>;
type TempleRule = Extract<PointOfInterestRule, { type: 'temple' }>;
type Place = (kind: ObstacleKind, x: number, y: number) => boolean;
type RandomPoint = (r: Rng, margin: number) => { x: number; y: number };
type IsClear = (x: number, y: number, reach: number) => boolean;

/**
 * Generates an arena from a realm's map configuration and a seed (D5). Pure and deterministic: the same
 * configuration and seed always produce the same arena. Steps: terrain from noise → spawn plaza and boss arena
 * → sites (ruins, temple) → roads to them → their obstacles, walls, groves and lights → scattered obstacles →
 * decorations. Obstacles never stand on a road, so a ruin's ring opens where its road enters.
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
  const inside = (tx: number, ty: number) =>
    tx >= borderTiles &&
    ty >= borderTiles &&
    tx < widthTiles - borderTiles &&
    ty < heightTiles - borderTiles;
  const plazas: { x: number; y: number; radius: number }[] = [];
  /** `asPlaza` false: the ground only (a landmark's), not a plaza of ruins with lights and a road to its centre. */
  const stamp = (cx: number, cy: number, radius: number, terrainId: string, asPlaza = true) => {
    if (asPlaza && terrainId === config.terrain.plaza) plazas.push({ x: cx, y: cy, radius });
    const value = terrainIndex(terrainId);
    const r = Math.ceil(radius / tileSize);
    const ctx = Math.floor(cx / tileSize);
    const cty = Math.floor(cy / tileSize);
    for (let ty = cty - r; ty <= cty + r; ty++) {
      for (let tx = ctx - r; tx <= ctx + r; tx++) {
        if (!inside(tx, ty)) continue;
        const px = (tx + 0.5) * tileSize;
        const py = (ty + 0.5) * tileSize;
        if (distanceSq(px, py, cx, cy) <= radius * radius) terrain[ty * widthTiles + tx] = value;
      }
    }
  };
  const stampRect = (cx: number, cy: number, w: number, d: number, terrainId: string) => {
    const value = terrainIndex(terrainId);
    for (let ty = 0; ty < heightTiles; ty++)
      for (let tx = 0; tx < widthTiles; tx++) {
        const px = (tx + 0.5) * tileSize;
        const py = (ty + 0.5) * tileSize;
        if (inside(tx, ty) && Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= d / 2)
          terrain[ty * widthTiles + tx] = value;
      }
  };

  // 2. Spawn plaza in the centre; boss arena far from it.
  const spawn = { x: width / 2, y: height / 2 };
  stamp(spawn.x, spawn.y, config.spawnClearRadius * 0.75, config.terrain.plaza);
  const bossArena = placeBossArena(config, bounds, spawn, rng.fork('boss-arena'));
  stamp(bossArena.x, bossArena.y, bossArena.radius, config.terrain.plaza);

  // Obstacle placement shared by every rule. Roads are filled in once the sites are known.
  let roads: ArenaRoad[] = [];
  const nearRoad = (x: number, y: number, r: number) =>
    roads.some((road) => distanceToPolyline(x, y, road.points) < road.width / 2 + r);
  const kinds = new Map(config.obstacles.map((o) => [o.id, o]));
  const obstacles: ArenaObstacle[] = [];
  const placed = new SpatialHash<ArenaObstacle>(128);
  const tryPlace: Place = (kind, x, y) => {
    if (obstacles.length >= config.maxObstacles) return false;
    const r = kind.radius;
    if (x - r < bounds.minX || y - r < bounds.minY || x + r > bounds.maxX || y + r > bounds.maxY)
      return false;
    const clear = config.spawnClearRadius + r;
    if (distanceSq(x, y, spawn.x, spawn.y) < clear * clear) return false;
    const arenaClear = bossArena.radius + r;
    if (distanceSq(x, y, bossArena.x, bossArena.y) < arenaClear * arenaClear) return false;
    if (nearRoad(x, y, r)) return false;
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
  const randomPoint: RandomPoint = (r, margin) => ({
    x: r.range(bounds.minX + margin, bounds.maxX - margin),
    y: r.range(bounds.minY + margin, bounds.maxY - margin),
  });

  // 3. Sites claim their ground first: ruins (rings of columns round a plaza) and the temple, apart from each
  //    other and from the spawn and the boss arena.
  const poiRng = rng.fork('poi');
  const sites: { x: number; y: number; reach: number }[] = [];
  const isClear: IsClear = (x, y, reach) => {
    const spawnReach = config.spawnClearRadius + reach;
    const arenaReach = bossArena.radius + reach;
    return (
      distanceSq(x, y, spawn.x, spawn.y) > spawnReach * spawnReach &&
      distanceSq(x, y, bossArena.x, bossArena.y) > arenaReach * arenaReach &&
      sites.every((s) => distanceSq(x, y, s.x, s.y) > (s.reach + reach + 40) ** 2)
    );
  };
  const rings: { x: number; y: number; radius: number; rule: RingRule }[] = [];
  const temples: (ArenaTemple & { rule: TempleRule })[] = [];
  for (const rule of config.pointsOfInterest) {
    if (rule.type === 'ring') {
      const pieceRadius = kinds.get(rule.kind)?.radius ?? 0;
      const count = poiRng.int(rule.count[0], rule.count[1]);
      for (let i = 0; i < count; i++) {
        const radius = poiRng.range(rule.radius[0], rule.radius[1]);
        const reach = radius + pieceRadius;
        for (let attempt = 0; attempt < 30; attempt++) {
          const c = randomPoint(poiRng, reach + 16);
          if (!isClear(c.x, c.y, reach)) continue;
          stamp(c.x, c.y, radius + 24, rule.plazaTerrain);
          sites.push({ x: c.x, y: c.y, reach });
          rings.push({ x: c.x, y: c.y, radius, rule });
          break;
        }
      }
    } else if (rule.type === 'temple') {
      const [w, d] = rule.size;
      const reach = Math.hypot(w, d) / 2 + 24;
      for (let attempt = 0; attempt < 60; attempt++) {
        const c = randomPoint(poiRng, reach + 16);
        if (!isClear(c.x, c.y, reach)) continue;
        stampRect(c.x, c.y, w + 48, d + 48, config.terrain.plaza);
        sites.push({ x: c.x, y: c.y, reach });
        temples.push({ x: c.x, y: c.y, width: w, depth: d, rule });
        break;
      }
    }
  }

  // Roads from the spawn plaza to every site and the boss arena (spec: arena-generation / roads).
  if (config.roads) {
    const roadRng = rng.fork('roads');
    const road = config.roads;
    // A ruin's road ends in its plaza; a temple's at its entrance, the middle of the side facing the spawn
    // (its altar stands at the centre).
    const targets = [...rings, ...temples.map((t) => templeEntrance(t, spawn)), bossArena];
    roads = targets.map((target) =>
      buildRoad(spawn, target, road, roadRng, bounds, target === bossArena),
    );
  }

  // The landmark (spec: arena-generation / landmarks): after the roads, on ground no road crosses, clear of the
  // spawn, the boss arena and every other site, on a stream of its own; walls and groves then keep away from it.
  const landmarkRng = rng.fork('landmark');
  for (const rule of config.pointsOfInterest) {
    if (rule.type !== 'landmark') continue;
    const kind = kinds.get(rule.kind);
    if (!kind) continue;
    const reach = kind.radius + 40;
    for (let attempt = 0; attempt < 120; attempt++) {
      const c = randomPoint(landmarkRng, reach + 60);
      if (!isClear(c.x, c.y, reach) || nearRoad(c.x, c.y, kind.radius + 12)) continue;
      if (rule.ground) stamp(c.x, c.y, kind.radius + 34, rule.ground, false);
      sites.push({ x: c.x, y: c.y, reach });
      const obstacle: ArenaObstacle = {
        id: obstacles.length,
        kind: kind.id,
        x: c.x,
        y: c.y,
        radius: kind.radius,
      };
      obstacles.push(obstacle);
      placed.insert(obstacle);
      break;
    }
  }

  // The sites' obstacles, walls, groves and lights, in the realm's order.
  for (const rule of config.pointsOfInterest) {
    if (rule.type === 'ring') {
      const kind = kinds.get(rule.kind);
      if (!kind) continue;
      for (const ring of rings.filter((r) => r.rule === rule)) {
        const start = poiRng.angle();
        for (let p = 0; p < rule.pieces; p++) {
          if (poiRng.chance(rule.missingChance)) continue;
          const a = start + (p / rule.pieces) * Math.PI * 2;
          tryPlace(kind, ring.x + Math.cos(a) * ring.radius, ring.y + Math.sin(a) * ring.radius);
        }
      }
    } else if (rule.type === 'temple') {
      for (const temple of temples.filter((t) => t.rule === rule))
        placeTemple(temple, rule, kinds, tryPlace, poiRng);
    } else if (rule.type === 'plazaLights') {
      // After the plazas above: braziers evenly around each one, outside the clear zones (spec: visual-atmosphere).
      const kind = kinds.get(rule.kind);
      if (!kind) continue;
      const seen = new Set<string>();
      for (const plaza of plazas) {
        const key = `${Math.round(plaza.x)}:${Math.round(plaza.y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let radius = plaza.radius + rule.offset + kind.radius;
        if (plaza.x === spawn.x && plaza.y === spawn.y)
          radius = Math.max(radius, config.spawnClearRadius + kind.radius + 1);
        if (plaza.x === bossArena.x && plaza.y === bossArena.y)
          radius = Math.max(radius, bossArena.radius + kind.radius + 1);
        const start = poiRng.angle();
        for (let i = 0; i < rule.count; i++) {
          const a = start + (i / rule.count) * Math.PI * 2;
          tryPlace(kind, plaza.x + Math.cos(a) * radius, plaza.y + Math.sin(a) * radius);
        }
      }
    } else if (rule.type === 'walls') {
      placeWalls(rule, kinds, tryPlace, randomPoint, isClear, poiRng);
    } else if (rule.type === 'maze') {
      placeMaze(rule, kinds, tryPlace, bounds, sites, poiRng);
    } else if (rule.type === 'landmark') {
      // Placed after the roads, above.
    } else {
      placeGroves(rule, kinds, tryPlace, randomPoint, isClear, poiRng);
    }
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

  // 5. Decorations: never on obstacles or roads, only on their terrain.
  const decorations: ArenaDecoration[] = [];
  const decorationRng = rng.fork('decorations');
  for (const rule of config.decorations) {
    const target = Math.round((rule.density * playableTiles) / 1000);
    for (let i = 0; i < target; i++) {
      const p = randomPoint(decorationRng, 8);
      if (!rule.terrain.includes(terrainAt(p.x, p.y)) || nearRoad(p.x, p.y, 4)) continue;
      let covered = false;
      placed.query(p.x, p.y, 10, () => {
        covered = true;
        return false;
      });
      if (!covered) decorations.push({ kind: rule.id, x: Math.round(p.x), y: Math.round(p.y) });
    }
  }

  // Breakable props and features keep to open ground (spec: arena-generation / breakable props).
  const props: ArenaProp[] = [];
  const features: ArenaFeature[] = [];
  /** Open ground for a prop or a feature: off obstacles, the spawn, the boss arena, road middles and each other. */
  const free = (x: number, y: number, r: number) => {
    if (x - r < bounds.minX || y - r < bounds.minY || x + r > bounds.maxX || y + r > bounds.maxY)
      return false;
    if (distanceSq(x, y, spawn.x, spawn.y) < (config.spawnClearRadius + r) ** 2) return false;
    if (distanceSq(x, y, bossArena.x, bossArena.y) < (bossArena.radius + r) ** 2) return false;
    if (roads.some((road) => distanceToPolyline(x, y, road.points) < road.width / 4 + r))
      return false;
    if (props.some((p) => distanceSq(x, y, p.x, p.y) < (p.radius + r + 4) ** 2)) return false;
    if (features.some((f) => distanceSq(x, y, f.x, f.y) < (FEATURE_GAP + r) ** 2)) return false;
    let blocked = false;
    placed.query(x, y, r + 6, () => {
      blocked = true;
      return false;
    });
    return !blocked;
  };

  // 6. Hazards and helpers, on their own stream (spec: arena-generation / map hazards, map helpers).
  if (config.features) {
    const featureRng = rng.fork('features');
    const add = (rule: number, x: number, y: number, angle = 0) => {
      if (features.length >= MAX_FEATURES) return;
      features.push({ id: features.length, rule, x, y, angle });
    };
    config.features.forEach((rule, index) => {
      if (rule.type === 'teetering') {
        // Leaning columns among the rule's kind, each falling a way that stays in the arena.
        for (const o of obstacles) {
          if (o.kind !== rule.kind || !featureRng.chance(rule.chance)) continue;
          const angle = featureRng.angle();
          const ex = o.x + Math.cos(angle) * rule.length;
          const ey = o.y + Math.sin(angle) * rule.length;
          if (ex < bounds.minX || ey < bounds.minY || ex > bounds.maxX || ey > bounds.maxY)
            continue;
          add(index, o.x, o.y, angle);
        }
      } else if (rule.type === 'crusher') {
        // Across a road, square to it, away from the spawn and the boss arena.
        for (let n = 0, attempt = 0; n < rule.count && attempt < rule.count * 30; attempt++) {
          if (roads.length === 0) break;
          const road = roads[featureRng.int(0, roads.length - 1)];
          const pts = road.points;
          const i = featureRng.int(0, pts.length / 2 - 2) * 2;
          const t = featureRng.next();
          const x = pts[i] + (pts[i + 2] - pts[i]) * t;
          const y = pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t;
          const clear = road.width + 120;
          if (distanceSq(x, y, spawn.x, spawn.y) < (config.spawnClearRadius + clear) ** 2) continue;
          if (distanceSq(x, y, bossArena.x, bossArena.y) < (bossArena.radius + clear) ** 2)
            continue;
          if (features.some((f) => distanceSq(x, y, f.x, f.y) < (FEATURE_GAP * 3) ** 2)) continue;
          const along = Math.atan2(pts[i + 3] - pts[i + 1], pts[i + 2] - pts[i]);
          add(index, x, y, along + Math.PI / 2);
          n++;
        }
      } else {
        const footprint = rule.type === 'brazier' ? 16 : rule.radius;
        for (let n = 0, attempt = 0; n < rule.count && attempt < rule.count * 40; attempt++) {
          const p = randomPoint(featureRng, footprint + 40);
          if (rule.type === 'vent' && rule.terrain && !rule.terrain.includes(terrainAt(p.x, p.y)))
            continue;
          if (!free(p.x, p.y, footprint)) continue;
          add(index, p.x, p.y);
          n++;
        }
      }
    });
  }

  // 7. Breakable props, last: small clusters on open ground.
  if (config.props) {
    const propRng = rng.fork('props');
    const { kinds: propKinds, clusters } = config.props;
    for (let c = 0; c < clusters && props.length < MAX_PROPS; c++) {
      const kind = propKinds[propRng.int(0, propKinds.length - 1)];
      for (let attempt = 0; attempt < 20; attempt++) {
        const centre = randomPoint(propRng, 60);
        if (!free(centre.x, centre.y, kind.radius)) continue;
        const count = propRng.int(1, 3);
        for (let i = 0; i < count && props.length < MAX_PROPS; i++) {
          const a = propRng.angle();
          const d = i === 0 ? 0 : propRng.range(kind.radius * 2, 34);
          const x = Math.round(centre.x + Math.cos(a) * d);
          const y = Math.round(centre.y + Math.sin(a) * d);
          if (free(x, y, kind.radius))
            props.push({ id: props.length, kind: kind.id, x, y, radius: kind.radius });
        }
        break;
      }
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
    props,
    features,
    spawn,
    bossArena,
    plazas,
    roads,
    temples: temples.map(({ x, y, width: w, depth }) => ({ x, y, width: w, depth })),
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

/**
 * A road from `from` to `to`: waypoints every ~180 units that stray sideways up to `wander` (most in the
 * middle, none at the ends), kept inside the bounds.
 */
function buildRoad(
  from: { x: number; y: number },
  to: { x: number; y: number },
  config: { readonly width: number; readonly wander: number },
  rng: Rng,
  bounds: Bounds,
  toBoss: boolean,
): ArenaRoad {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(length / 180));
  const [nx, ny] = length > 0 ? [-dy / length, dx / length] : [0, 0];
  const margin = config.width;
  const points: number[] = [Math.round(from.x), Math.round(from.y)];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sway = config.wander * rng.range(-1, 1) * Math.sin(Math.PI * t);
    const x = Math.min(
      bounds.maxX - margin,
      Math.max(bounds.minX + margin, from.x + dx * t + nx * sway),
    );
    const y = Math.min(
      bounds.maxY - margin,
      Math.max(bounds.minY + margin, from.y + dy * t + ny * sway),
    );
    points.push(Math.round(x), Math.round(y));
  }
  points.push(Math.round(to.x), Math.round(to.y));
  return { points, width: config.width, toBoss };
}

/** The middle of the temple side that faces `from`. */
export function templeEntrance(
  t: ArenaTemple,
  from: { x: number; y: number },
): { x: number; y: number } {
  const dx = from.x - t.x;
  const dy = from.y - t.y;
  return Math.abs(dx) / t.width > Math.abs(dy) / t.depth
    ? { x: t.x + Math.sign(dx) * (t.width / 2), y: t.y }
    : { x: t.x, y: t.y + Math.sign(dy) * (t.depth / 2) };
}

/** Distance from (x, y) to the nearest point of a polyline (x0, y0, x1, y1, …). */
export function distanceToPolyline(x: number, y: number, points: readonly number[]): number {
  let best = Infinity;
  for (let i = 0; i + 3 < points.length; i += 2) {
    const [ax, ay, bx, by] = [points[i], points[i + 1], points[i + 2], points[i + 3]];
    const lx = bx - ax;
    const ly = by - ay;
    const len = lx * lx + ly * ly;
    const t = len > 0 ? Math.max(0, Math.min(1, ((x - ax) * lx + (y - ay) * ly) / len)) : 0;
    best = Math.min(best, Math.hypot(x - (ax + lx * t), y - (ay + ly * t)));
  }
  return best;
}

/** A temple: columns along the stylobate's edge (some fallen or missing), the altar, a light each side. */
function placeTemple(
  temple: ArenaTemple,
  rule: TempleRule,
  kinds: ReadonlyMap<string, ObstacleKind>,
  tryPlace: Place,
  rng: Rng,
): void {
  const column = kinds.get(rule.column);
  const fallen = kinds.get(rule.fallen) ?? column;
  const altar = kinds.get(rule.altar);
  const light = kinds.get(rule.light);
  if (column && fallen) {
    const [hw, hd] = [temple.width / 2, temple.depth / 2];
    const corners = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ];
    for (let side = 0; side < 4; side++) {
      const [ax, ay] = corners[side];
      const [bx, by] = corners[(side + 1) % 4];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / rule.spacing));
      for (let i = 0; i < n; i++) {
        if (rng.chance(rule.missingChance)) continue;
        const t = i / n;
        const kind = rng.chance(rule.fallenChance) ? fallen : column;
        tryPlace(kind, temple.x + ax + (bx - ax) * t, temple.y + ay + (by - ay) * t);
      }
    }
  }
  if (altar) tryPlace(altar, temple.x, temple.y);
  if (light)
    for (const side of [-1, 1]) tryPlace(light, temple.x + side * temple.width * 0.24, temple.y);
}

/** Ruined walls: straight lines of blocks with breaches, in open ground. */
function placeWalls(
  rule: Extract<PointOfInterestRule, { type: 'walls' }>,
  kinds: ReadonlyMap<string, ObstacleKind>,
  tryPlace: Place,
  randomPoint: RandomPoint,
  isClear: IsClear,
  rng: Rng,
): void {
  const kind = kinds.get(rule.kind);
  if (!kind) return;
  const count = rng.int(rule.count[0], rule.count[1]);
  for (let i = 0; i < count; i++) {
    const length = rng.range(rule.length[0], rule.length[1]);
    for (let attempt = 0; attempt < 20; attempt++) {
      const c = randomPoint(rng, length / 2 + kind.radius);
      if (!isClear(c.x, c.y, length / 2)) continue;
      const a = rng.angle();
      const pieces = Math.max(2, Math.floor(length / rule.spacing) + 1);
      for (let p = 0; p < pieces; p++) {
        if (rng.chance(rule.missingChance)) continue;
        const d = -length / 2 + (p / (pieces - 1)) * length;
        tryPlace(kind, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d);
      }
      break;
    }
  }
}

/** Groves: clusters of obstacles. */
function placeGroves(
  rule: Extract<PointOfInterestRule, { type: 'cluster' }>,
  kinds: ReadonlyMap<string, ObstacleKind>,
  tryPlace: Place,
  randomPoint: RandomPoint,
  isClear: IsClear,
  rng: Rng,
): void {
  const kind = kinds.get(rule.kind);
  if (!kind) return;
  const count = rng.int(rule.count[0], rule.count[1]);
  for (let i = 0; i < count; i++) {
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

/**
 * The Labyrinth: a maze of `kind` blocks over the whole playable area (spec: arena-generation / maze). A grid of
 * square cells, `cellPieces` blocks of `spacing` wide, is carved into a perfect maze (a randomized depth-first
 * search, so every cell is reachable), then a share `loops` of the remaining inner walls is knocked down so there is
 * more than one way round; single blocks go missing (`missingChance`, breaches). The cliff border closes the maze
 * outside. No block stands in a site (ruin, temple), the spawn plaza, the boss arena or on a road, so those open
 * as rooms and passages through it.
 */
function placeMaze(
  rule: Extract<PointOfInterestRule, { type: 'maze' }>,
  kinds: ReadonlyMap<string, ObstacleKind>,
  tryPlace: Place,
  bounds: Bounds,
  sites: readonly { x: number; y: number; reach: number }[],
  rng: Rng,
): void {
  const kind = kinds.get(rule.kind);
  if (!kind) return;
  const cell = rule.spacing * rule.cellPieces;
  const cols = Math.floor((bounds.maxX - bounds.minX) / cell);
  const rows = Math.floor((bounds.maxY - bounds.minY) / cell);
  if (cols < 2 || rows < 2) return;
  const x0 = (bounds.minX + bounds.maxX - cols * cell) / 2;
  const y0 = (bounds.minY + bounds.maxY - rows * cell) / 2;
  // Walls between neighbouring cells: east of (c, r) and south of (c, r); true while standing.
  const east = new Array<boolean>(cols * rows).fill(true);
  const south = new Array<boolean>(cols * rows).fill(true);
  const visited = new Array<boolean>(cols * rows).fill(false);
  const stack = [rng.int(0, cols * rows - 1)];
  visited[stack[0]] = true;
  while (stack.length > 0) {
    const at = stack[stack.length - 1];
    const c = at % cols;
    const r = Math.floor(at / cols);
    const next: number[] = [];
    if (c > 0 && !visited[at - 1]) next.push(at - 1);
    if (c < cols - 1 && !visited[at + 1]) next.push(at + 1);
    if (r > 0 && !visited[at - cols]) next.push(at - cols);
    if (r < rows - 1 && !visited[at + cols]) next.push(at + cols);
    if (next.length === 0) {
      stack.pop();
      continue;
    }
    const to = next[rng.int(0, next.length - 1)];
    if (to === at + 1) east[at] = false;
    else if (to === at - 1) east[to] = false;
    else if (to === at + cols) south[at] = false;
    else south[to] = false;
    visited[to] = true;
    stack.push(to);
  }
  const inSite = (x: number, y: number) =>
    sites.some((s) => distanceSq(x, y, s.x, s.y) < (s.reach + kind.radius) ** 2);
  const wall = (ax: number, ay: number, bx: number, by: number) => {
    for (let p = 0; p <= rule.cellPieces; p++) {
      if (rng.chance(rule.missingChance)) continue;
      const t = p / rule.cellPieces;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      if (!inSite(x, y)) tryPlace(kind, x, y);
    }
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const at = r * cols + c;
      const [x, y] = [x0 + c * cell, y0 + r * cell];
      if (c < cols - 1 && east[at] && !rng.chance(rule.loops))
        wall(x + cell, y, x + cell, y + cell);
      if (r < rows - 1 && south[at] && !rng.chance(rule.loops))
        wall(x, y + cell, x + cell, y + cell);
    }
  }
}
