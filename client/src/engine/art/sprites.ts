import { Rng } from '../core/rng';

/**
 * Original placeholder art (D9), drawn with Canvas 2D at startup: no image files, no licences. Characters face
 * right and are drawn top-down with a slight 3/4 tilt; projectiles point right (the view rotates them).
 * Shared by the Phaser layer (textures) and Angular (HUD and menu icons via `spriteDataUrl`).
 */

type Ctx = CanvasRenderingContext2D;
type Painter = (g: Ctx, s: number) => void;

interface SpriteSpec {
  readonly size: number;
  readonly paint: Painter;
}

const hex = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

function circle(
  g: Ctx,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  width = 2,
): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

function ellipse(
  g: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = 2;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

function poly(g: Ctx, points: number[], fill: string, stroke?: string, width = 2): void {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

function line(g: Ctx, points: number[], color: string, width: number): void {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

function shadow(g: Ctx, s: number, w = 0.34, y = 0.8): void {
  ellipse(g, s / 2, s * y, s * w, s * 0.09, 'rgba(0,0,0,0.35)');
}

function glow(g: Ctx, x: number, y: number, r: number, color: number, alpha = 0.6): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, hex(color, alpha));
  grad.addColorStop(1, hex(color, 0));
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A lightning bolt from (x, y) scaled to height h. */
function bolt(
  g: Ctx,
  x: number,
  y: number,
  h: number,
  fill: string,
  stroke = 'rgba(255,255,255,0.9)',
): void {
  const w = h * 0.5;
  poly(
    g,
    [
      x + w * 0.15,
      y,
      x - w * 0.45,
      y + h * 0.55,
      x - w * 0.02,
      y + h * 0.55,
      x - w * 0.2,
      y + h,
      x + w * 0.5,
      y + h * 0.38,
      x + w * 0.05,
      y + h * 0.38,
      x + w * 0.35,
      y,
    ],
    fill,
    stroke,
    1.5,
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Characters

const characters: Record<string, SpriteSpec> = {
  zeus: {
    size: 56,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xfff2a8, 0.35);
      shadow(g, s, 0.3, 0.84);
      ellipse(g, s / 2, s * 0.6, s * 0.24, s * 0.25, '#f4f1ea', '#c9a227'); // robe
      line(g, [s * 0.3, s * 0.62, s * 0.7, s * 0.5], '#d4af37', 3); // sash
      circle(g, s / 2, s * 0.32, s * 0.14, '#e9c9a5', '#8a6a4a', 1.5); // head
      ellipse(g, s / 2, s * 0.42, s * 0.11, s * 0.09, '#f7f7f7'); // beard
      line(g, [s * 0.36, s * 0.24, s * 0.5, s * 0.18, s * 0.64, s * 0.24], '#d4af37', 3); // laurel
      bolt(g, s * 0.76, s * 0.3, s * 0.36, '#fff27a', '#ffffff');
    },
  },
  satyr: {
    size: 44,
    paint(g, s) {
      shadow(g, s);
      ellipse(g, s / 2, s * 0.6, s * 0.24, s * 0.22, '#7a4a2a', '#3e2414');
      circle(g, s / 2, s * 0.36, s * 0.15, '#9c6b45', '#3e2414', 1.5);
      line(g, [s * 0.4, s * 0.26, s * 0.3, s * 0.12, s * 0.38, s * 0.08], '#e8dcc0', 3); // horns
      line(g, [s * 0.6, s * 0.26, s * 0.7, s * 0.12, s * 0.62, s * 0.08], '#e8dcc0', 3);
      circle(g, s * 0.56, s * 0.35, s * 0.035, '#ff3b30');
      circle(g, s * 0.44, s * 0.35, s * 0.035, '#ff3b30');
      line(g, [s * 0.4, s * 0.78, s * 0.38, s * 0.9], '#3e2414', 4);
      line(g, [s * 0.6, s * 0.78, s * 0.62, s * 0.9], '#3e2414', 4);
    },
  },
  harpy: {
    size: 44,
    paint(g, s) {
      shadow(g, s, 0.26, 0.86);
      poly(g, [s * 0.5, s * 0.5, s * 0.04, s * 0.3, s * 0.18, s * 0.62], '#4a2a5e', '#24112f');
      poly(g, [s * 0.5, s * 0.5, s * 0.96, s * 0.3, s * 0.82, s * 0.62], '#4a2a5e', '#24112f');
      ellipse(g, s / 2, s * 0.56, s * 0.13, s * 0.2, '#8e5aa8', '#24112f');
      circle(g, s / 2, s * 0.34, s * 0.11, '#d9c2e0', '#24112f', 1.5);
      circle(g, s * 0.46, s * 0.33, s * 0.025, '#ff2d55');
      circle(g, s * 0.54, s * 0.33, s * 0.025, '#ff2d55');
    },
  },
  stymphalian_bird: {
    size: 28,
    paint(g, s) {
      shadow(g, s, 0.22, 0.86);
      poly(
        g,
        [s * 0.5, s * 0.55, s * 0.05, s * 0.25, s * 0.3, s * 0.62],
        '#3c4652',
        '#1b2026',
        1.5,
      );
      poly(
        g,
        [s * 0.5, s * 0.55, s * 0.95, s * 0.25, s * 0.7, s * 0.62],
        '#3c4652',
        '#1b2026',
        1.5,
      );
      ellipse(g, s / 2, s * 0.56, s * 0.12, s * 0.16, '#566573', '#1b2026');
      poly(g, [s * 0.62, s * 0.5, s * 0.82, s * 0.56, s * 0.62, s * 0.6], '#cd7f32');
    },
  },
  corrupted_hoplite: {
    size: 48,
    paint(g, s) {
      shadow(g, s);
      ellipse(g, s / 2, s * 0.58, s * 0.22, s * 0.22, '#5b1e1a', '#2a0d0b');
      circle(g, s * 0.5, s * 0.34, s * 0.14, '#8c6b3f', '#2a0d0b', 1.5); // helmet
      poly(g, [s * 0.36, s * 0.22, s * 0.5, s * 0.06, s * 0.64, s * 0.22], '#c0392b'); // crest
      circle(g, s * 0.62, s * 0.6, s * 0.2, '#b8860b', '#5e4407', 2.5); // shield
      circle(g, s * 0.62, s * 0.6, s * 0.08, '#c0392b');
      line(g, [s * 0.2, s * 0.85, s * 0.3, s * 0.2], '#8a8a8a', 3); // spear
    },
  },
  centaur_archer: {
    size: 52,
    paint(g, s) {
      shadow(g, s, 0.38, 0.84);
      ellipse(g, s * 0.44, s * 0.62, s * 0.28, s * 0.15, '#5d4a2e', '#2b2115');
      line(g, [s * 0.24, s * 0.7, s * 0.22, s * 0.84], '#2b2115', 4);
      line(g, [s * 0.62, s * 0.7, s * 0.64, s * 0.84], '#2b2115', 4);
      ellipse(g, s * 0.66, s * 0.42, s * 0.09, s * 0.15, '#6e8b3d', '#2b3a16');
      circle(g, s * 0.66, s * 0.24, s * 0.09, '#c9a27e', '#2b2115', 1.5);
      g.beginPath();
      g.arc(s * 0.78, s * 0.4, s * 0.17, -1.2, 1.2);
      g.strokeStyle = '#8b5a2b';
      g.lineWidth = 3;
      g.stroke();
    },
  },
  bronze_bull: {
    size: 60,
    paint(g, s) {
      shadow(g, s, 0.38, 0.84);
      ellipse(g, s * 0.46, s * 0.58, s * 0.3, s * 0.2, '#a0632a', '#4a2c10');
      circle(g, s * 0.74, s * 0.48, s * 0.14, '#b87333', '#4a2c10', 2);
      line(g, [s * 0.7, s * 0.36, s * 0.66, s * 0.2, s * 0.74, s * 0.16], '#efe6d0', 4);
      line(g, [s * 0.82, s * 0.38, s * 0.9, s * 0.24, s * 0.96, s * 0.24], '#efe6d0', 4);
      circle(g, s * 0.84, s * 0.54, s * 0.03, '#ff8c00');
      glow(g, s * 0.86, s * 0.55, s * 0.08, 0xff8c00, 0.8);
      line(g, [s * 0.3, s * 0.74, s * 0.28, s * 0.88], '#4a2c10', 5);
      line(g, [s * 0.6, s * 0.74, s * 0.62, s * 0.88], '#4a2c10', 5);
    },
  },
  fallen_oracle: {
    size: 44,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x9b59b6, 0.35);
      shadow(g, s);
      poly(g, [s * 0.5, s * 0.18, s * 0.78, s * 0.82, s * 0.22, s * 0.82], '#4a235a', '#1c0b24');
      circle(g, s / 2, s * 0.3, s * 0.12, '#2c1338', '#1c0b24', 1.5);
      circle(g, s / 2, s * 0.31, s * 0.045, '#7fffd4');
      glow(g, s / 2, s * 0.31, s * 0.12, 0x7fffd4, 0.7);
    },
  },
  marble_sentinel: {
    size: 68,
    paint(g, s) {
      shadow(g, s, 0.36, 0.86);
      poly(
        g,
        [s * 0.24, s * 0.3, s * 0.76, s * 0.3, s * 0.82, s * 0.82, s * 0.18, s * 0.82],
        '#bfc9ca',
        '#5f6a6a',
        3,
      );
      poly(
        g,
        [s * 0.34, s * 0.1, s * 0.66, s * 0.1, s * 0.7, s * 0.32, s * 0.3, s * 0.32],
        '#d5dbdb',
        '#5f6a6a',
        2,
      );
      line(g, [s * 0.4, s * 0.4, s * 0.48, s * 0.55, s * 0.42, s * 0.7], '#7f8c8d', 2);
      line(g, [s * 0.66, s * 0.5, s * 0.58, s * 0.62], '#7f8c8d', 2);
      circle(g, s * 0.42, s * 0.2, s * 0.03, '#ff3b30');
      circle(g, s * 0.58, s * 0.2, s * 0.03, '#ff3b30');
    },
  },
  cyclops: {
    size: 132,
    paint(g, s) {
      shadow(g, s, 0.36, 0.88);
      ellipse(g, s / 2, s * 0.6, s * 0.3, s * 0.27, '#6d4c41', '#2e1f1a');
      ellipse(g, s / 2, s * 0.66, s * 0.18, s * 0.14, '#8d6e63'); // belly
      circle(g, s / 2, s * 0.3, s * 0.18, '#a1887f', '#2e1f1a', 3);
      circle(g, s / 2, s * 0.28, s * 0.09, '#fafafa', '#2e1f1a', 2);
      circle(g, s / 2, s * 0.28, s * 0.045, '#c62828');
      circle(g, s / 2, s * 0.28, s * 0.018, '#111');
      line(g, [s * 0.42, s * 0.4, s * 0.58, s * 0.4], '#2e1f1a', 3);
      line(g, [s * 0.82, s * 0.86, s * 0.9, s * 0.4], '#5d4037', 10); // club
      circle(g, s * 0.9, s * 0.38, s * 0.07, '#4e342e');
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Projectiles and pickups

const projectiles: Record<string, SpriteSpec> = {
  proj_spear: {
    size: 40,
    paint(g, s) {
      glow(g, s * 0.6, s / 2, s * 0.4, 0xfff27a, 0.55);
      line(g, [s * 0.05, s / 2, s * 0.8, s / 2], '#fff8c4', 3);
      poly(g, [s * 0.98, s / 2, s * 0.74, s * 0.38, s * 0.74, s * 0.62], '#ffffff', '#fff27a', 1);
    },
  },
  proj_arrow: {
    size: 28,
    paint(g, s) {
      line(g, [s * 0.05, s / 2, s * 0.82, s / 2], '#f5deb3', 2);
      poly(g, [s, s / 2, s * 0.76, s * 0.36, s * 0.76, s * 0.64], '#ffe9b0');
      line(g, [s * 0.05, s * 0.36, s * 0.18, s / 2, s * 0.05, s * 0.64], '#ffffff', 2);
    },
  },
  proj_trident: {
    size: 36,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x6fd3ff, 0.4);
      line(g, [s * 0.05, s / 2, s * 0.72, s / 2], '#bfefff', 3);
      line(g, [s * 0.72, s * 0.3, s * 0.72, s * 0.7], '#bfefff', 3);
      line(g, [s * 0.72, s * 0.3, s * 0.95, s * 0.3], '#e8fbff', 3);
      line(g, [s * 0.72, s / 2, s * 0.98, s / 2], '#e8fbff', 3);
      line(g, [s * 0.72, s * 0.7, s * 0.95, s * 0.7], '#e8fbff', 3);
    },
  },
  proj_orb: {
    size: 36,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x8fe8ff, 0.8);
      circle(g, s / 2, s / 2, s * 0.22, '#e6fbff', '#8fe8ff', 2);
      bolt(g, s / 2, s * 0.34, s * 0.32, '#8fe8ff', '#ffffff');
    },
  },
  enemy_arrow: {
    size: 24,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xff4d2e, 0.5);
      line(g, [s * 0.05, s / 2, s * 0.8, s / 2], '#ffb199', 3);
      poly(g, [s, s / 2, s * 0.72, s * 0.3, s * 0.72, s * 0.7], '#ff4d2e');
    },
  },
  xp_small: {
    size: 16,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x4fc3f7, 0.6);
      poly(
        g,
        [s / 2, s * 0.12, s * 0.8, s / 2, s / 2, s * 0.88, s * 0.2, s / 2],
        '#4fc3f7',
        '#e1f5fe',
        1.5,
      );
    },
  },
  xp_large: {
    size: 22,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x69f0ae, 0.7);
      poly(
        g,
        [s / 2, s * 0.08, s * 0.84, s / 2, s / 2, s * 0.92, s * 0.16, s / 2],
        '#00e676',
        '#e8f5e9',
        1.5,
      );
    },
  },
  gold: {
    size: 16,
    paint(g, s) {
      circle(g, s / 2, s / 2, s * 0.38, '#ffd34d', '#a07800', 1.5);
      circle(g, s / 2, s / 2, s * 0.18, '#ffe680');
    },
  },
  heal: {
    size: 20,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xff7a9a, 0.5);
      poly(
        g,
        [
          s * 0.35,
          s * 0.18,
          s * 0.65,
          s * 0.18,
          s * 0.62,
          s * 0.3,
          s * 0.78,
          s * 0.5,
          s * 0.7,
          s * 0.85,
          s * 0.3,
          s * 0.85,
          s * 0.22,
          s * 0.5,
          s * 0.38,
          s * 0.3,
        ],
        '#ff7a9a',
        '#fff0f3',
        1.5,
      );
    },
  },
  chest: {
    size: 30,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xffd34d, 0.7);
      poly(
        g,
        [s * 0.15, s * 0.4, s * 0.85, s * 0.4, s * 0.85, s * 0.82, s * 0.15, s * 0.82],
        '#8b5a2b',
        '#ffd34d',
        2,
      );
      poly(
        g,
        [s * 0.15, s * 0.4, s * 0.25, s * 0.22, s * 0.75, s * 0.22, s * 0.85, s * 0.4],
        '#a0522d',
        '#ffd34d',
        2,
      );
      circle(g, s / 2, s * 0.52, s * 0.06, '#ffd34d');
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// World objects

