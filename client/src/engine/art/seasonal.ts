import { Rng } from '../core/rng';
import { circle, Ctx, ellipse, glow, hex, line, poly, shade, SpriteSpec, volume } from './canvas';

/**
 * The seasonal events' code-drawn art (spec: seasonal-events), lit from the upper left like the rest of the world:
 * their trees, lamps and ground clutter, their currencies on the ground, their missiles (drawn pointing right; the
 * view turns them along their flight) and the parts of their bosses. Landmarks live in `landmarks.ts`.
 */

const groundShadow = (g: Ctx, s: number, rx = 0.4, ry = 0.3) =>
  ellipse(g, s * 0.58, s * 0.6, s * rx, s * ry, 'rgba(0,0,0,0.42)');

/** A star of `points` points round (x, y), outer radius `r`, inner `r × inner`. */
function star(
  g: Ctx,
  x: number,
  y: number,
  r: number,
  points: number,
  fill: string,
  stroke?: string,
  inner = 0.45,
): void {
  const pts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const d = i % 2 ? r * inner : r;
    pts.push(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  poly(g, pts, fill, stroke, 1.2);
}

/** A heart round (x, y), `r` wide. */
function heart(g: Ctx, x: number, y: number, r: number, fill: string, stroke?: string): void {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 0.9, x, y - r * 0.35);
  g.bezierCurveTo(x + r * 0.9, y - r * 0.9, x + r * 1.3, y + r * 0.1, x, y + r * 0.9);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = 1.2;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

/** An apple: `skin`, with a stalk and a leaf. */
function apple(g: Ctx, x: number, y: number, r: number, skin: number): void {
  volume(g, x, y, r, r * 0.92, skin, { outline: Math.max(1, r * 0.14), contrast: 1.3 });
  line(g, [x, y - r * 0.7, x + r * 0.15, y - r * 1.15], '#4a3a1a', Math.max(1, r * 0.18));
  ellipse(g, x + r * 0.45, y - r * 0.95, r * 0.35, r * 0.16, '#5a8a2e');
  circle(g, x - r * 0.35, y - r * 0.3, r * 0.18, 'rgba(255,255,230,0.75)');
}

/**
 * A tree from above: a dark crown of shaded tufts (`foliage`, `light`), with fruit or blossom dots (`dots`) when
 * given. Seeded, so every copy is the same tree.
 */
function crown(
  seed: string,
  foliage: number,
  light: number,
  dots?: { readonly color: number; readonly count: number; readonly r: number },
): SpriteSpec {
  return {
    size: 60,
    paint(g, s) {
      ellipse(g, s * 0.6, s * 0.62, s * 0.44, s * 0.34, 'rgba(0,0,0,0.42)');
      const rng = new Rng(seed);
      circle(g, s / 2, s / 2, s * 0.37, hex(shade(foliage, 0.55)), 'rgba(8,6,10,0.8)', 2.5);
      for (let i = 0; i < 12; i++) {
        const a = rng.angle();
        const d = rng.range(0, s * 0.2);
        volume(
          g,
          s / 2 + Math.cos(a) * d,
          s / 2 + Math.sin(a) * d,
          s * rng.range(0.09, 0.15),
          s * rng.range(0.09, 0.15),
          i % 3 ? foliage : light,
          { outline: 1, rim: 0.25, contrast: 1.2 },
        );
      }
      if (dots)
        for (let i = 0; i < dots.count; i++) {
          const a = rng.angle();
          const d = rng.range(s * 0.05, s * 0.3);
          const x = s / 2 + Math.cos(a) * d;
          const y = s / 2 + Math.sin(a) * d;
          if (dots.r > 0.04) apple(g, x, y, s * dots.r, dots.color);
          else circle(g, x, y, s * dots.r, hex(dots.color));
        }
    },
  };
}

/** A pine in the snow from above: rings of needled tufts, the outer ones capped with snow. */
const snowyPine: SpriteSpec = {
  size: 60,
  paint(g, s) {
    ellipse(g, s * 0.6, s * 0.62, s * 0.38, s * 0.3, 'rgba(0,0,0,0.45)');
    const rng = new Rng('snowy_pine');
    star(g, s / 2, s / 2, s * 0.4, 9, '#14261c', 'rgba(8,6,10,0.85)', 0.7);
    for (let ring = 0; ring < 2; ring++) {
      const count = ring ? 6 : 9;
      const d = s * (ring ? 0.12 : 0.25);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rng.range(-0.2, 0.2) + ring * 0.3;
        const x = s / 2 + Math.cos(a) * d;
        const y = s / 2 + Math.sin(a) * d;
        volume(g, x, y, s * 0.1, s * 0.09, ring ? 0x2e5038 : 0x24402e, { outline: 1, rim: 0.2 });
        // Snow lies on the side facing the sky (upper left).
        ellipse(g, x - s * 0.025, y - s * 0.03, s * 0.06, s * 0.035, 'rgba(240,244,255,0.9)');
      }
    }
    circle(g, s / 2, s / 2, s * 0.07, '#e8eef8', 'rgba(8,6,10,0.6)', 1);
  },
};

