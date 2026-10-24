import { bolt, circle, Ctx, ellipse, glow, hex, line, poly, shade, SpriteSpec } from './canvas';
import { CHARACTERS } from './characters';
import { WORLD } from './world';

/**
 * Original placeholder art (D9), drawn with Canvas 2D at startup: no image files, no licences. Characters face
 * right and are drawn top-down with a slight 3/4 tilt; projectiles point right (the view rotates them).
 * Shared by the Phaser layer (textures) and Angular (HUD and menu icons via `spriteDataUrl`).
 * Characters live in `characters.ts`, world objects in `world.ts`, drawing helpers in `canvas.ts`.
 */

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
  proj_javelin: {
    size: 40,
    paint(g, s) {
      glow(g, s * 0.6, s / 2, s * 0.32, 0xe8c070, 0.35);
      line(g, [s * 0.04, s / 2, s * 0.78, s / 2], '#6b4a2a', 3);
      poly(g, [s * 0.98, s / 2, s * 0.74, s * 0.38, s * 0.74, s * 0.62], '#f2d38a', '#8a6a2a', 1);
    },
  },
  proj_wave: {
    size: 72,
    paint(g, s) {
      // A rolling crest of sea-water, foam on its leading edge (projectiles point right).
      glow(g, s * 0.55, s / 2, s * 0.45, 0x5fc6c0, 0.45);
      g.beginPath();
      g.moveTo(s * 0.62, s * 0.06);
      g.quadraticCurveTo(s * 1.0, s / 2, s * 0.62, s * 0.94);
      g.quadraticCurveTo(s * 0.74, s / 2, s * 0.62, s * 0.06);
      const water = g.createLinearGradient(s * 0.6, 0, s, 0);
      water.addColorStop(0, '#1f6f78');
      water.addColorStop(1, '#bff7f0');
      g.fillStyle = water;
      g.fill();
      g.beginPath();
      g.moveTo(s * 0.4, s * 0.12);
      g.quadraticCurveTo(s * 0.74, s / 2, s * 0.4, s * 0.88);
      g.strokeStyle = 'rgba(191, 247, 240, 0.55)';
      g.lineWidth = 3;
      g.stroke();
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
  // A lampad's soul-fire: violet flame with a hot white heart, never the blue of experience gems (D13).
  soul_fire: {
    size: 26,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x9a5cff, 0.65);
      poly(g, [s * 0.05, s / 2, s * 0.45, s * 0.3, s * 0.45, s * 0.7], 'rgba(170,110,255,0.7)');
      circle(g, s * 0.58, s / 2, s * 0.2, '#b98cff', 'rgba(255,90,140,0.9)', 1.5);
      circle(g, s * 0.62, s / 2, s * 0.09, '#f4ecff');
    },
  },
  // A naiad's venom: a sickly green-yellow glob with a dripping tail and a dark rim (not an XP gem's blue).
  venom_spit: {
    size: 24,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x9adf2a, 0.6);
      poly(g, [s * 0.05, s / 2, s * 0.45, s * 0.34, s * 0.45, s * 0.66], 'rgba(150,210,40,0.7)');
      circle(g, s * 0.6, s / 2, s * 0.2, '#b8e83a', 'rgba(40,60,10,0.95)', 1.5);
      circle(g, s * 0.66, s * 0.44, s * 0.07, '#f2ffb0');
    },
  },
  // A siren's song: rose rings rippling out from a hot core (clear of XP blue and venom green).
  siren_song: {
    size: 28,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xff5aa8, 0.55);
      for (const [r, a] of [
        [0.44, 0.45],
        [0.32, 0.7],
        [0.2, 0.95],
      ])
        circle(g, s / 2, s / 2, s * r, 'rgba(0,0,0,0)', `rgba(255,140,200,${a})`, 2);
      circle(g, s / 2, s / 2, s * 0.1, '#ffe0f0');
    },
  },
  // A snake priestess's curse: a gold serpent coiled in a ring of amber light (clear of XP blue and green).
  serpent_hex: {
    size: 26,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0xffa020, 0.6);
      circle(g, s / 2, s / 2, s * 0.3, 'rgba(60,30,0,0.55)', 'rgba(255,200,90,0.95)', 2);
      line(
        g,
        [s * 0.36, s * 0.66, s * 0.62, s * 0.56, s * 0.4, s * 0.44, s * 0.64, s * 0.34],
        '#ffd870',
        2.5,
      );
      circle(g, s * 0.66, s * 0.33, s * 0.06, '#fff2c0');
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
  bident: (g, s, c) => {
    line(g, [s * 0.3, s * 0.82, s * 0.62, s * 0.3], '#3a3340', 3);
    line(g, [s * 0.56, s * 0.28, s * 0.74, s * 0.38], c, 2.5);
    line(g, [s * 0.56, s * 0.28, s * 0.62, s * 0.12], c, 2.5);
    line(g, [s * 0.74, s * 0.38, s * 0.86, s * 0.24], c, 2.5);
  },
  gorgon: (g, s, c) => {
    // The Gorgon's head on the Aegis: a round face with snakes for hair.
    circle(g, s / 2, s * 0.54, s * 0.36, '#5a4a2a', c, 2);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + (i / 6) * 0.9);
      const [x, y] = [s / 2 + Math.cos(a) * s * 0.2, s * 0.5 + Math.sin(a) * s * 0.2];
      line(
        g,
        [x, y, x + Math.cos(a) * s * 0.12, y + Math.sin(a) * s * 0.12 - s * 0.03],
        '#8fbf5a',
        2,
      );
    }
    circle(g, s / 2, s * 0.56, s * 0.15, '#d9c9a0');
    circle(g, s * 0.45, s * 0.53, s * 0.025, '#2a1a10');
    circle(g, s * 0.55, s * 0.53, s * 0.025, '#2a1a10');
  },
  javelin: (g, s, c) => {
    line(g, [s * 0.22, s * 0.8, s * 0.7, s * 0.32], '#8a5a2b', 3);
    poly(g, [s * 0.84, s * 0.18, s * 0.64, s * 0.3, s * 0.72, s * 0.38], c, '#fff', 1);
  },
  wave: (g, s, c) => {
    g.beginPath();
    g.moveTo(s * 0.16, s * 0.7);
    g.quadraticCurveTo(s * 0.34, s * 0.3, s * 0.62, s * 0.34);
    g.quadraticCurveTo(s * 0.46, s * 0.46, s * 0.58, s * 0.6);
    g.quadraticCurveTo(s * 0.74, s * 0.66, s * 0.86, s * 0.56);
    g.lineTo(s * 0.86, s * 0.76);
    g.lineTo(s * 0.16, s * 0.76);
    g.closePath();
    g.fillStyle = c;
    g.fill();
    g.strokeStyle = '#e8fffb';
    g.lineWidth = 1.5;
    g.stroke();
  },
  gates: (g, s, c) => {
    glow(g, s / 2, s * 0.56, s * 0.34, 0x7fe0c8, 0.55);
    g.beginPath();
    g.moveTo(s * 0.26, s * 0.84);
    g.lineTo(s * 0.26, s * 0.42);
    g.arc(s / 2, s * 0.42, s * 0.24, Math.PI, 0);
    g.lineTo(s * 0.74, s * 0.84);
    g.fillStyle = '#0d0b12';
    g.fill();
    g.strokeStyle = c;
    g.lineWidth = 2.5;
    g.stroke();
    circle(g, s * 0.44, s * 0.52, s * 0.035, c);
    circle(g, s * 0.56, s * 0.52, s * 0.035, c);
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
  // Hermes's staff: two serpents winding round a winged rod (spec: run-progression / call_of_hermes).
  caduceus: (g, s, c) => {
    line(g, [s / 2, s * 0.2, s / 2, s * 0.86], '#fff', 3);
    poly(g, [s / 2, s * 0.24, s * 0.16, s * 0.14, s * 0.3, s * 0.3], c, '#fff', 1);
    poly(g, [s / 2, s * 0.24, s * 0.84, s * 0.14, s * 0.7, s * 0.3], c, '#fff', 1);
    circle(g, s / 2, s * 0.18, s * 0.06, c, '#fff', 1);
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const x = s / 2 + side * Math.sin(t * Math.PI * 3) * s * 0.16;
        const y = s * 0.34 + t * s * 0.48;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokeStyle = c;
      g.lineWidth = 3;
      g.stroke();
    }
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
  bident: ['bident', 'square', 0x7fe0c8],
  gates_of_tartarus: ['gates', 'round', 0x7fe0c8],
  tidal_wave: ['wave', 'round', 0x5fc6c0],
  spear_of_athena: ['javelin', 'square', 0xe8c070],
  gorgons_gaze: ['gorgon', 'round', 0xc9d68a],
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
  // Fusions (spec: run-progression / fusions): hexes like synergies, a symbol of what they fuse.
  fusion_volley: ['bow', 'hex', 0xffe9b0],
  fusion_forge: ['hammer', 'hex', 0xff9a4d],
  fusion_hide: ['shield', 'hex', 0xd8b48a],
  fusion_sandals: ['boot', 'hex', 0x7fe8d0],
  fusion_oracle: ['eye', 'hex', 0x9ad0ff],
  fusion_chronos: ['hourglass', 'hex', 0xa8e6cf],
  fusion_sky: ['bolt', 'hex', 0xfff27a],
  fusion_dead: ['skull', 'hex', 0xb68cff],
  fusion_deep: ['wave', 'hex', 0x5fc6c0],
  fusion_strategos: ['javelin', 'hex', 0xe8c070],
  fusion_twelve: ['storm', 'hex', 0xffd36b],
  fusion_ichor: ['heart', 'hex', 0xffc870],
  fusion_eyes: ['owl', 'hex', 0xc9f0ff],
  fusion_apotheosis: ['burst', 'hex', 0xfff6a8],
  // Ascensions (spec: run-progression / ascensions).
  ascend_might: ['fist', 'round', 0xff6b6b],
  ascend_vigour: ['heart', 'round', 0xff8fa3],
  ascend_celerity: ['hourglass', 'round', 0x7fc8ff],
  ascend_fortune: ['coin', 'round', 0xffd34d],
  ambrosia: ['potion', 'round', 0xff7a9a],
  // Instant blessings (spec: run-progression / instant blessings).
  blessing_hermes: ['caduceus', 'round', 0x7fe8d0],
  icon_gold: ['coin', 'round', 0xffd34d],
  // Achievements (spec: glory / achievements): gold hexes.
  ach_hourglass: ['hourglass', 'hex', 0xe8c46a],
  ach_skull: ['skull', 'hex', 0xe8c46a],
  ach_sword: ['sword', 'hex', 0xe8c46a],
  ach_scythe: ['scythe', 'hex', 0xe8c46a],
  ach_shield: ['shield', 'hex', 0xe8c46a],
  ach_owl: ['owl', 'hex', 0xe8c46a],
  // The merchant's wares and companions (spec: merchant).
  ware_eagle: ['wing', 'round', 0xffe066],
  ware_hound: ['flame', 'round', 0xff8a3d],
  ware_serpent: ['fork', 'round', 0x9be88a],
  ware_whetstone: ['sword', 'round', 0xc9d4e0],
  merchant: ['coin', 'hex', 0xffd27a],
  // Blessings of the Director's shrines (spec: director-of-chaos / divine blessings).
  boon_aegis: ['shield', 'round', 0xbfe0ff],
  boon_fury: ['fist', 'round', 0xff6b6b],
  boon_swiftness: ['boot', 'round', 0x7ee0a1],
  boon_radiance: ['owl', 'round', 0xffe066],
};

