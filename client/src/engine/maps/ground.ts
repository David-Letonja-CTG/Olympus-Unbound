import { Rng } from '../core/rng';
import { MapGenConfig } from '../data/types';
import { ArenaData } from './generate-arena';
import { ValueNoise } from './value-noise';

/** Ground resolution per graphics quality: pixels per world unit (spec: visual-atmosphere / painted ground). */
export const GROUND_SCALE = { low: 0.25, medium: 0.375, high: 0.5 } as const;

/** Terrain blends over this much of the noise range around each band edge. */
const BLEND = 0.035;
/** Smooth fields are sampled every COARSE pixels and interpolated; FIELDS values per sample. */
const COARSE = 4;
const FIELDS = 3;
/** World units over which the playable ground turns into the cliff face. */
const CLIFF_FADE = 28;

const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/**
 * Paints the base colours of an arena's ground (spec: visual-atmosphere / painted ground): the terrain bands of
 * the arena, blended smoothly where they meet (the same noise the generator used, sampled between tile centres),
 * broken up by patches and grain, and the cliff face around the border. Pure and deterministic — no canvas — so
 * it can be painted a few rows at a time behind the loading screen and tested; roads and shading are drawn on top
 * by the Phaser layer.
 */
export class GroundPainter {
  readonly width: number;
  readonly height: number;
  private readonly terrainNoise: ValueNoise;
  private readonly patchNoise: ValueNoise;
  private readonly rockNoise: ValueNoise;
  private readonly bands: { below: number; color: [number, number, number] }[];
  private readonly cliff: [number, number, number];
  private readonly coarse = new Map<number, Float32Array>();
  private readonly color: [number, number, number] = [0, 0, 0];

  constructor(
    private readonly arena: ArenaData,
    private readonly map: MapGenConfig,
    readonly scale: number,
  ) {
    this.width = Math.ceil(arena.width * scale);
    this.height = Math.ceil(arena.height * scale);
    // The generator's own terrain noise (generate-arena: rng.fork('terrain')), for smooth band edges.
    this.terrainNoise = new ValueNoise(new Rng(`arena:${arena.seed}`).fork('terrain'));
    const detail = new Rng(`ground:${arena.seed}`);
    this.patchNoise = new ValueNoise(detail.fork('patches'));
    this.rockNoise = new ValueNoise(detail.fork('rock'));
    const color = (id: string) =>
      rgb(map.terrain.types.find((t) => t.id === id)?.color ?? 0x444444);
    this.bands = map.terrain.bands.map((b) => ({ below: b.below, color: color(b.terrain) }));
    this.cliff = color(map.terrain.border);
  }