/** A rose bush: a low mound of dark leaves dotted with red roses. */
const roseBush: SpriteSpec = {
  size: 40,
  paint(g, s) {
    groundShadow(g, s, 0.36, 0.26);
    const rng = new Rng('rose_bush');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      volume(
        g,
        s / 2 + Math.cos(a) * s * 0.17,
        s / 2 + Math.sin(a) * s * 0.14,
        s * 0.16,
        s * 0.14,
        i % 2 ? 0x2e4e2a : 0x3a5e32,
        { outline: 1.2, rim: 0.2 },
      );
    }
    volume(g, s / 2, s / 2, s * 0.17, s * 0.15, 0x447038, { outline: 1, rim: 0.25 });
    for (let i = 0; i < 7; i++) {
      const x = s * rng.range(0.25, 0.75);
      const y = s * rng.range(0.25, 0.72);
      circle(g, x, y, s * 0.06, '#c8283e', 'rgba(60,10,20,0.8)', 1);
      circle(g, x - s * 0.015, y - s * 0.015, s * 0.025, '#ff7a8a');
    }
  },
};

/** A shard of blue ice standing out of the ground, cracked, catching the light. */
const iceSpire: SpriteSpec = {
  size: 48,
  paint(g, s) {
    groundShadow(g, s, 0.32, 0.22);
    glow(g, s / 2, s * 0.5, s * 0.45, 0xa8e0ff, 0.35);
    poly(
      g,
      [
        s * 0.3,
        s * 0.78,
        s * 0.4,
        s * 0.16,
        s * 0.52,
        s * 0.4,
        s * 0.58,
        s * 0.08,
        s * 0.72,
        s * 0.78,
      ],
      '#9ac8ec',
      'rgba(20,30,50,0.85)',
      2,
    );
    poly(g, [s * 0.4, s * 0.16, s * 0.46, s * 0.78, s * 0.3, s * 0.78], '#d8f0ff');
    poly(g, [s * 0.58, s * 0.08, s * 0.72, s * 0.78, s * 0.6, s * 0.78], '#5a8ab8');
    line(g, [s * 0.5, s * 0.5, s * 0.55, s * 0.62, s * 0.52, s * 0.72], 'rgba(255,255,255,0.7)', 1);
  },
};

/** A lamp on an iron post, a star cut in its glass, burning warm on the longest night. */
const starLantern: SpriteSpec = {
  size: 36,
  paint(g, s) {
    groundShadow(g, s, 0.26, 0.18);
    glow(g, s / 2, s * 0.4, s * 0.5, 0xffc860, 0.55);
    line(g, [s / 2, s * 0.86, s / 2, s * 0.5], '#2a2830', 3);
    volume(g, s / 2, s * 0.4, s * 0.16, s * 0.18, 0x3a3640, { outline: 1.5, rim: 0.3 });
    circle(g, s / 2, s * 0.4, s * 0.11, '#ffe8a0');
    star(g, s / 2, s * 0.4, s * 0.08, 5, '#fff8e0');
  },
};

/** A brazier with a pink flame, for Aphrodite's garden. */
const roseLamp: SpriteSpec = {
  size: 40,
  paint(g, s) {
    groundShadow(g, s, 0.32, 0.24);
    glow(g, s / 2, s * 0.42, s * 0.5, 0xff7aa8, 0.55);
    line(g, [s * 0.32, s * 0.86, s * 0.42, s * 0.56], '#3a2a2a', 3);
    line(g, [s * 0.68, s * 0.86, s * 0.58, s * 0.56], '#3a2a2a', 3);
    volume(g, s / 2, s * 0.5, s * 0.26, s * 0.16, 0xc8a8a0, { contrast: 1.3 });
    ellipse(g, s / 2, s * 0.46, s * 0.2, s * 0.1, '#5a2a3a');
    glow(g, s / 2, s * 0.36, s * 0.22, 0xffd0e0, 0.9);
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
      'rgba(255,140,190,0.9)',
    );
  },
};