const world: Record<string, SpriteSpec> = {
  column: {
    size: 44,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.58, s * 0.38, s * 0.3, 'rgba(0,0,0,0.3)');
      circle(g, s / 2, s / 2, s * 0.38, '#e8e2d4', '#9e9686', 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        line(
          g,
          [
            s / 2 + Math.cos(a) * s * 0.12,
            s / 2 + Math.sin(a) * s * 0.12,
            s / 2 + Math.cos(a) * s * 0.34,
            s / 2 + Math.sin(a) * s * 0.34,
          ],
          '#c9c1ad',
          1.5,
        );
      }
      circle(g, s / 2, s / 2, s * 0.12, '#f4f0e6');
    },
  },
  broken_column: {
    size: 48,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.58, s * 0.38, s * 0.3, 'rgba(0,0,0,0.3)');
      poly(
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
        '#d8d0bf',
        '#9e9686',
        2,
      );
      line(g, [s * 0.34, s * 0.3, s * 0.5, s * 0.5, s * 0.46, s * 0.7], '#a59c8a', 1.5);
    },
  },
  statue: {
    size: 56,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.6, s * 0.4, s * 0.3, 'rgba(0,0,0,0.3)');
      poly(
        g,
        [s * 0.14, s * 0.3, s * 0.86, s * 0.3, s * 0.86, s * 0.86, s * 0.14, s * 0.86],
        '#b9b2a2',
        '#7d7666',
        2,
      );
      ellipse(g, s / 2, s * 0.5, s * 0.2, s * 0.22, '#e6e0d2', '#8f8878');
      circle(g, s / 2, s * 0.28, s * 0.11, '#efe9dc', '#8f8878', 1.5);
      line(g, [s * 0.68, s * 0.44, s * 0.8, s * 0.12], '#d8d0bf', 3);
    },
  },
  olive_tree: {
    size: 60,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.6, s * 0.42, s * 0.32, 'rgba(0,0,0,0.32)');
      const rng = new Rng('olive');
      circle(g, s / 2, s / 2, s * 0.36, '#55703a');
      for (let i = 0; i < 9; i++) {
        const a = rng.angle();
        const d = rng.range(0, s * 0.2);
        circle(
          g,
          s / 2 + Math.cos(a) * d,
          s / 2 + Math.sin(a) * d,
          s * rng.range(0.1, 0.16),
          i % 2 ? '#7b9a55' : '#93ad6e',
        );
      }
      for (let i = 0; i < 6; i++)
        circle(g, s * rng.range(0.3, 0.7), s * rng.range(0.3, 0.7), s * 0.025, '#3d4a2a');
    },
  },
  rock: {
    size: 44,
    paint(g, s) {
      ellipse(g, s * 0.56, s * 0.6, s * 0.38, s * 0.28, 'rgba(0,0,0,0.3)');
      poly(
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
        '#8a8580',
        '#56524e',
        2,
      );
      line(g, [s * 0.3, s * 0.4, s * 0.52, s * 0.32, s * 0.7, s * 0.42], '#a7a29c', 2);
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
      ])
        line(g, [s * x, s * 0.85, s * (x + 0.05), s * (0.85 - h)], 'rgba(120,170,80,0.85)', 2);
    },
  },
  flowers: {
    size: 18,
    paint(g, s) {
      circle(g, s * 0.3, s * 0.4, s * 0.12, '#f2e86d');
      circle(g, s * 0.65, s * 0.6, s * 0.12, '#f7f7f7');
      circle(g, s * 0.55, s * 0.25, s * 0.1, '#e98bd1');
    },
  },
  pebbles: {
    size: 18,
    paint(g, s) {
      ellipse(g, s * 0.3, s * 0.5, s * 0.14, s * 0.1, '#9c8a73');
      ellipse(g, s * 0.62, s * 0.36, s * 0.1, s * 0.08, '#b09d85');
      ellipse(g, s * 0.6, s * 0.7, s * 0.12, s * 0.09, '#8a7963');
    },
  },
  marble_shards: {
    size: 20,
    paint(g, s) {
      poly(g, [s * 0.2, s * 0.6, s * 0.4, s * 0.4, s * 0.5, s * 0.66], '#f2eee4', '#b5ad9c', 1);
      poly(g, [s * 0.58, s * 0.3, s * 0.82, s * 0.36, s * 0.66, s * 0.5], '#e5dfd1', '#b5ad9c', 1);
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Icons: a framed emblem with a symbol, for weapons, armour, relics, skills and synergies.

type Symbol = (g: Ctx, s: number, color: string) => void;

const symbols: Record<string, Symbol> = {
  bolt: (g, s, c) => bolt(g, s * 0.52, s * 0.2, s * 0.6, c),
  spear: (g, s, c) => {
    line(g, [s * 0.24, s * 0.76, s * 0.7, s * 0.3], '#e8dcc0', 3);
    poly(g, [s * 0.8, s * 0.2, s * 0.64, s * 0.28, s * 0.72, s * 0.36], c, '#fff', 1);
    bolt(g, s * 0.36, s * 0.22, s * 0.28, c);
  },
  bow: (g, s, c) => {
    g.beginPath();
    g.arc(s * 0.36, s / 2, s * 0.3, -1.2, 1.2);
    g.strokeStyle = c;
    g.lineWidth = 3;
    g.stroke();
    line(g, [s * 0.47, s * 0.22, s * 0.47, s * 0.78], '#fff', 1);
    line(g, [s * 0.3, s / 2, s * 0.82, s / 2], '#f5deb3', 2);
    poly(g, [s * 0.86, s / 2, s * 0.76, s * 0.44, s * 0.76, s * 0.56], c);
  },
  trident: (g, s, c) => {
    line(g, [s / 2, s * 0.84, s / 2, s * 0.28], c, 3);
    line(g, [s * 0.32, s * 0.38, s * 0.32, s * 0.18], c, 3);
    line(g, [s * 0.68, s * 0.38, s * 0.68, s * 0.18], c, 3);
    line(g, [s * 0.32, s * 0.38, s * 0.68, s * 0.38], c, 3);
    line(g, [s / 2, s * 0.28, s / 2, s * 0.14], c, 3);
  },
  orb: (g, s, c) => {
    glow(g, s / 2, s / 2, s * 0.36, 0x8fe8ff, 0.7);
    circle(g, s / 2, s / 2, s * 0.2, '#e6fbff', c, 2);
  },
  hammer: (g, s, c) => {
    line(g, [s * 0.3, s * 0.8, s * 0.56, s * 0.42], '#8b5a2b', 4);
    poly(
      g,
      [s * 0.44, s * 0.2, s * 0.84, s * 0.44, s * 0.72, s * 0.62, s * 0.32, s * 0.38],
      c,
      '#5e4407',
      1.5,
    );
  },
  sword: (g, s, c) => {
    line(g, [s * 0.26, s * 0.74, s * 0.76, s * 0.24], '#ffe0c2', 4);
    line(g, [s * 0.22, s * 0.6, s * 0.4, s * 0.78], '#d4af37', 3);
    glow(g, s * 0.58, s * 0.4, s * 0.28, 0xff7a2e, 0.6);
    line(g, [s * 0.38, s * 0.58, s * 0.72, s * 0.24], c, 2);
  },
  scythe: (g, s, c) => {
    line(g, [s * 0.34, s * 0.84, s * 0.6, s * 0.2], '#5d4037', 3);
    g.beginPath();
    g.arc(s * 0.42, s * 0.26, s * 0.24, -0.4, 1.6, true);
    g.strokeStyle = c;
    g.lineWidth = 4;
    g.stroke();
  },
  storm: (g, s, c) => {
    ellipse(g, s / 2, s * 0.32, s * 0.28, s * 0.14, '#9aa5b1');
    bolt(g, s * 0.5, s * 0.36, s * 0.48, c);
  },
  shield: (g, s, c) =>
    poly(
      g,
      [
        s * 0.5,
        s * 0.16,
        s * 0.82,
        s * 0.28,
        s * 0.76,
        s * 0.62,
        s * 0.5,
        s * 0.86,
        s * 0.24,
        s * 0.62,
        s * 0.18,
        s * 0.28,
      ],
      c,
      '#fff',
      1.5,
    ),
  shell: (g, s, c) => {
    poly(
      g,
      [s * 0.5, s * 0.8, s * 0.16, s * 0.38, s * 0.5, s * 0.18, s * 0.84, s * 0.38],
      c,
      '#fff',
      1.5,
    );
    for (const x of [0.36, 0.5, 0.64])
      line(g, [s / 2, s * 0.78, s * x, s * 0.24], 'rgba(255,255,255,0.6)', 1);
  },
  wing: (g, s, c) =>
    poly(
      g,
      [
        s * 0.2,
        s * 0.7,
        s * 0.4,
        s * 0.24,
        s * 0.86,
        s * 0.18,
        s * 0.6,
        s * 0.42,
        s * 0.76,
        s * 0.46,
        s * 0.5,
        s * 0.6,
      ],
      c,
      '#fff',
      1.5,
    ),
  eye: (g, s, c) => {
    ellipse(g, s / 2, s / 2, s * 0.32, s * 0.18, '#fafafa', c);
    circle(g, s / 2, s / 2, s * 0.11, c);
    circle(g, s / 2, s / 2, s * 0.05, '#111');
  },
  lantern: (g, s, c) => {
    glow(g, s / 2, s * 0.56, s * 0.3, 0x9be8c0, 0.8);
    poly(
      g,
      [s * 0.36, s * 0.34, s * 0.64, s * 0.34, s * 0.6, s * 0.78, s * 0.4, s * 0.78],
      'rgba(155,232,192,0.5)',
      c,
      2,
    );
    line(g, [s * 0.42, s * 0.34, s / 2, s * 0.2, s * 0.58, s * 0.34], c, 2);
  },
  fleece: (g, s, c) => {
    for (const [x, y] of [
      [0.36, 0.4],
      [0.56, 0.36],
      [0.66, 0.54],
      [0.44, 0.6],
      [0.3, 0.56],
    ])
      circle(g, s * x, s * y, s * 0.14, c, '#a07800', 1);
  },
  feather: (g, s, c) => {
    ellipse(g, s / 2, s / 2, s * 0.12, s * 0.32, c, '#fff');
    line(g, [s / 2, s * 0.84, s / 2, s * 0.2], '#fff3e0', 1.5);
  },
  horus: (g, s, c) => {
    ellipse(g, s / 2, s * 0.44, s * 0.3, s * 0.15, '#fafafa', c);
    circle(g, s / 2, s * 0.44, s * 0.09, c);
    line(g, [s * 0.42, s * 0.56, s * 0.38, s * 0.78, s * 0.3, s * 0.8], c, 2.5);
    line(g, [s * 0.58, s * 0.56, s * 0.74, s * 0.72], c, 2.5);
  },
  fist: (g, s, c) => {
    poly(
      g,
      [s * 0.28, s * 0.4, s * 0.72, s * 0.4, s * 0.72, s * 0.74, s * 0.28, s * 0.74],
      c,
      '#fff',
      1.5,
    );
    for (const x of [0.39, 0.5, 0.61])
      line(g, [s * x, s * 0.4, s * x, s * 0.54], 'rgba(0,0,0,0.4)', 1.5);
  },
  boot: (g, s, c) => {
    poly(
      g,
      [
        s * 0.36,
        s * 0.2,
        s * 0.56,
        s * 0.2,
        s * 0.56,
        s * 0.6,
        s * 0.8,
        s * 0.66,
        s * 0.8,
        s * 0.8,
        s * 0.36,
        s * 0.8,
      ],
      c,
      '#fff',
      1.5,
    );
    line(g, [s * 0.18, s * 0.3, s * 0.3, s * 0.3], '#fff', 2);
    line(g, [s * 0.14, s * 0.44, s * 0.3, s * 0.44], '#fff', 2);
  },
  hourglass: (g, s, c) => {
    poly(g, [s * 0.3, s * 0.2, s * 0.7, s * 0.2, s * 0.5, s / 2], c, '#fff', 1.5);
    poly(g, [s * 0.3, s * 0.8, s * 0.7, s * 0.8, s * 0.5, s / 2], c, '#fff', 1.5);
  },
  multi: (g, s, c) => {
    for (const dy of [-0.18, 0, 0.18]) {
      line(g, [s * 0.2, s * (0.5 + dy), s * 0.7, s * (0.5 + dy)], '#fff', 2);
      poly(g, [s * 0.84, s * (0.5 + dy), s * 0.68, s * (0.42 + dy), s * 0.68, s * (0.58 + dy)], c);
    }
  },
  burst: (g, s, c) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(
        g,
        [
          s / 2 + Math.cos(a) * s * 0.12,
          s / 2 + Math.sin(a) * s * 0.12,
          s / 2 + Math.cos(a) * s * 0.34,
          s / 2 + Math.sin(a) * s * 0.34,
        ],
        c,
        3,
      );
    }
  },
  heart: (g, s, c) => {
    g.beginPath();
    g.moveTo(s / 2, s * 0.8);
    g.bezierCurveTo(s * 0.1, s * 0.5, s * 0.25, s * 0.18, s / 2, s * 0.36);
    g.bezierCurveTo(s * 0.75, s * 0.18, s * 0.9, s * 0.5, s / 2, s * 0.8);
    g.fillStyle = c;
    g.fill();
  },
  magnet: (g, s, c) => {
    g.beginPath();
    g.arc(s / 2, s * 0.44, s * 0.22, Math.PI, 0);
    g.strokeStyle = c;
    g.lineWidth = 6;
    g.stroke();
    line(g, [s * 0.28, s * 0.44, s * 0.28, s * 0.74], c, 6);
    line(g, [s * 0.72, s * 0.44, s * 0.72, s * 0.74], c, 6);
    line(g, [s * 0.25, s * 0.74, s * 0.31, s * 0.74], '#fff', 4);
    line(g, [s * 0.69, s * 0.74, s * 0.75, s * 0.74], '#fff', 4);
  },
  owl: (g, s, c) => {
    ellipse(g, s / 2, s * 0.54, s * 0.24, s * 0.28, c, '#fff');
    circle(g, s * 0.4, s * 0.46, s * 0.08, '#fff');
    circle(g, s * 0.6, s * 0.46, s * 0.08, '#fff');
    circle(g, s * 0.4, s * 0.46, s * 0.035, '#111');
    circle(g, s * 0.6, s * 0.46, s * 0.035, '#111');
  },
  crosshair: (g, s, c) => {
    circle(g, s / 2, s / 2, s * 0.26, 'rgba(0,0,0,0)', c, 3);
    line(g, [s / 2, s * 0.14, s / 2, s * 0.86], c, 2);
    line(g, [s * 0.14, s / 2, s * 0.86, s / 2], c, 2);
  },
  fork: (g, s, c) => {
    line(g, [s * 0.2, s * 0.8, s * 0.5, s / 2, s * 0.4, s * 0.36, s * 0.8, s * 0.2], c, 3);
    line(g, [s * 0.5, s / 2, s * 0.82, s * 0.6], c, 3);
  },
  flame: (g, s, c) => {
    g.beginPath();
    g.moveTo(s / 2, s * 0.14);
    g.bezierCurveTo(s * 0.86, s * 0.5, s * 0.74, s * 0.86, s / 2, s * 0.86);
    g.bezierCurveTo(s * 0.26, s * 0.86, s * 0.14, s * 0.56, s * 0.4, s * 0.36);
    g.bezierCurveTo(s * 0.42, s * 0.5, s * 0.5, s * 0.5, s / 2, s * 0.14);
    g.fillStyle = c;
    g.fill();
    circle(g, s / 2, s * 0.68, s * 0.1, '#ffe0a0');
  },
  skull: (g, s, c) => {
    circle(g, s / 2, s * 0.44, s * 0.24, c, '#fff', 1.5);
    poly(g, [s * 0.38, s * 0.62, s * 0.62, s * 0.62, s * 0.58, s * 0.8, s * 0.42, s * 0.8], c);
    circle(g, s * 0.41, s * 0.44, s * 0.06, '#111');
    circle(g, s * 0.59, s * 0.44, s * 0.06, '#111');
  },
  coin: (g, s, c) => {
    circle(g, s / 2, s / 2, s * 0.28, c, '#a07800', 2);
    circle(g, s / 2, s / 2, s * 0.14, '#ffe680');
  },
  potion: (g, s, c) => {
    poly(
      g,
      [
        s * 0.42,
        s * 0.18,
        s * 0.58,
        s * 0.18,
        s * 0.58,
        s * 0.36,
        s * 0.76,
        s * 0.6,
        s * 0.66,
        s * 0.84,
        s * 0.34,
        s * 0.84,
        s * 0.24,
        s * 0.6,
        s * 0.42,
        s * 0.36,
      ],
      c,
      '#fff',
      1.5,
    );
  },
};