/**
 * Engraved icon frames: a dark stone face inside a forged iron rim with a thin line of the item's colour, like
 * gold leaf worn into metal (docs/art-direction.md).
 */
function frame(
  g: Ctx,
  s: number,
  shape: 'square' | 'round' | 'diamond' | 'hex',
  color: number,
): void {
  const m = s * 0.05;
  const outline = (inset: number) => {
    g.beginPath();
    const r = s / 2 - inset;
    if (shape === 'round') g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    else if (shape === 'diamond') {
      g.moveTo(s / 2, s / 2 - r);
      g.lineTo(s / 2 + r, s / 2);
      g.lineTo(s / 2, s / 2 + r);
      g.lineTo(s / 2 - r, s / 2);
      g.closePath();
    } else if (shape === 'hex') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) g.moveTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
        else g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      }
      g.closePath();
    } else g.roundRect(inset, inset, s - 2 * inset, s - 2 * inset, s * 0.1);
  };
  // Iron rim.
  outline(m);
  const iron = g.createLinearGradient(0, 0, s, s);
  iron.addColorStop(0, '#5a5650');
  iron.addColorStop(0.5, '#2a2724');
  iron.addColorStop(1, '#141210');
  g.fillStyle = iron;
  g.fill();
  g.lineWidth = Math.max(1.5, s * 0.04);
  g.strokeStyle = 'rgba(0,0,0,0.9)';
  g.stroke();
  // Stone face.
  outline(m + s * 0.07);
  const stone = g.createRadialGradient(s * 0.42, s * 0.38, s * 0.05, s / 2, s / 2, s * 0.55);
  stone.addColorStop(0, hex(shade(color, 0.32)));
  stone.addColorStop(1, '#0c0a0e');
  g.fillStyle = stone;
  g.fill();
  g.lineWidth = Math.max(1, s * 0.025);
  g.strokeStyle = hex(shade(color, 0.85), 0.9);
  g.stroke();
}