/** Small ground clutter: a few dabs of `colours` at fixed spots. */
function dabs(
  colours: readonly string[],
  spots: readonly (readonly [number, number, number, number])[],
): SpriteSpec {
  return {
    size: 18,
    paint(g, s) {
      spots.forEach(([x, y, rx, ry], i) =>
        ellipse(g, s * x, s * y, s * rx, s * ry, colours[i % colours.length]),
      );
    },
  };
}

const holly: SpriteSpec = {
  size: 18,
  paint(g, s) {
    for (const [x, y, a] of [
      [0.35, 0.45, -0.6],
      [0.62, 0.42, 0.5],
      [0.48, 0.66, 1.6],
    ] as const) {
      g.save();
      g.translate(s * x, s * y);
      g.rotate(a);
      poly(
        g,
        [-s * 0.2, 0, 0, -s * 0.08, s * 0.2, 0, 0, s * 0.08],
        '#2e5a34',
        'rgba(8,6,10,0.6)',
        1,
      );
      g.restore();
    }
    for (const [x, y] of [
      [0.47, 0.47],
      [0.55, 0.53],
      [0.44, 0.56],
    ])
      circle(g, s * x, s * y, s * 0.06, '#d0283a');
  },
};

const clover: SpriteSpec = {
  size: 18,
  paint(g, s) {
    for (const [x, y] of [
      [0.32, 0.4],
      [0.66, 0.58],
      [0.5, 0.26],
    ]) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        circle(
          g,
          s * x + Math.cos(a) * s * 0.05,
          s * y + Math.sin(a) * s * 0.05,
          s * 0.05,
          '#4a8a3a',
        );
      }
      circle(g, s * x, s * y, s * 0.04, '#f4f0e0');
    }
  },
};

const windfalls: SpriteSpec = {
  size: 18,
  paint(g, s) {
    apple(g, s * 0.32, s * 0.55, s * 0.12, 0xe8b830);
    apple(g, s * 0.68, s * 0.42, s * 0.1, 0xd8a028);
  },
};

// ------------------------------------------------------------------------------------------------- currencies

/** Nyx's currency: a shard of a fallen star, blue-white and glowing. */
const starShard: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0x9ab8ff, 0.7);
    star(g, s / 2, s / 2, s * 0.4, 4, '#cfdcff', 'rgba(30,40,90,0.9)', 0.4);
    circle(g, s / 2, s / 2, s * 0.1, '#ffffff');
  },
};

/** Boreas' currency: a round hailstone, frosted, with a glint. */
const hailstone: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xc8ecff, 0.55);
    volume(g, s / 2, s / 2, s * 0.32, s * 0.3, 0xd8eeff, { outline: 1.5, rim: 0.6 });
    circle(g, s * 0.4, s * 0.4, s * 0.09, '#ffffff');
  },
};

/** Eros' currency: a red rose seen from above, its petals curling. */
const rose: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xff5a7a, 0.5);
    ellipse(g, s * 0.68, s * 0.68, s * 0.18, s * 0.08, '#3a6a2e');
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      circle(
        g,
        s / 2 + Math.cos(a) * s * 0.16,
        s / 2 + Math.sin(a) * s * 0.16,
        s * 0.16,
        '#b81e36',
        'rgba(50,8,16,0.8)',
        1,
      );
    }
    circle(g, s / 2, s / 2, s * 0.16, '#e8344e', 'rgba(50,8,16,0.8)', 1);
    line(g, [s * 0.44, s * 0.46, s * 0.52, s * 0.42, s * 0.56, s * 0.52], '#7a0e20', 1);
  },
};

/** The Hesperides' currency: a golden apple with a leaf. */
const goldenApple: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffd34d, 0.6);
    apple(g, s / 2, s * 0.55, s * 0.3, 0xf2c030);
  },
};

/** Any event's currency without a picture of its own: a glowing offering coin. */
const token: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffe08a, 0.55);
    circle(g, s / 2, s / 2, s * 0.34, '#f2d070', '#6a5010', 1.5);
    star(g, s / 2, s / 2, s * 0.18, 5, '#fff4c0');
  },
};