/** icon key → [symbol, frame shape]. The colour comes from the content definition (or a default). */
const ICONS: Record<string, [string, 'square' | 'round' | 'diamond' | 'hex', number]> = {
  thunder_spear: ['spear', 'square', 0xfff27a],
  divine_bow: ['bow', 'square', 0xffe9b0],
  trident: ['trident', 'square', 0x6fd3ff],
  lightning_orb: ['orb', 'square', 0x8fe8ff],
  war_hammer: ['hammer', 'square', 0xd9b27c],
  flaming_sword: ['sword', 'square', 0xff7a2e],
  thunderbolt: ['bolt', 'square', 0xc9f0ff],
  soul_scythe: ['scythe', 'square', 0xb68cff],
  wrath_of_olympus: ['storm', 'round', 0xfff6a8],
  aegis_of_olympus: ['shield', 'square', 0xe8d38a],
  underworld_armour: ['shield', 'square', 0x7d5ca8],
  triton_shell: ['shell', 'square', 0x5fc6c0],
  valkyrie_plate: ['wing', 'square', 0xc8d6e5],
  zeus_eye: ['eye', 'round', 0xfff27a],
  soul_lantern: ['lantern', 'round', 0x9be8c0],
  golden_fleece: ['fleece', 'round', 0xffcf40],
  trident_fragment: ['trident', 'round', 0x6fd3ff],
  phoenix_feather: ['feather', 'round', 0xff8a3d],
  eye_of_horus: ['horus', 'round', 0x4fb3e8],
  skill_might: ['fist', 'diamond', 0xff6b6b],
  skill_swiftness: ['boot', 'diamond', 0x7ee0a1],
  skill_haste: ['hourglass', 'diamond', 0x7fc8ff],
  skill_multishot: ['multi', 'diamond', 0xffd36b],
  skill_reach: ['burst', 'diamond', 0xc59bff],
  skill_vitality: ['heart', 'diamond', 0xff8fa3],
  skill_bulwark: ['shield', 'diamond', 0xb8c4d0],
  skill_magnetism: ['magnet', 'diamond', 0x8fe8ff],
  skill_wisdom: ['owl', 'diamond', 0x9ad0ff],
  skill_precision: ['crosshair', 'diamond', 0xffe066],
  skill_persistence: ['hourglass', 'diamond', 0xa8e6cf],
  skill_storm: ['bolt', 'diamond', 0xfff27a],
  skill_fork: ['fork', 'diamond', 0xc9f0ff],
  skill_fire: ['flame', 'diamond', 0xff7a2e],
  skill_strength: ['fist', 'diamond', 0xd9b27c],
  skill_shadow: ['skull', 'diamond', 0xb68cff],
  synergy_storm: ['storm', 'hex', 0xfff27a],
  synergy_tempest: ['trident', 'hex', 0x6fd3ff],
  synergy_inferno: ['flame', 'hex', 0xff7a2e],
  synergy_reaper: ['scythe', 'hex', 0xb68cff],
  synergy_bulwark: ['shield', 'hex', 0xe8d38a],
  synergy_sky: ['bolt', 'hex', 0xc9f0ff],
  synergy_earth: ['hammer', 'hex', 0xd9b27c],
  ambrosia: ['potion', 'round', 0xff7a9a],
  icon_gold: ['coin', 'round', 0xffd34d],
};

