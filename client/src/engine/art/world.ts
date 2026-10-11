import { Rng } from '../core/rng';
import { circle, ellipse, glow, line, poly, slab, SpriteSpec, volume } from './canvas';

/** World objects seen from above: weathered marble, olive trees, rocks, braziers and ground clutter. */

function groundShadow(g: CanvasRenderingContext2D, s: number, rx = 0.4, ry = 0.3): void {
  ellipse(g, s * 0.58, s * 0.6, s * rx, s * ry, 'rgba(0,0,0,0.38)');
}

export const WORLD: Record<string, SpriteSpec> = {
  column: {
    size: 44,
    paint(g, s) {
      groundShadow(g, s, 0.38, 0.3);
      volume(g, s / 2, s / 2, s * 0.38, s * 0.38, 0xb8b2a4, { outline: 2.5 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        line(
          g,
          [
            s / 2 + Math.cos(a) * s * 0.14,
            s / 2 + Math.sin(a) * s * 0.14,
            s / 2 + Math.cos(a) * s * 0.34,
            s / 2 + Math.sin(a) * s * 0.34,
          ],
          'rgba(60,56,50,0.35)',
          1.5,
        );
      }
      volume(g, s / 2, s / 2, s * 0.13, s * 0.13, 0xcfc9bb, { outline: 1.2, rim: 0 });
      line(g, [s * 0.34, s * 0.62, s * 0.44, s * 0.7], 'rgba(30,26,22,0.6)', 1.5);
    },
  },
  broken_column: {
    size: 48,
    paint(g, s) {
      groundShadow(g, s);
      slab(
        g,
        [
          s * 0.18,
          s * 0.44,
          s * 0.32,
          s * 0.2,
          s * 0.62,
          s * 0.16,
          s * 0.84,
          s * 0.4,
          s * 0.8,
          s * 0.72,
          s * 0.5,
          s * 0.84,
          s * 0.22,
          s * 0.72,
        ],
        0xa8a294,
        { outline: 2.5 },
      );
      line(g, [s * 0.34, s * 0.3, s * 0.5, s * 0.5, s * 0.46, s * 0.7], 'rgba(30,26,22,0.6)', 1.5);
      ellipse(g, s * 0.66, s * 0.78, s * 0.08, s * 0.05, '#8a8476', 'rgba(8,6,10,0.7)');
    },
  },
  statue: {
    size: 56,
    paint(g, s) {
      groundShadow(g, s, 0.42, 0.32);
      slab(
        g,
        [s * 0.14, s * 0.32, s * 0.86, s * 0.32, s * 0.86, s * 0.88, s * 0.14, s * 0.88],
        0x6e6a62,
        { outline: 2.5 },
      );
      volume(g, s / 2, s * 0.52, s * 0.2, s * 0.22, 0xb4ae9e);
      volume(g, s / 2, s * 0.28, s * 0.11, s * 0.11, 0xc4beae);
      line(g, [s * 0.68, s * 0.46, s * 0.8, s * 0.12], '#a49e8e', 3);
      // Moss and grime.
      for (const [x, y] of [
        [0.3, 0.8],
        [0.62, 0.7],
        [0.44, 0.6],
      ])
        circle(g, s * x, s * y, s * 0.04, 'rgba(70,90,50,0.55)');
    },
  },
  altar: {
    size: 64,
    paint(g, s) {
      groundShadow(g, s, 0.44, 0.34);
      // A marble altar block on two steps, scorched on top, an offering bowl glowing with embers.
      slab(g, [s * 0.1, s * 0.5, s * 0.9, s * 0.5, s * 0.9, s * 0.9, s * 0.1, s * 0.9], 0x8a857a, {
        outline: 2.5,
      });
      slab(
        g,
        [s * 0.18, s * 0.3, s * 0.82, s * 0.3, s * 0.82, s * 0.78, s * 0.18, s * 0.78],
        0xc9c2b2,
        {
          outline: 2.5,
        },
      );
      ellipse(g, s / 2, s * 0.4, s * 0.22, s * 0.08, '#3a2a22');
      glow(g, s / 2, s * 0.38, s * 0.2, 0xff8a3d, 0.7);
      ellipse(g, s / 2, s * 0.39, s * 0.12, s * 0.04, '#ffb36b');
      line(g, [s * 0.24, s * 0.62, s * 0.76, s * 0.62], '#a8a090', 1.5);
    },
  },
  ruined_wall: {
    size: 52,
    paint(g, s) {
      groundShadow(g, s, 0.42, 0.3);
      // Two courses of worn blocks, the top one broken.
      slab(
        g,
        [s * 0.08, s * 0.5, s * 0.92, s * 0.5, s * 0.92, s * 0.86, s * 0.08, s * 0.86],
        0x9c958a,
        { outline: 2.5 },
      );
      slab(
        g,
        [s * 0.16, s * 0.26, s * 0.66, s * 0.22, s * 0.7, s * 0.52, s * 0.14, s * 0.52],
        0xb3ac9e,
        {
          outline: 2.5,
        },
      );
      line(g, [s * 0.5, s * 0.5, s * 0.5, s * 0.86], '#6e685e', 1.5);
      line(g, [s * 0.4, s * 0.26, s * 0.42, s * 0.5], '#7e786c', 1.5);
      circle(g, s * 0.78, s * 0.42, s * 0.06, '#8c8578', 'rgba(8,6,10,0.8)', 1.5);
      circle(g, s * 0.3, s * 0.78, s * 0.04, 'rgba(70,90,50,0.55)');
    },
  },
  rubble: {
    size: 26,
    paint(g, s) {
      for (const [x, y, r] of [
        [0.3, 0.6, 0.12],
        [0.58, 0.52, 0.1],
        [0.46, 0.72, 0.08],
        [0.72, 0.7, 0.07],
      ])
        circle(g, s * x, s * y, s * r, '#8c8578', 'rgba(8,6,10,0.7)', 1);
    },
  },
  olive_tree: {
    size: 60,
    paint(g, s) {
      ellipse(g, s * 0.6, s * 0.62, s * 0.44, s * 0.34, 'rgba(0,0,0,0.42)');
      const rng = new Rng('olive');
      circle(g, s / 2, s / 2, s * 0.37, '#2c3a22', 'rgba(8,6,10,0.8)', 2.5);
      for (let i = 0; i < 11; i++) {
        const a = rng.angle();
        const d = rng.range(0, s * 0.2);
        const x = s / 2 + Math.cos(a) * d;
        const y = s / 2 + Math.sin(a) * d;
        volume(
          g,
          x,
          y,
          s * rng.range(0.09, 0.15),
          s * rng.range(0.09, 0.15),
          i % 3 ? 0x4e623a : 0x6a7a52,
          { outline: 1, rim: 0.25, contrast: 1.2 },
        );
      }
      for (let i = 0; i < 8; i++)
        circle(g, s * rng.range(0.3, 0.7), s * rng.range(0.3, 0.7), s * 0.02, '#1e2416');
    },
  },
  rock: {
    size: 44,
    paint(g, s) {
      groundShadow(g, s, 0.38, 0.28);
      slab(
        g,
        [
          s * 0.14,
          s * 0.56,
          s * 0.24,
          s * 0.26,
          s * 0.52,
          s * 0.14,
          s * 0.8,
          s * 0.3,
          s * 0.86,
          s * 0.62,
          s * 0.6,
          s * 0.82,
          s * 0.28,
          s * 0.78,
        ],
        0x6a6660,
        { outline: 2.5, contrast: 1.3 },
      );
      line(
        g,
        [s * 0.3, s * 0.4, s * 0.52, s * 0.32, s * 0.7, s * 0.42],
        'rgba(200,210,230,0.25)',
        1.5,
      );
    },
  },
  brazier: {
    size: 40,
    paint(g, s) {
      groundShadow(g, s, 0.32, 0.24);
      glow(g, s / 2, s * 0.42, s * 0.5, 0xff8a3d, 0.55);
      line(g, [s * 0.32, s * 0.86, s * 0.42, s * 0.56], '#2a2420', 3);
      line(g, [s * 0.68, s * 0.86, s * 0.58, s * 0.56], '#2a2420', 3);
      volume(g, s / 2, s * 0.5, s * 0.26, s * 0.16, 0x4a3e34, { contrast: 1.4 });
      ellipse(g, s / 2, s * 0.46, s * 0.2, s * 0.1, '#ff7a22');
      glow(g, s / 2, s * 0.36, s * 0.22, 0xffd27a, 0.9);
      poly(
        g,
        [
          s * 0.38,
          s * 0.46,
          s * 0.46,
          s * 0.2,
          s * 0.52,
          s * 0.34,
          s * 0.58,
          s * 0.14,
          s * 0.64,
          s * 0.46,
        ],
        'rgba(255,190,90,0.85)',
      );
    },
  },
  grass_tuft: {
    size: 20,
    paint(g, s) {
      for (const [x, h] of [
        [0.3, 0.5],
        [0.45, 0.7],
        [0.6, 0.55],
        [0.72, 0.4],
      ]) {
        line(g, [s * x, s * 0.85, s * (x + 0.05), s * (0.85 - h)], 'rgba(96,120,72,0.85)', 2);
      }
    },
  },
  flowers: {
    size: 18,
    paint(g, s) {
      circle(g, s * 0.3, s * 0.4, s * 0.11, '#c9c08e');
      circle(g, s * 0.65, s * 0.6, s * 0.11, '#d8d4c8');
      circle(g, s * 0.55, s * 0.25, s * 0.09, '#a87aa0');
    },
  },
  pebbles: {
    size: 18,
    paint(g, s) {
      ellipse(g, s * 0.3, s * 0.5, s * 0.14, s * 0.1, '#6e6050');
      ellipse(g, s * 0.62, s * 0.36, s * 0.1, s * 0.08, '#7e705e');
      ellipse(g, s * 0.6, s * 0.7, s * 0.12, s * 0.09, '#5e5244');
    },
  },
  marble_shards: {
    size: 20,
    paint(g, s) {
      poly(
        g,
        [s * 0.2, s * 0.6, s * 0.4, s * 0.4, s * 0.5, s * 0.66],
        '#c8c2b4',
        'rgba(8,6,10,0.6)',
        1,
      );
      poly(
        g,
        [s * 0.58, s * 0.3, s * 0.82, s * 0.36, s * 0.66, s * 0.5],
        '#b4ae9e',
        'rgba(8,6,10,0.6)',
        1,
      );
    },
  },
};
