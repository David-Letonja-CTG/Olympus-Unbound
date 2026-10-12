import { Rng } from '../core/rng';
import { circle, ellipse, glow, hex, line, poly, slab, SpriteSpec, volume } from './canvas';

/**
 * World objects seen from above: weathered marble, olive trees, rocks, braziers and ground clutter, and the
 * Underworld's obsidian, soul-fire, dead trees and graves. Pieces shared by realms are painted by factories that
 * take the realm's stone and fire colours.
 */

function groundShadow(g: CanvasRenderingContext2D, s: number, rx = 0.4, ry = 0.3): void {
  ellipse(g, s * 0.58, s * 0.6, s * rx, s * ry, 'rgba(0,0,0,0.38)');
}

/** A fluted column seen from above: `stone` the shaft, `cap` the capital. */
function column(stone: number, cap: number, flute = 'rgba(60,56,50,0.35)'): SpriteSpec {
  return {
    size: 44,
    paint(g, s) {
      groundShadow(g, s, 0.38, 0.3);
      volume(g, s / 2, s / 2, s * 0.38, s * 0.38, stone, { outline: 2.5 });
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
          flute,
          1.5,
        );
      }
      volume(g, s / 2, s / 2, s * 0.13, s * 0.13, cap, { outline: 1.2, rim: 0 });
      line(g, [s * 0.34, s * 0.62, s * 0.44, s * 0.7], 'rgba(30,26,22,0.6)', 1.5);
    },
  };
}

function brokenColumn(stone: number, chip: string): SpriteSpec {
  return {
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
        stone,
        { outline: 2.5 },
      );
      line(g, [s * 0.34, s * 0.3, s * 0.5, s * 0.5, s * 0.46, s * 0.7], 'rgba(30,26,22,0.6)', 1.5);
      ellipse(g, s * 0.66, s * 0.78, s * 0.08, s * 0.05, chip, 'rgba(8,6,10,0.7)');
    },
  };
}

/** An altar block on two steps with an offering bowl burning in `fire`. */
function altar(step: number, block: number, fire: number, bowl: string, coal: string): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      groundShadow(g, s, 0.44, 0.34);
      slab(g, [s * 0.1, s * 0.5, s * 0.9, s * 0.5, s * 0.9, s * 0.9, s * 0.1, s * 0.9], step, {
        outline: 2.5,
      });
      slab(
        g,
        [s * 0.18, s * 0.3, s * 0.82, s * 0.3, s * 0.82, s * 0.78, s * 0.18, s * 0.78],
        block,
        {
          outline: 2.5,
        },
      );
      ellipse(g, s / 2, s * 0.4, s * 0.22, s * 0.08, bowl);
      glow(g, s / 2, s * 0.38, s * 0.2, fire, 0.7);
      ellipse(g, s / 2, s * 0.39, s * 0.12, s * 0.04, coal);
      line(g, [s * 0.24, s * 0.62, s * 0.76, s * 0.62], hex(block, 0.6), 1.5);
    },
  };
}

/** Two courses of worn blocks, the top one broken; `growth` is the moss (or rime) in the cracks. */
function ruinedWall(lower: number, upper: number, growth: string): SpriteSpec {
  return {
    size: 52,
    paint(g, s) {
      groundShadow(g, s, 0.42, 0.3);
      slab(
        g,
        [s * 0.08, s * 0.5, s * 0.92, s * 0.5, s * 0.92, s * 0.86, s * 0.08, s * 0.86],
        lower,
        {
          outline: 2.5,
        },
      );
      slab(
        g,
        [s * 0.16, s * 0.26, s * 0.66, s * 0.22, s * 0.7, s * 0.52, s * 0.14, s * 0.52],
        upper,
        {
          outline: 2.5,
        },
      );
      line(g, [s * 0.5, s * 0.5, s * 0.5, s * 0.86], 'rgba(20,18,16,0.45)', 1.5);
      line(g, [s * 0.4, s * 0.26, s * 0.42, s * 0.5], 'rgba(20,18,16,0.35)', 1.5);
      circle(g, s * 0.78, s * 0.42, s * 0.06, hex(lower), 'rgba(8,6,10,0.8)', 1.5);
      circle(g, s * 0.3, s * 0.78, s * 0.04, growth);
    },
  };
}

/** An iron fire-bowl on legs: `fire` the glow, `coal` the bed, `core` the hottest light, `flame` the tongue. */
function brazier(fire: number, coal: string, core: number, flame: string): SpriteSpec {
  return {
    size: 40,
    paint(g, s) {
      groundShadow(g, s, 0.32, 0.24);
      glow(g, s / 2, s * 0.42, s * 0.5, fire, 0.55);
      line(g, [s * 0.32, s * 0.86, s * 0.42, s * 0.56], '#2a2420', 3);
      line(g, [s * 0.68, s * 0.86, s * 0.58, s * 0.56], '#2a2420', 3);
      volume(g, s / 2, s * 0.5, s * 0.26, s * 0.16, 0x4a3e34, { contrast: 1.4 });
      ellipse(g, s / 2, s * 0.46, s * 0.2, s * 0.1, coal);
      glow(g, s / 2, s * 0.36, s * 0.22, core, 0.9);
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
        flame,
      );
    },
  };
}