function frame(
  g: Ctx,
  s: number,
  shape: 'square' | 'round' | 'diamond' | 'hex',
  color: number,
): void {
  const fill = 'rgba(20,18,30,0.92)';
  const stroke = hex(color, 0.95);
  const m = s * 0.06;
  if (shape === 'round') circle(g, s / 2, s / 2, s / 2 - m, fill, stroke, 2.5);
  else if (shape === 'diamond')
    poly(g, [s / 2, m, s - m, s / 2, s / 2, s - m, m, s / 2], fill, stroke, 2.5);
  else if (shape === 'hex') {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++)
      pts.push(
        s / 2 + Math.cos((i / 6) * Math.PI * 2) * (s / 2 - m),
        s / 2 + Math.sin((i / 6) * Math.PI * 2) * (s / 2 - m),
      );
    poly(g, pts, fill, stroke, 2.5);
  } else {
    g.beginPath();
    g.roundRect(m, m, s - 2 * m, s - 2 * m, s * 0.16);
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = stroke;
    g.stroke();
  }
}

const icons: Record<string, SpriteSpec> = Object.fromEntries(
  Object.entries(ICONS).map(([key, [symbol, shape, color]]) => [
    key,
    {
      size: 48,
      paint(g: Ctx, s: number) {
        frame(g, s, shape, color);
        const inner = s * 0.72;
        g.save();
        g.translate((s - inner) / 2, (s - inner) / 2);
        symbols[symbol](g, inner, hex(color));
        g.restore();
      },
    },
  ]),
);