// ------------------------------------------------------------------------------------------------- missiles

/** A star thrown by a Star-Bearer, and the stars of Nyx that circle a god. */
const nightStar: SpriteSpec = {
  size: 26,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0x8aa8ff, 0.7);
    poly(g, [s * 0.04, s / 2, s * 0.42, s * 0.36, s * 0.42, s * 0.64], 'rgba(150,180,255,0.55)');
    star(g, s * 0.58, s / 2, s * 0.24, 5, '#dce6ff', 'rgba(40,50,120,0.9)');
    circle(g, s * 0.58, s / 2, s * 0.07, '#ffffff');
  },
};

/** A Hyperborean Archer's shard of ice: a long pale crystal, point first. */
const iceShard: SpriteSpec = {
  size: 26,
  paint(g, s) {
    glow(g, s / 2, s / 2, s * 0.4, 0xb8e4ff, 0.6);
    poly(
      g,
      [s * 0.1, s / 2, s * 0.5, s * 0.36, s * 0.92, s / 2, s * 0.5, s * 0.64],
      '#c8ecff',
      'rgba(20,40,70,0.9)',
      1.5,
    );
    line(g, [s * 0.2, s / 2, s * 0.86, s / 2], 'rgba(255,255,255,0.8)', 1);
  },
};

/** A heart thrown by a Siren of Paphos: pink, glowing, trailing sparks. */
const heartBolt: SpriteSpec = {
  size: 26,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xff6a9a, 0.65);
    poly(g, [s * 0.04, s / 2, s * 0.4, s * 0.36, s * 0.4, s * 0.64], 'rgba(255,120,170,0.55)');
    g.save();
    g.translate(s * 0.6, s / 2);
    g.rotate(-Math.PI / 2);
    heart(g, 0, 0, s * 0.22, '#ff5a8a', 'rgba(80,10,30,0.9)');
    g.restore();
    circle(g, s * 0.56, s * 0.44, s * 0.05, '#ffe0ea');
  },
};

/** An apple thrown by a Hesperid. */
const appleShot: SpriteSpec = {
  size: 24,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffd34d, 0.55);
    apple(g, s * 0.56, s * 0.54, s * 0.22, 0xe8b830);
  },
};

/** A gust of the North Wind: pale curls of air, swept back. */
const gust: SpriteSpec = {
  size: 40,
  paint(g, s) {
    glow(g, s * 0.6, s / 2, s * 0.4, 0xd8f0ff, 0.45);
    for (const [dy, w, a] of [
      [-0.14, 2.5, 0.9],
      [0, 3.5, 1],
      [0.14, 2.5, 0.8],
    ] as const) {
      g.beginPath();
      g.moveTo(s * 0.1, s * (0.5 + dy));
      g.quadraticCurveTo(s * 0.55, s * (0.5 + dy * 1.6), s * 0.86, s * (0.5 + dy * 0.4));
      g.strokeStyle = `rgba(235,248,255,${a})`;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.stroke();
    }
    circle(g, s * 0.84, s / 2, s * 0.06, '#ffffff');
  },
};

/** An arrow of Eros in flight: a gold shaft, white fletching and a heart for a head. */
const loveArrow: SpriteSpec = {
  size: 34,
  paint(g, s) {
    glow(g, s * 0.75, s / 2, s * 0.3, 0xff7aa8, 0.6);
    line(g, [s * 0.1, s / 2, s * 0.72, s / 2], '#e8c050', 2.5);
    poly(g, [s * 0.08, s * 0.38, s * 0.22, s / 2, s * 0.08, s * 0.62, s * 0.16, s / 2], '#f4f0f0');
    g.save();
    g.translate(s * 0.8, s / 2);
    g.rotate(-Math.PI / 2);
    heart(g, 0, 0, s * 0.12, '#ff4a7a', 'rgba(80,10,30,0.9)');
    g.restore();
  },
};

/** A golden apple of discord, falling on its mark. */
const fallingApple: SpriteSpec = {
  size: 32,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffd34d, 0.7);
    apple(g, s / 2, s * 0.54, s * 0.26, 0xf2c030);
  },
};

// ------------------------------------------------------------------------------------------------- boss parts

