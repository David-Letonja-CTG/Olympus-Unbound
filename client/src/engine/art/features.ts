import { ellipse, glow, hex, line, poly, shade, slab, SpriteSpec, volume } from './canvas';

/**
 * The map's hazards and helpers (spec: arena-generation / map hazards, map helpers): lava vents, crusher slabs, a
 * fallen column's shaft, healing springs and cold braziers. Painted once, lit from the upper left.
 */

/** A glowing crack in the ground, ringed with cooled crust. */
function vent(hot: number, crust: number): SpriteSpec {
  return {
    size: 72,
    paint(g, s) {
      ellipse(g, s / 2, s * 0.52, s * 0.42, s * 0.3, hex(crust, 0.85));
      glow(g, s / 2, s / 2, s * 0.42, hot, 0.5);
      const crack = [
        s * 0.2,
        s * 0.56,
        s * 0.36,
        s * 0.46,
        s * 0.5,
        s * 0.54,
        s * 0.64,
        s * 0.42,
        s * 0.8,
        s * 0.5,
      ];
      line(g, crack, hex(shade(hot, 0.6)), 7);
      line(g, crack, hex(hot), 4);
      line(g, [s * 0.5, s * 0.54, s * 0.46, s * 0.72], hex(hot), 3);
      line(g, [s * 0.36, s * 0.46, s * 0.4, s * 0.3], hex(hot), 2.5);
      glow(g, s * 0.5, s * 0.52, s * 0.14, 0xfff0b0, 0.8);
    },
  };
}

/** A carved stone slab standing on edge, seen from above: it slams across the road. */
function crusherSlab(stone: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.62, s * 0.3, s * 0.36, 'rgba(0,0,0,0.42)');
      slab(
        g,
        [s * 0.36, s * 0.12, s * 0.64, s * 0.12, s * 0.64, s * 0.88, s * 0.36, s * 0.88],
        stone,
        {
          outline: 2.5,
          contrast: 1.3,
        },
      );
      // Bronze teeth on the striking face.
      for (let i = 0; i < 4; i++) {
        const y = s * (0.2 + i * 0.18);
        poly(
          g,
          [s * 0.64, y, s * 0.74, y + s * 0.05, s * 0.64, y + s * 0.1],
          '#b08a4a',
          'rgba(8,6,10,0.85)',
        );
      }
    },
  };
}

/** A column's shaft lying on its side, broken into drums: drawn along +x, rotated along the fall. */
function shaft(stone: number): SpriteSpec {
  return {
    size: 160,
    paint(g, s) {
      ellipse(g, s * 0.52, s * 0.56, s * 0.48, s * 0.08, 'rgba(0,0,0,0.4)');
      for (let i = 0; i < 4; i++) {
        const x = s * (0.08 + i * 0.22);
        volume(g, x + s * 0.1, s * 0.5, s * 0.1, s * 0.06, shade(stone, 1 - i * 0.04), {
          outline: 2,
        });
        line(g, [x + s * 0.03, s * 0.5, x + s * 0.17, s * 0.5], 'rgba(60,56,50,0.35)', 1.2);
      }
      ellipse(
        g,
        s * 0.86,
        s * 0.5,
        s * 0.03,
        s * 0.06,
        hex(shade(stone, 0.8)),
        'rgba(8,6,10,0.85)',
      );
    },
  };
}

/** A round pool rimmed with stones: `water` its colour, `glint` the light on it. */
function spring(water: number, rim: number, glint: number): SpriteSpec {
  return {
    size: 96,
    paint(g, s) {
      ellipse(g, s / 2, s * 0.54, s * 0.44, s * 0.34, 'rgba(0,0,0,0.38)');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        volume(
          g,
          s / 2 + Math.cos(a) * s * 0.36,
          s / 2 + Math.sin(a) * s * 0.27,
          s * 0.07,
          s * 0.05,
          shade(rim, 1 - (i % 3) * 0.08),
          {
            outline: 1.2,
          },
        );
      }
      ellipse(g, s / 2, s / 2, s * 0.32, s * 0.23, hex(water), 'rgba(8,6,10,0.85)');
      glow(g, s / 2, s * 0.48, s * 0.28, glint, 0.45);
      ellipse(g, s * 0.42, s * 0.44, s * 0.1, s * 0.03, hex(0xffffff, 0.45));
      ellipse(g, s * 0.6, s * 0.56, s * 0.06, s * 0.02, hex(0xffffff, 0.3));
    },
  };
}

/** A cold fire-bowl: the same iron bowl as a lit brazier, with grey ash and no flame. */
function coldBrazier(metal: number): SpriteSpec {
  return {
    size: 40,
    paint(g, s) {
      ellipse(g, s * 0.58, s * 0.6, s * 0.32, s * 0.24, 'rgba(0,0,0,0.38)');
      line(g, [s * 0.32, s * 0.86, s * 0.42, s * 0.56], '#2a2420', 3);
      line(g, [s * 0.68, s * 0.86, s * 0.58, s * 0.56], '#2a2420', 3);
      volume(g, s / 2, s * 0.5, s * 0.26, s * 0.16, metal, { contrast: 1.4 });
      ellipse(g, s / 2, s * 0.46, s * 0.2, s * 0.1, '#5a5650');
      ellipse(g, s * 0.46, s * 0.45, s * 0.07, s * 0.03, '#7a766e');
    },
  };
}

export const FEATURES: Record<string, SpriteSpec> = {
  lava_vent: vent(0xff7a2a, 0x2a1a16),
  soul_vent: vent(0x5fc8ff, 0x1a1a24),
  crusher_slab: crusherSlab(0x8a7a62),
  column_shaft: shaft(0xe8e2d4),
  healing_spring: spring(0x2a6a7a, 0xa8a292, 0x8affe0),
  marsh_spring: spring(0x2a5a4a, 0x6e7a5e, 0xb0ff8a),
  brazier_cold: coldBrazier(0x4a3e34),
};