function flowers(colours: readonly [string, string, string]): SpriteSpec {
  return {
    size: 18,
    paint(g, s) {
      circle(g, s * 0.3, s * 0.4, s * 0.11, colours[0]);
      circle(g, s * 0.65, s * 0.6, s * 0.11, colours[1]);
      circle(g, s * 0.55, s * 0.25, s * 0.09, colours[2]);
    },
  };
}

function pebbles(colours: readonly [string, string, string]): SpriteSpec {
  return {
    size: 18,
    paint(g, s) {
      ellipse(g, s * 0.3, s * 0.5, s * 0.14, s * 0.1, colours[0]);
      ellipse(g, s * 0.62, s * 0.36, s * 0.1, s * 0.08, colours[1]);
      ellipse(g, s * 0.6, s * 0.7, s * 0.12, s * 0.09, colours[2]);
    },
  };
}

export const WORLD: Record<string, SpriteSpec> = {
  // ---------------------------------------------------------------------------------------- Mount Olympus
  column: column(0xb8b2a4, 0xcfc9bb),
  broken_column: brokenColumn(0xa8a294, '#8a8476'),
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
  altar: altar(0x8a857a, 0xc9c2b2, 0xff8a3d, '#3a2a22', '#ffb36b'),
  ruined_wall: ruinedWall(0x9c958a, 0xb3ac9e, 'rgba(70,90,50,0.55)'),
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
  brazier: brazier(0xff8a3d, '#ff7a22', 0xffd27a, 'rgba(255,190,90,0.85)'),
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
  flowers: flowers(['#c9c08e', '#d8d4c8', '#a87aa0']),
  pebbles: pebbles(['#6e6050', '#7e705e', '#5e5244']),
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

  // ---------------------------------------------------------------------------------------- The Underworld
  obsidian_column: column(0x6c677c, 0x847e96, 'rgba(180,210,255,0.35)'),
  broken_obsidian_column: brokenColumn(0x645f74, '#76708a'),
  black_altar: altar(0x3c3946, 0x55505f, 0x7fd8ff, '#13202e', '#bfeaff'),
  underworld_wall: ruinedWall(0x625e70, 0x726e82, 'rgba(110,140,200,0.35)'),
  soul_brazier: brazier(0x5fc8ff, '#3a8ad8', 0xbfeaff, 'rgba(160,225,255,0.85)'),
  dead_tree: {
    size: 64,
    paint(g, s) {
      ellipse(g, s * 0.58, s * 0.62, s * 0.36, s * 0.26, 'rgba(0,0,0,0.4)');
      // Bare, crooked branches from a black trunk, grey with ash.
      const rng = new Rng('dead-tree');
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3);
        const len = s * rng.range(0.26, 0.42);
        const mx = s / 2 + Math.cos(a + 0.35) * len * 0.55;
        const my = s / 2 + Math.sin(a + 0.35) * len * 0.55;
        const ex = s / 2 + Math.cos(a) * len;
        const ey = s / 2 + Math.sin(a) * len;
        line(g, [s / 2, s / 2, mx, my, ex, ey], '#1c1a1e', 4);
        line(g, [s / 2, s / 2, mx, my, ex, ey], '#6a6672', 1.5);
        line(
          g,
          [mx, my, mx + Math.cos(a - 0.9) * len * 0.3, my + Math.sin(a - 0.9) * len * 0.3],
          '#38343c',
          2,
        );
      }
      volume(g, s / 2, s / 2, s * 0.1, s * 0.1, 0x2c2830, { outline: 2 });
    },
  },
  grave_stele: {
    size: 44,
    paint(g, s) {
      groundShadow(g, s, 0.32, 0.24);
      // A Greek funerary stele: a slab with a pediment, leaning, its relief worn away.
      slab(
        g,
        [
          s * 0.26,
          s * 0.84,
          s * 0.26,
          s * 0.34,
          s * 0.5,
          s * 0.18,
          s * 0.74,
          s * 0.34,
          s * 0.74,
          s * 0.84,
        ],
        0x7c788c,
        { outline: 2.5 },
      );
      slab(
        g,
        [s * 0.34, s * 0.8, s * 0.34, s * 0.42, s * 0.66, s * 0.42, s * 0.66, s * 0.8],
        0x4a4654,
        { outline: 1 },
      );
      volume(g, s / 2, s * 0.56, s * 0.08, s * 0.1, 0x6a6676, { outline: 1, rim: 0.2 });
    },
  },
  bones: {
    size: 22,
    paint(g, s) {
      line(g, [s * 0.2, s * 0.62, s * 0.66, s * 0.46], '#cfc8b6', 2.5);
      circle(g, s * 0.2, s * 0.62, s * 0.06, '#d8d2c2');
      circle(g, s * 0.66, s * 0.46, s * 0.06, '#d8d2c2');
      circle(g, s * 0.62, s * 0.76, s * 0.12, '#d4cdbc', 'rgba(8,6,10,0.6)', 1);
      circle(g, s * 0.58, s * 0.75, s * 0.03, '#2a2622');
      circle(g, s * 0.67, s * 0.75, s * 0.03, '#2a2622');
    },
  },
  asphodel: flowers(['#e8e4d8', '#d8d0a8', '#f0ece0']),
  ash_pebbles: pebbles(['#3e3a40', '#4c4850', '#34303a']),
};