/** One of Eros' arrows, hovering point-down at his side: `shaft` and `head` colours, `aura` its glow. */
function hoveringArrow(shaft: string, head: number, aura: number): SpriteSpec {
  return {
    size: 56,
    paint(g, s) {
      ellipse(g, s * 0.55, s * 0.86, s * 0.16, s * 0.05, 'rgba(0,0,0,0.35)');
      glow(g, s / 2, s / 2, s * 0.48, aura, 0.55);
      line(g, [s / 2, s * 0.12, s / 2, s * 0.7], shaft, 3.5);
      poly(
        g,
        [s * 0.4, s * 0.1, s / 2, s * 0.22, s * 0.6, s * 0.1, s / 2, s * 0.16],
        '#f4f0f0',
        'rgba(8,6,10,0.7)',
        1,
      );
      poly(
        g,
        [s * 0.4, s * 0.68, s / 2, s * 0.9, s * 0.6, s * 0.68],
        hex(head),
        'rgba(8,6,10,0.85)',
        1.5,
      );
      line(g, [s * 0.46, s * 0.72, s / 2, s * 0.84], hex(shade(head, 1.5), 0.8), 1);
    },
  };
}

/** One of Ladon's heads from above: a golden serpent's head, jaws open, eyes burning. */
const ladonHead: SpriteSpec = {
  size: 48,
  paint(g, s) {
    ellipse(g, s * 0.56, s * 0.62, s * 0.3, s * 0.2, 'rgba(0,0,0,0.4)');
    volume(g, s / 2, s * 0.6, s * 0.18, s * 0.2, 0x9a9030, { outline: 1.5 });
    volume(g, s / 2, s * 0.38, s * 0.2, s * 0.17, 0xc8b840, { outline: 1.8, contrast: 1.3 });
    poly(
      g,
      [s * 0.36, s * 0.26, s / 2, s * 0.1, s * 0.64, s * 0.26],
      '#d8c858',
      'rgba(8,6,10,0.85)',
      1.5,
    );
    poly(g, [s * 0.44, s * 0.16, s / 2, s * 0.24, s * 0.56, s * 0.16], '#5a1a10');
    for (const dx of [-0.08, 0.08]) {
      glow(g, s * (0.5 + dx), s * 0.34, s * 0.06, 0xff8a2a, 0.9);
      circle(g, s * (0.5 + dx), s * 0.34, s * 0.025, '#ffe08a');
    }
    for (let i = 0; i < 4; i++)
      line(
        g,
        [s * 0.42, s * (0.5 + i * 0.06), s * 0.58, s * (0.5 + i * 0.06)],
        'rgba(60,50,10,0.5)',
        1,
      );
  },
};

// ------------------------------------------------------------------------------------- spring and summer

/** Ferns on the forest floor: a few curled fronds. */
const ferns: SpriteSpec = {
  size: 22,
  paint(g, s) {
    for (const [x, y, a] of [
      [0.5, 0.6, -2.2],
      [0.5, 0.6, -1.5],
      [0.5, 0.6, -0.9],
      [0.5, 0.6, -0.3],
    ] as const) {
      const ex = s * x + Math.cos(a) * s * 0.4;
      const ey = s * y + Math.sin(a) * s * 0.4;
      line(g, [s * x, s * y, ex, ey], '#3a6a2e', 1.6);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const px = s * x + (ex - s * x) * t;
        const py = s * y + (ey - s * y) * t;
        ellipse(g, px, py, s * 0.06, s * 0.03, '#4e8a3a');
      }
    }
  },
};

/** Wildflowers in the grass: yellow, white and violet. */
const wildflowers: SpriteSpec = {
  size: 18,
  paint(g, s) {
    for (const [x, y, c] of [
      [0.3, 0.4, '#f0d84a'],
      [0.66, 0.6, '#f4f0e8'],
      [0.55, 0.26, '#b08ad8'],
      [0.36, 0.72, '#f0d84a'],
    ] as const) {
      circle(g, s * x, s * y, s * 0.08, c);
      circle(g, s * x, s * y, s * 0.03, '#8a5a1a');
    }
  },
};

/** Embers glowing in the ash. */
const cinders: SpriteSpec = {
  size: 18,
  paint(g, s) {
    for (const [x, y] of [
      [0.3, 0.45],
      [0.62, 0.36],
      [0.56, 0.7],
    ]) {
      glow(g, s * x, s * y, s * 0.16, 0xff7a2a, 0.7);
      circle(g, s * x, s * y, s * 0.05, '#ffc070');
    }
  },
};

