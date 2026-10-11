import { Rng } from '../core/rng';
import { MapGenConfig } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import { GROUND_SCALE, GroundPainter } from '../maps/ground';
import { GraphicsQuality } from '../session';

/** Rows painted per slice; slices continue until the frame's time budget is spent. */
const SLICE = 16;
/** Share of the progress bar the base painting takes; the strokes, roads and shading take the rest. */
const BASE_SHARE = 0.9;

/**
 * Builds a run's ground texture behind the loading screen (spec: visual-atmosphere / painted ground; run-loading
 * / progress stages): the base colours from `GroundPainter`, a few rows per frame within a time budget, then grass
 * strokes and pebbles, the worn roads, and soft shadows under ruins, walls and trees. Deterministic: every random
 * choice comes from the arena's seed.
 */
export class GroundBuilder {
  readonly canvas: HTMLCanvasElement;
  readonly scale: number;
  private readonly g: CanvasRenderingContext2D;
  private readonly painter: GroundPainter;
  private row = 0;
  private done = false;

  constructor(
    private readonly arena: ArenaData,
    map: MapGenConfig,
    quality: GraphicsQuality,
  ) {
    this.scale = GROUND_SCALE[quality];
    this.painter = new GroundPainter(arena, map, this.scale);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.painter.width;
    this.canvas.height = this.painter.height;
    this.g = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  /** 0–1. */
  get progress(): number {
    return this.done ? 1 : (BASE_SHARE * this.row) / this.painter.height;
  }

  /** Paints for about `budgetMs`; true once the ground is complete. */
  advance(budgetMs: number): boolean {
    if (this.done) return true;
    const start = performance.now();
    const { width, height } = this.painter;
    while (this.row < height && performance.now() - start < budgetMs) {
      const rows = Math.min(SLICE, height - this.row);
      const pixels = this.painter.paintRows(this.row, this.row + rows);
      this.g.putImageData(new ImageData(pixels, width, rows), 0, this.row);
      this.row += rows;
    }
    if (this.row >= height) {
      this.decorate();
      this.done = true;
    }
    return this.done;
  }

  private decorate(): void {
    const { g, arena, scale } = this;
    const rng = new Rng(`ground-detail:${arena.seed}`);
    const kindAt = (wx: number, wy: number) => {
      const tx = Math.floor(wx / arena.tileSize);
      const ty = Math.floor(wy / arena.tileSize);
      return arena.terrainTypes[arena.terrain[ty * arena.widthTiles + tx]];
    };
    const b = arena.bounds;

    // Grass blades and pebbles: short strokes and dots over the natural ground.
    const strokes = Math.round((this.canvas.width * this.canvas.height) / 240);
    for (let i = 0; i < strokes; i++) {
      const wx = rng.range(b.minX, b.maxX);
      const wy = rng.range(b.minY, b.maxY);
      const kind = kindAt(wx, wy);
      const [x, y] = [wx * scale, wy * scale];
      if (kind === 'grass' || kind === 'meadow') {
        const length = rng.range(2, 5) * scale * 2;
        const lean = rng.range(-0.5, 0.5);
        g.strokeStyle = rng.chance(0.5) ? 'rgba(178,196,120,0.16)' : 'rgba(18,26,10,0.22)';
        g.lineWidth = Math.max(1, scale * 2);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + lean * length, y - length);
        g.stroke();
      } else if (kind === 'earth') {
        g.fillStyle = rng.chance(0.5) ? 'rgba(160,140,112,0.22)' : 'rgba(30,22,16,0.28)';
        g.fillRect(x, y, Math.max(1, scale * 3), Math.max(1, scale * 3));
      }
    }

    // Soft shadows under everything that stands on the ground (lit from the upper left).
    for (const o of arena.obstacles) {
      const cx = (o.x + o.radius * 0.25) * scale;
      const cy = (o.y + o.radius * 0.35) * scale;
      const r = o.radius * 1.8 * scale;
      const shade = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      shade.addColorStop(0, 'rgba(0,0,0,0.32)');
      shade.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = shade;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // Roads: a dark worn edge, packed dirt, a paler beaten middle, loose stones.
    for (const road of arena.roads) {
      const w = road.width * scale;
      const trace = () => {
        const p = road.points;
        g.beginPath();
        g.moveTo(p[0] * scale, p[1] * scale);
        for (let i = 2; i + 3 < p.length; i += 2) {
          // Through the midpoints, with the waypoints as control points: a smooth, winding road.
          const mx = ((p[i] + p[i + 2]) / 2) * scale;
          const my = ((p[i + 1] + p[i + 3]) / 2) * scale;
          g.quadraticCurveTo(p[i] * scale, p[i + 1] * scale, mx, my);
        }
        g.lineTo(p[p.length - 2] * scale, p[p.length - 1] * scale);
      };
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const [width, color] of [
        [1.15, 'rgba(26,20,14,0.35)'],
        [0.95, 'rgba(98,80,60,0.92)'],
        [0.45, 'rgba(124,104,80,0.55)'],
      ] as const) {
        trace();
        g.lineWidth = w * width;
        g.strokeStyle = color;
        g.stroke();
      }
      const p = road.points;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const stones = Math.round(Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) / 18);
        for (let s = 0; s < stones; s++) {
          const t = rng.next();
          const off = rng.range(-0.45, 0.45) * road.width;
          const len = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]) || 1;
          const nx = -(p[i + 3] - p[i + 1]) / len;
          const ny = (p[i + 2] - p[i]) / len;
          const x = (p[i] + (p[i + 2] - p[i]) * t + nx * off) * scale;
          const y = (p[i + 1] + (p[i + 3] - p[i + 1]) * t + ny * off) * scale;
          g.fillStyle = rng.chance(0.5) ? 'rgba(150,132,104,0.7)' : 'rgba(40,30,22,0.45)';
          g.fillRect(x, y, Math.max(1, 4 * scale), Math.max(1, 3 * scale));
        }
      }
    }

    // The temple's footprint darkens the ground around its steps.
    for (const t of arena.temples) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      const m = 30;
      g.fillRect(
        (t.x - t.width / 2 - m + 10) * scale,
        (t.y - t.depth / 2 - m + 14) * scale,
        (t.width + 2 * m) * scale,
        (t.depth + 2 * m) * scale,
      );
    }
  }
}