  /** RGBA pixels of rows `from` to `to` (exclusive), `width` pixels each. */
  paintRows(from: number, to: number): Uint8ClampedArray<ArrayBuffer> {
    const rows = Math.max(0, Math.min(to, this.height) - from);
    const out = new Uint8ClampedArray(this.width * rows * 4);
    const b = this.arena.bounds;
    const scale = this.scale;
    const color = this.color;
    const [rr, rg, rb] = this.cliff;
    // A hot loop over every pixel: plain arithmetic, no closures or allocations.
    for (let r = 0; r < rows; r++) {
      const py = from + r;
      const wy = (py + 0.5) / scale;
      // The smooth fields come from a coarse grid (every COARSE pixels), interpolated: same look, a fraction of
      // the noise samples.
      const cy = Math.floor(py / COARSE);
      const fy = (py - cy * COARSE) / COARSE;
      const top = this.coarseRow(cy);
      const bottom = this.coarseRow(cy + 1);
      let o = r * this.width * 4;
      for (let px = 0; px < this.width; px++) {
        const wx = (px + 0.5) / scale;
        const cx = (px / COARSE) | 0;
        const fx = (px - cx * COARSE) / COARSE;
        const i0 = cx * FIELDS;
        const i1 = i0 + FIELDS;
        const n0 = top[i0] + (top[i1] - top[i0]) * fx;
        const n1 = bottom[i0] + (bottom[i1] - bottom[i0]) * fx;
        const p0 = top[i0 + 1] + (top[i1 + 1] - top[i0 + 1]) * fx;
        const p1 = bottom[i0 + 1] + (bottom[i1 + 1] - bottom[i0 + 1]) * fx;
        // Terrain: noise between tile centres, so bands meet in smooth curves instead of tile steps.
        this.bandColor(n0 + (n1 - n0) * fy);
        let cr = color[0];
        let cg = color[1];
        let cb = color[2];
        // Patches of lusher and drier ground, and a fine grain.
        let light = 0.86 + (p0 + (p1 - p0) * fy) * 0.28 + hash(px, py) * 0.1 - 0.05;
        // The cliff: playable ground fades into a dark, cracked rock face beyond the bounds.
        const inside = Math.min(wx - b.minX, wy - b.minY, b.maxX - wx, b.maxY - wy);
        if (inside < CLIFF_FADE) {
          const k0 = top[i0 + 2] + (top[i1 + 2] - top[i0 + 2]) * fx;
          const k1 = bottom[i0 + 2] + (bottom[i1 + 2] - bottom[i0 + 2]) * fx;
          const strata =
            0.75 + (k0 + (k1 - k0) * fy) * 0.5 - (hash(px * 3, py * 7) > 0.93 ? 0.25 : 0);
          const depth = smooth(-inside / 180); // darker the further out
          const k = smooth((CLIFF_FADE - inside) / CLIFF_FADE);
          cr += (rr * strata - cr) * k;
          cg += (rg * strata - cg) * k;
          cb += (rb * strata - cb) * k;
          // A pale lip where the ground breaks off, then the shadowed face.
          const lip = inside < 0 && inside > -10 ? 0.18 * (1 + inside / 10) : 0;
          light = light * (1 - k) + (1 - depth * 0.55 + lip) * k;
        }
        out[o] = cr * light;
        out[o + 1] = cg * light;
        out[o + 2] = cb * light;
        out[o + 3] = 255;
        o += 4;
      }
    }
    return out;
  }

  /** Terrain noise, patches and rock at every COARSE-th pixel of coarse row `cy` (cached; pure per index). */
  private coarseRow(cy: number): Float32Array {
    let row = this.coarse.get(cy);
    if (row) return row;
    const columns = Math.ceil(this.width / COARSE) + 2;
    row = new Float32Array(columns * FIELDS);
    const tile = this.arena.tileSize;
    const noiseScale = this.map.terrain.noiseScale;
    const wy = (cy * COARSE + 0.5) / this.scale;
    for (let cx = 0; cx < columns; cx++) {
      const wx = (cx * COARSE + 0.5) / this.scale;
      row[cx * FIELDS] = this.terrainNoise.fractal(
        (wx / tile - 0.5) / noiseScale,
        (wy / tile - 0.5) / noiseScale,
      );
      row[cx * FIELDS + 1] = this.patchNoise.fractal(wx / 110, wy / 110);
      row[cx * FIELDS + 2] = this.rockNoise.fractal(wx / 38, wy / 38);
    }
    this.coarse.set(cy, row);
    // Painting goes top to bottom: rows far above are no longer needed.
    this.coarse.delete(cy - 3);
    return row;
  }

  /** Sets `color` to the terrain colour for a noise value, blended with the neighbour near each band edge. */
  private bandColor(n: number): void {
    const bands = this.bands;
    let i = 0;
    while (i < bands.length - 1 && n >= bands[i].below) i++;
    let other = bands[i].color;
    let k = 0;
    // Blend towards the lower band just above its edge, and towards the upper band just below ours.
    if (i > 0 && n - bands[i - 1].below < BLEND) {
      other = bands[i - 1].color;
      k = 0.5 - 0.5 * smooth((n - bands[i - 1].below) / BLEND);
    } else if (i < bands.length - 1 && bands[i].below - n < BLEND) {
      other = bands[i + 1].color;
      k = 0.5 - 0.5 * smooth((bands[i].below - n) / BLEND);
    }
    const own = bands[i].color;
    for (let c = 0; c < 3; c++) this.color[c] = own[c] + (other[c] - own[c]) * k;
  }
}

/** A fixed pseudo-random value in [0, 1) per pixel (no state, so painting order does not matter). */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