/** Pan's currency: an egg painted in spring colours, red with a band of yellow and a green zigzag. */
const paintedEgg: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffb0c0, 0.45);
    volume(g, s / 2, s * 0.54, s * 0.24, s * 0.32, 0xd8384a, { outline: 1.5, rim: 0.5 });
    line(g, [s * 0.28, s * 0.5, s * 0.72, s * 0.5], '#f2d040', 2.5);
    line(
      g,
      [
        s * 0.3,
        s * 0.64,
        s * 0.38,
        s * 0.58,
        s * 0.46,
        s * 0.66,
        s * 0.54,
        s * 0.58,
        s * 0.62,
        s * 0.66,
        s * 0.7,
        s * 0.6,
      ],
      '#4aa84a',
      1.5,
    );
  },
};

/** Artemis' currency: a silver arrowhead, bright as the moon. */
const silverArrowhead: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xd8e4ff, 0.6);
    poly(
      g,
      [s / 2, s * 0.12, s * 0.74, s * 0.62, s / 2, s * 0.52, s * 0.26, s * 0.62],
      '#e0e8f4',
      'rgba(30,40,60,0.9)',
      1.5,
    );
    line(g, [s / 2, s * 0.52, s / 2, s * 0.86], '#8a6a4a', 2);
    line(g, [s / 2, s * 0.18, s / 2, s * 0.5], 'rgba(255,255,255,0.8)', 1);
  },
};

/** Apollo's currency: a laurel leaf. */
const laurelLeaf: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffe08a, 0.5);
    g.save();
    g.translate(s / 2, s / 2);
    g.rotate(-0.7);
    ellipse(g, 0, 0, s * 0.36, s * 0.15, '#5a8a32', 'rgba(20,30,10,0.85)');
    line(g, [-s * 0.32, 0, s * 0.32, 0], '#c8d870', 1.2);
    g.restore();
  },
};

/** Prometheus' currency: a glowing ember of the stolen fire. */
const ember: SpriteSpec = {
  size: 20,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xff7a2a, 0.8);
    poly(
      g,
      [
        s * 0.3,
        s * 0.6,
        s * 0.44,
        s * 0.3,
        s * 0.66,
        s * 0.36,
        s * 0.72,
        s * 0.62,
        s * 0.5,
        s * 0.74,
      ],
      '#8a2a10',
      'rgba(30,10,0,0.9)',
      1.2,
    );
    circle(g, s * 0.52, s * 0.52, s * 0.12, '#ffb040');
    circle(g, s * 0.5, s * 0.5, s * 0.05, '#fff0b0');
  },
};

/** A Dryad's thorn: a green barb, point first. */
const thornShot: SpriteSpec = {
  size: 24,
  paint(g, s) {
    glow(g, s / 2, s / 2, s * 0.4, 0x8ae070, 0.5);
    poly(
      g,
      [s * 0.12, s * 0.42, s * 0.88, s / 2, s * 0.12, s * 0.58],
      '#5a9a3a',
      'rgba(20,40,10,0.9)',
      1.5,
    );
    line(g, [s * 0.3, s * 0.44, s * 0.36, s * 0.32], '#3a6a2a', 1.5);
  },
};

/** An arrow of moon-silver: a pale shaft and a bright head. */
const moonArrow: SpriteSpec = {
  size: 30,
  paint(g, s) {
    glow(g, s * 0.75, s / 2, s * 0.3, 0xd8e8ff, 0.7);
    line(g, [s * 0.1, s / 2, s * 0.74, s / 2], '#c8d4e8', 2);
    poly(g, [s * 0.08, s * 0.4, s * 0.2, s / 2, s * 0.08, s * 0.6], '#e8f0ff');
    poly(
      g,
      [s * 0.7, s * 0.4, s * 0.92, s / 2, s * 0.7, s * 0.6],
      '#ffffff',
      'rgba(40,50,80,0.8)',
      1,
    );
  },
};

/** Sunfire thrown by a Mad Pythia: a golden blaze with a white heart. */
const sunBolt: SpriteSpec = {
  size: 26,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xffc84a, 0.7);
    poly(g, [s * 0.04, s / 2, s * 0.44, s * 0.32, s * 0.44, s * 0.68], 'rgba(255,200,80,0.6)');
    star(g, s * 0.6, s / 2, s * 0.22, 8, '#ffd860', 'rgba(120,70,0,0.8)', 0.6);
    circle(g, s * 0.6, s / 2, s * 0.08, '#fffbe0');
  },
};