export const SPRITES: Readonly<Record<string, SpriteSpec>> = {
  ...characters,
  ...projectiles,
  ...world,
  ...icons,
};

/** Draws a sprite into a new canvas; unknown keys get a plain disc in `fallbackColor`. */
export function paintSprite(
  key: string,
  fallbackColor = 0xcccccc,
  size?: number,
): HTMLCanvasElement {
  const spec = SPRITES[key];
  const s = size ?? spec?.size ?? 32;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  if (spec) {
    g.save();
    g.scale(s / spec.size, s / spec.size);
    spec.paint(g, spec.size);
    g.restore();
  } else {
    circle(g, s / 2, s / 2, s * 0.4, hex(fallbackColor), 'rgba(0,0,0,0.5)');
  }
  return canvas;
}

const dataUrls = new Map<string, string>();

/** A sprite as a PNG data URL, cached; for Angular icons. Returns '' where canvas is unavailable (jsdom tests). */
export function spriteDataUrl(key: string, size = 48): string {
  if (typeof navigator === 'undefined' || navigator.userAgent.includes('jsdom')) return '';
  const cacheKey = `${key}@${size}`;
  let url = dataUrls.get(cacheKey);
  if (url === undefined) {
    try {
      url = paintSprite(key, 0xcccccc, size).toDataURL();
    } catch {
      url = '';
    }
    dataUrls.set(cacheKey, url);
  }
  return url;
}