const icons: Record<string, SpriteSpec> = Object.fromEntries(
  Object.entries(ICONS).map(([key, [symbol, shape, color]]) => [
    key,
    {
      size: 48,
      paint(g: Ctx, s: number) {
        frame(g, s, shape, color);
        // The symbol is drawn apart, then given a worn-metal finish: desaturated, lit from above.
        const inner = s * 0.72;
        // Match the target's scale so the symbol stays sharp at any icon size.
        const k = g.getTransform().a || 1;
        const layer = document.createElement('canvas');
        layer.width = layer.height = Math.ceil(inner * k);
        const lg = layer.getContext('2d') as Ctx;
        lg.scale(k, k);
        symbols[symbol](lg, inner, hex(color));
        lg.globalCompositeOperation = 'source-atop';
        const finish = lg.createLinearGradient(0, 0, 0, inner);
        finish.addColorStop(0, 'rgba(255,250,235,0.28)');
        finish.addColorStop(0.5, 'rgba(0,0,0,0)');
        finish.addColorStop(1, 'rgba(0,0,0,0.42)');
        lg.fillStyle = finish;
        lg.fillRect(0, 0, inner, inner);
        lg.setTransform(1, 0, 0, 1, 0, 0);
        g.save();
        g.filter = 'saturate(0.62) drop-shadow(0 1px 1px rgba(0,0,0,0.9))';
        g.drawImage(layer, (s - inner) / 2, (s - inner) / 2, inner, inner);
        g.restore();
      },
    },
  ]),
);

export const SPRITES: Readonly<Record<string, SpriteSpec>> = {
  ...CHARACTERS,
  ...projectiles,
  ...WORLD,
  ...icons,
};

/** Draws a sprite into a new canvas; unknown keys get a plain disc in `fallbackColor`. */
/** Every code-drawn sprite key (for the development art gallery). */
export function spriteKeys(): string[] {
  return Object.keys(SPRITES);
}

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