/** An ember flung by a Kabeiros: a red-hot spark trailing smoke. */
const emberShot: SpriteSpec = {
  size: 26,
  paint(g, s) {
    glow(g, s / 2, s / 2, s / 2, 0xff6a2a, 0.65);
    poly(g, [s * 0.04, s / 2, s * 0.44, s * 0.36, s * 0.44, s * 0.64], 'rgba(90,70,60,0.55)');
    circle(g, s * 0.6, s / 2, s * 0.17, '#ff7a2a', 'rgba(255,220,120,0.9)', 1.5);
    circle(g, s * 0.62, s / 2, s * 0.07, '#ffe0a0');
  },
};

/** One of Apollo's sun-rays: a long golden streak. */
const sunRay: SpriteSpec = {
  size: 32,
  paint(g, s) {
    glow(g, s * 0.6, s / 2, s * 0.4, 0xffd060, 0.6);
    poly(g, [s * 0.04, s / 2, s * 0.6, s * 0.4, s * 0.94, s / 2, s * 0.6, s * 0.6], '#ffd860');
    line(g, [s * 0.2, s / 2, s * 0.9, s / 2], '#fffbe0', 1.5);
  },
};

export const SEASONAL: Readonly<Record<string, SpriteSpec>> = {
  // Spring and summer.
  oak_tree: crown('oak', 0x3e5a2e, 0x587a3a),
  blossom_tree: crown('blossom', 0x6a8a52, 0xd8a8b8, { color: 0xffe0ea, count: 14, r: 0.03 }),
  laurel_tree: crown('laurel', 0x3a5a2a, 0x5a7a3a, { color: 0xe8d870, count: 6, r: 0.02 }),
  ferns,
  wildflowers,
  cinders,
  painted_egg: paintedEgg,
  silver_arrowhead: silverArrowhead,
  laurel_leaf: laurelLeaf,
  ember,
  thorn_shot: thornShot,
  moon_arrow: moonArrow,
  sun_bolt: sunBolt,
  ember_shot: emberShot,
  sun_ray: sunRay,
  // The world.
  snowy_pine: snowyPine,
  myrtle_tree: crown('myrtle', 0x4a6e3e, 0x6a8e52, { color: 0xf4f0e8, count: 9, r: 0.025 }),
  apple_tree: crown('apple', 0x3e6a2e, 0x5a8a3a, { color: 0xf2c030, count: 7, r: 0.06 }),
  rose_bush: roseBush,
  ice_spire: iceSpire,
  star_lantern: starLantern,
  rose_lamp: roseLamp,
  snow_drift: dabs(
    ['rgba(240,244,255,0.85)', 'rgba(220,228,244,0.8)'],
    [
      [0.35, 0.5, 0.26, 0.12],
      [0.62, 0.4, 0.2, 0.09],
      [0.55, 0.68, 0.16, 0.07],
    ],
  ),
  ice_shards: dabs(
    ['#c8e0ff', '#a8c8ec', '#e0f0ff'],
    [
      [0.3, 0.5, 0.12, 0.05],
      [0.62, 0.36, 0.08, 0.04],
      [0.6, 0.7, 0.1, 0.04],
    ],
  ),
  rose_petals: dabs(
    ['#e8506e', '#ff7a94', '#c83a5a'],
    [
      [0.3, 0.4, 0.08, 0.05],
      [0.62, 0.58, 0.07, 0.05],
      [0.5, 0.28, 0.06, 0.04],
      [0.42, 0.7, 0.06, 0.04],
    ],
  ),
  holly,
  clover,
  windfalls,
  // Currencies.
  star_shard: starShard,
  hailstone,
  rose,
  golden_apple: goldenApple,
  token,
  // Missiles.
  night_star: nightStar,
  ice_shard: iceShard,
  heart_bolt: heartBolt,
  apple_shot: appleShot,
  gust,
  love_arrow: loveArrow,
  falling_apple: fallingApple,
  // Boss parts.
  golden_arrow: hoveringArrow('#e8c050', 0xffd34d, 0xffd34d),
  leaden_arrow: hoveringArrow('#5a5e6a', 0x7a7e8a, 0x8a8ec0),
  ladon_head: ladonHead,
};
