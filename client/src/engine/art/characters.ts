import {
  bolt,
  circle,
  eyes,
  footShadow,
  glow,
  line,
  poly,
  sheen,
  slab,
  SpriteSpec,
  volume,
} from './canvas';

/**
 * Characters (D9, docs/art-direction.md): seen from above at a 3/4 tilt, facing right, lit from the upper left.
 * Heroes are warm and bright; the corrupted are dark, cold-rimmed and marked by a sickly glow.
 *
 * With the rendered sheets installed (content/assets.ts, art/blender/) these are only fallbacks for a sheet that
 * fails to load (spec: asset-pipeline). The `minotaur` falls back to the vertical slice's bronze bull.
 */

const CORRUPTION = 0x9cff6a;
const EMBER = 0xff5a22;

export const CHARACTERS: Record<string, SpriteSpec> = {
  zeus: {
    size: 56,
    paint(g, s) {
      glow(g, s / 2, s * 0.55, s * 0.5, 0xbfd8ff, 0.32);
      footShadow(g, s, 0.3, 0.86);
      // A storm-blue cape flowing behind, then the robe and gold belt.
      g.beginPath();
      g.moveTo(s * 0.34, s * 0.42);
      g.quadraticCurveTo(s * 0.12, s * 0.62, s * 0.18, s * 0.9);
      g.quadraticCurveTo(s * 0.34, s * 0.82, s * 0.5, s * 0.9);
      g.quadraticCurveTo(s * 0.66, s * 0.82, s * 0.8, s * 0.88);
      g.quadraticCurveTo(s * 0.84, s * 0.6, s * 0.66, s * 0.42);
      g.closePath();
      const cape = g.createLinearGradient(s * 0.2, s * 0.4, s * 0.8, s * 0.9);
      cape.addColorStop(0, '#4a5a82');
      cape.addColorStop(1, '#1a2034');
      g.fillStyle = cape;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(8,6,10,0.85)';
      g.stroke();
      volume(g, s / 2, s * 0.62, s * 0.22, s * 0.24, 0xe6e0d0);
      line(g, [s * 0.31, s * 0.6, s * 0.69, s * 0.52], '#c99a2e', 3);
      sheen(g, [s * 0.34, s * 0.58, s * 0.5, s * 0.55], 0.6, 1);
      // Head, silver hair and beard, gold laurel.
      volume(g, s / 2, s * 0.33, s * 0.13, s * 0.13, 0xc9a07e, { rim: 0.35 });
      volume(g, s / 2, s * 0.44, s * 0.11, s * 0.09, 0xe4e1da, { outline: 1.2, rim: 0 });
      line(g, [s * 0.36, s * 0.27, s * 0.5, s * 0.2, s * 0.64, s * 0.27], '#d9ae3c', 2.5);
      circle(g, s * 0.55, s * 0.32, s * 0.018, '#2a2a3a');
      // The thunderbolt in his raised hand.
      glow(g, s * 0.8, s * 0.42, s * 0.22, 0xbfe6ff, 0.8);
      bolt(g, s * 0.8, s * 0.22, s * 0.42, '#eaf6ff', '#ffffff');
    },
  },

  hades: {
    size: 56,
    paint(g, s) {
      glow(g, s / 2, s * 0.55, s * 0.5, 0x7fe0c8, 0.22);
      footShadow(g, s, 0.3, 0.86);
      // A black cloak, dark iron armour and a crimson sash.
      g.beginPath();
      g.moveTo(s * 0.32, s * 0.4);
      g.quadraticCurveTo(s * 0.1, s * 0.64, s * 0.16, s * 0.9);
      g.quadraticCurveTo(s * 0.5, s * 0.82, s * 0.82, s * 0.9);
      g.quadraticCurveTo(s * 0.86, s * 0.6, s * 0.68, s * 0.4);
      g.closePath();
      g.fillStyle = '#16121c';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(8,6,10,0.85)';
      g.stroke();
      volume(g, s / 2, s * 0.62, s * 0.22, s * 0.24, 0x2b2733);
      line(g, [s * 0.31, s * 0.58, s * 0.69, s * 0.66], '#7a1f24', 3);
      // Pale face, black hair and beard, an iron crown lit by soul-fire.
      volume(g, s / 2, s * 0.33, s * 0.13, s * 0.13, 0xb8aaa0, { rim: 0.35 });
      volume(g, s / 2, s * 0.44, s * 0.11, s * 0.09, 0x1a1720, { outline: 1.2, rim: 0 });
      poly(
        g,
        [
          s * 0.38,
          s * 0.24,
          s * 0.42,
          s * 0.12,
          s * 0.46,
          s * 0.22,
          s * 0.5,
          s * 0.1,
          s * 0.54,
          s * 0.22,
          s * 0.58,
          s * 0.12,
          s * 0.62,
          s * 0.24,
        ],
        '#3a3640',
      );
      circle(g, s * 0.5, s * 0.2, s * 0.022, '#9ff5e0');
      circle(g, s * 0.55, s * 0.32, s * 0.018, '#9ff5e0');
      // The bident.
      line(g, [s * 0.74, s * 0.9, s * 0.84, s * 0.18], '#3a3640', 3);
      line(g, [s * 0.8, s * 0.24, s * 0.78, s * 0.08], '#9ff5e0', 2);
      line(g, [s * 0.88, s * 0.26, s * 0.9, s * 0.1], '#9ff5e0', 2);
    },
  },

  poseidon: {
    size: 56,
    paint(g, s) {
      glow(g, s / 2, s * 0.55, s * 0.5, 0x5fc6c0, 0.28);
      footShadow(g, s, 0.3, 0.86);
      // A sea-green chiton with a gold belt.
      volume(g, s / 2, s * 0.62, s * 0.22, s * 0.24, 0x2e7470);
      line(g, [s * 0.31, s * 0.6, s * 0.69, s * 0.54], '#d9ae3c', 3);
      // Sun-dark face, dark sea-green hair and beard, a gold crown.
      volume(g, s / 2, s * 0.33, s * 0.13, s * 0.13, 0x9e7050, { rim: 0.35 });
      volume(g, s / 2, s * 0.44, s * 0.11, s * 0.1, 0x123a3c, { outline: 1.2, rim: 0 });
      poly(
        g,
        [
          s * 0.38,
          s * 0.24,
          s * 0.42,
          s * 0.14,
          s * 0.46,
          s * 0.22,
          s * 0.5,
          s * 0.12,
          s * 0.54,
          s * 0.22,
          s * 0.58,
          s * 0.14,
          s * 0.62,
          s * 0.24,
        ],
        '#d9ae3c',
      );
      // The golden trident.
      line(g, [s * 0.74, s * 0.9, s * 0.84, s * 0.2], '#d9ae3c', 3);
      line(g, [s * 0.76, s * 0.24, s * 0.92, s * 0.26], '#d9ae3c', 2);
      line(g, [s * 0.76, s * 0.24, s * 0.74, s * 0.08], '#f2d47a', 2);
      line(g, [s * 0.84, s * 0.25, s * 0.84, s * 0.06], '#f2d47a', 2);
      line(g, [s * 0.92, s * 0.26, s * 0.94, s * 0.1], '#f2d47a', 2);
      circle(g, s * 0.84, s * 0.2, s * 0.02, '#bff7f0');
    },
  },

  athena: {
    size: 56,
    paint(g, s) {
      glow(g, s / 2, s * 0.55, s * 0.5, 0xe8c070, 0.26);
      footShadow(g, s, 0.3, 0.86);
      // Bronze cuirass over a deep-blue skirt; the round Aegis on her arm.
      volume(g, s / 2, s * 0.64, s * 0.2, s * 0.22, 0x23345e);
      volume(g, s / 2, s * 0.54, s * 0.18, s * 0.14, 0xc8964a);
      circle(g, s * 0.3, s * 0.6, s * 0.14, '#d9ae3c', '#7a5a20', 2);
      // Face under a gold crested helmet.
      volume(g, s / 2, s * 0.34, s * 0.12, s * 0.12, 0xbf9070, { rim: 0.35 });
      volume(g, s / 2, s * 0.27, s * 0.13, s * 0.09, 0xd9ae3c, { outline: 1.2, rim: 0.3 });
      poly(
        g,
        [s * 0.36, s * 0.22, s * 0.5, s * 0.06, s * 0.66, s * 0.22, s * 0.5, s * 0.18],
        '#8e1c1c',
      );
      // The spear.
      line(g, [s * 0.74, s * 0.9, s * 0.84, s * 0.14], '#6b4a2a', 3);
      poly(g, [s * 0.85, s * 0.04, s * 0.81, s * 0.16, s * 0.88, s * 0.17], '#f2d38a');
    },
  },

  satyr: {
    size: 44,
    paint(g, s) {
      footShadow(g, s);
      line(g, [s * 0.42, s * 0.74, s * 0.38, s * 0.9], '#1e130c', 5);
      line(g, [s * 0.58, s * 0.74, s * 0.62, s * 0.9], '#1e130c', 5);
      volume(g, s / 2, s * 0.6, s * 0.22, s * 0.2, 0x5a3a26);
      volume(g, s / 2, s * 0.37, s * 0.14, s * 0.13, 0x7e5a44);
      line(g, [s * 0.4, s * 0.28, s * 0.28, s * 0.14, s * 0.36, s * 0.06], '#cdbf9e', 3.5);
      line(g, [s * 0.6, s * 0.28, s * 0.72, s * 0.14, s * 0.64, s * 0.06], '#cdbf9e', 3.5);
      eyes(g, s / 2, s * 0.36, s * 0.12, s * 0.025, EMBER);
      // A crude club.
      line(g, [s * 0.68, s * 0.7, s * 0.86, s * 0.4], '#3a2416', 4);
    },
  },

  harpy: {
    size: 44,
    paint(g, s) {
      footShadow(g, s, 0.24, 0.88);
      for (const side of [-1, 1]) {
        const x0 = s / 2;
        slab(
          g,
          [
            x0,
            s * 0.48,
            x0 + side * s * 0.46,
            s * 0.22,
            x0 + side * s * 0.4,
            s * 0.42,
            x0 + side * s * 0.33,
            s * 0.62,
          ],
          0x2e2238,
        );
        for (let i = 0; i < 3; i++)
          line(
            g,
            [
              x0 + side * s * (0.2 + i * 0.08),
              s * (0.36 - i * 0.03),
              x0 + side * s * (0.24 + i * 0.08),
              s * (0.52 - i * 0.03),
            ],
            'rgba(150,120,170,0.35)',
            1,
          );
      }
      volume(g, s / 2, s * 0.56, s * 0.12, s * 0.18, 0x5c4466);
      volume(g, s / 2, s * 0.34, s * 0.1, s * 0.1, 0xb8a6b4, { rim: 0.3 });
      line(g, [s * 0.42, s * 0.28, s * 0.36, s * 0.4], '#1c1420', 2.5);
      eyes(g, s / 2, s * 0.34, s * 0.08, s * 0.02, 0xff3355);
    },
  },

  stymphalian_bird: {
    size: 28,
    paint(g, s) {
      footShadow(g, s, 0.2, 0.88);
      for (const side of [-1, 1]) {
        slab(
          g,
          [s / 2, s * 0.56, s / 2 + side * s * 0.47, s * 0.2, s / 2 + side * s * 0.22, s * 0.64],
          0x2a2d33,
          { outline: 1.2 },
        );
        line(
          g,
          [s / 2 + side * s * 0.12, s * 0.5, s / 2 + side * s * 0.43, s * 0.24],
          'rgba(184,124,60,0.8)',
          1,
        );
      }
      volume(g, s / 2, s * 0.56, s * 0.11, s * 0.15, 0x3a3e46, { outline: 1.2, rim: 0.3 });
      poly(
        g,
        [s * 0.6, s * 0.5, s * 0.84, s * 0.56, s * 0.6, s * 0.62],
        '#b07a3a',
        'rgba(8,6,10,0.8)',
        1,
      );
      circle(g, s * 0.56, s * 0.52, s * 0.035, '#ff4a2a');
    },
  },

  corrupted_hoplite: {
    size: 48,
    paint(g, s) {
      footShadow(g, s);
      // Spear behind.
      line(g, [s * 0.18, s * 0.88, s * 0.34, s * 0.12], '#4a3a2a', 3);
      poly(
        g,
        [s * 0.34, s * 0.04, s * 0.31, s * 0.15, s * 0.37, s * 0.15],
        '#8a8578',
        'rgba(8,6,10,0.8)',
        1,
      );
      volume(g, s / 2, s * 0.6, s * 0.21, s * 0.21, 0x4a1414);
      slab(
        g,
        [s * 0.34, s * 0.48, s * 0.62, s * 0.48, s * 0.6, s * 0.7, s * 0.36, s * 0.7],
        0x6a4a26,
      );
      // Crested helmet, empty visor glowing with corruption.
      poly(
        g,
        [s * 0.34, s * 0.22, s * 0.5, s * 0.04, s * 0.62, s * 0.22, s * 0.5, s * 0.16],
        '#6a1010',
        'rgba(8,6,10,0.85)',
        1.5,
      );
      volume(g, s / 2, s * 0.33, s * 0.14, s * 0.14, 0x7a5a2a, { contrast: 1.3 });
      poly(
        g,
        [s * 0.44, s * 0.31, s * 0.62, s * 0.31, s * 0.6, s * 0.36, s * 0.46, s * 0.36],
        '#120c08',
      );
      eyes(g, s * 0.53, s * 0.335, s * 0.08, s * 0.018, CORRUPTION);
      // Round bronze shield with a dark emblem.
      volume(g, s * 0.64, s * 0.62, s * 0.2, s * 0.2, 0x8a6430, { contrast: 1.4 });
      circle(g, s * 0.64, s * 0.62, s * 0.09, '#3a0e0e', 'rgba(8,6,10,0.7)', 1.5);
      sheen(g, [s * 0.52, s * 0.52, s * 0.6, s * 0.46], 0.5, 1.5);
    },
  },

  centaur_archer: {
    size: 52,
    paint(g, s) {
      footShadow(g, s, 0.38, 0.86);
      for (const x of [0.22, 0.34, 0.56, 0.66])
        line(g, [s * x, s * 0.68, s * (x - 0.01), s * 0.86], '#1f160e', 4);
      volume(g, s * 0.44, s * 0.62, s * 0.28, s * 0.14, 0x4a3828);
      line(g, [s * 0.16, s * 0.6, s * 0.08, s * 0.72], '#2a1e14', 3);
      slab(
        g,
        [s * 0.56, s * 0.3, s * 0.76, s * 0.3, s * 0.78, s * 0.6, s * 0.56, s * 0.6],
        0x2e3a24,
      );
      volume(g, s * 0.66, s * 0.4, s * 0.08, s * 0.12, 0x8a6a52, { rim: 0.3 });
      volume(g, s * 0.66, s * 0.22, s * 0.08, s * 0.08, 0x8a6a52);
      poly(
        g,
        [s * 0.57, s * 0.2, s * 0.66, s * 0.1, s * 0.75, s * 0.2, s * 0.66, s * 0.17],
        '#1e2618',
      );
      circle(g, s * 0.69, s * 0.22, s * 0.015, '#ff6a3a');
      g.beginPath();
      g.arc(s * 0.8, s * 0.38, s * 0.18, -1.15, 1.15);
      g.strokeStyle = '#5a3a1e';
      g.lineWidth = 3;
      g.stroke();
      line(g, [s * 0.86, s * 0.22, s * 0.86, s * 0.54], 'rgba(220,210,190,0.6)', 1);
    },
  },

  minotaur: {
    size: 60,
    paint(g, s) {
      footShadow(g, s, 0.38, 0.86);
      for (const x of [0.28, 0.4, 0.56, 0.66])
        line(g, [s * x, s * 0.7, s * x, s * 0.88], '#2a1a0c', 5);
      volume(g, s * 0.46, s * 0.58, s * 0.3, s * 0.19, 0x7a4c22, { contrast: 1.5 });
      // Glowing seams of the furnace inside.
      line(
        g,
        [s * 0.3, s * 0.52, s * 0.42, s * 0.6, s * 0.5, s * 0.54],
        'rgba(255,120,30,0.85)',
        1.5,
      );
      line(g, [s * 0.36, s * 0.68, s * 0.48, s * 0.66], 'rgba(255,120,30,0.7)', 1.2);
      sheen(g, [s * 0.24, s * 0.48, s * 0.46, s * 0.42], 0.55, 2);
      volume(g, s * 0.75, s * 0.47, s * 0.14, s * 0.13, 0x8a5a2a, { contrast: 1.5 });
      line(g, [s * 0.7, s * 0.36, s * 0.64, s * 0.2, s * 0.73, s * 0.14], '#d8ccb0', 4);
      line(g, [s * 0.82, s * 0.37, s * 0.92, s * 0.22, s * 0.98, s * 0.23], '#d8ccb0', 4);
      glow(g, s * 0.87, s * 0.54, s * 0.12, EMBER, 0.9);
      eyes(g, s * 0.78, s * 0.45, s * 0.1, s * 0.022, 0xff8a2a);
    },
  },

  fallen_oracle: {
    size: 44,
    paint(g, s) {
      glow(g, s / 2, s / 2, s / 2, 0x6a3a8a, 0.3);
      footShadow(g, s);
      slab(g, [s * 0.5, s * 0.16, s * 0.8, s * 0.86, s * 0.2, s * 0.86], 0x2a1a33, {
        contrast: 1.2,
      });
      line(g, [s * 0.5, s * 0.36, s * 0.5, s * 0.84], 'rgba(160,110,200,0.35)', 1.5);
      volume(g, s / 2, s * 0.3, s * 0.13, s * 0.12, 0x1c1024, { rim: 0.35 });
      glow(g, s / 2, s * 0.31, s * 0.14, 0x7fffd4, 0.85);
      circle(g, s / 2, s * 0.31, s * 0.04, '#d8fff0');
      for (const [x, y] of [
        [0.2, 0.42],
        [0.82, 0.38],
        [0.28, 0.16],
      ]) {
        glow(g, s * x, s * y, s * 0.06, 0x7fffd4, 0.7);
      }
    },
  },

  marble_sentinel: {
    size: 68,
    paint(g, s) {
      footShadow(g, s, 0.36, 0.88);
      slab(
        g,
        [s * 0.22, s * 0.3, s * 0.78, s * 0.3, s * 0.84, s * 0.84, s * 0.16, s * 0.84],
        0x8e8c86,
        { outline: 3, contrast: 1.2 },
      );
      slab(
        g,
        [s * 0.32, s * 0.08, s * 0.68, s * 0.08, s * 0.72, s * 0.32, s * 0.28, s * 0.32],
        0xa09e96,
        { outline: 2.5 },
      );
      // Cracks leaking corruption.
      for (const crack of [
        [0.38, 0.4, 0.47, 0.55, 0.41, 0.72],
        [0.66, 0.46, 0.58, 0.6, 0.62, 0.78],
        [0.4, 0.14, 0.46, 0.24],
      ]) {
        line(
          g,
          crack.map((v) => v * s),
          'rgba(20,24,18,0.9)',
          2.5,
        );
        line(
          g,
          crack.map((v) => v * s),
          'rgba(156,255,106,0.55)',
          1,
        );
      }
      eyes(g, s / 2, s * 0.2, s * 0.16, s * 0.025, CORRUPTION);
    },
  },

  cyclops: {
    size: 132,
    paint(g, s) {
      footShadow(g, s, 0.36, 0.9);
      line(g, [s * 0.38, s * 0.8, s * 0.36, s * 0.92], '#2a1a14', 12);
      line(g, [s * 0.62, s * 0.8, s * 0.64, s * 0.92], '#2a1a14', 12);
      volume(g, s / 2, s * 0.6, s * 0.3, s * 0.27, 0x5e463a, { contrast: 1.2 });
      volume(g, s / 2, s * 0.68, s * 0.17, s * 0.13, 0x76584a, { rim: 0 });
      slab(
        g,
        [s * 0.32, s * 0.72, s * 0.68, s * 0.72, s * 0.62, s * 0.84, s * 0.38, s * 0.84],
        0x3a2618,
      );
      // Scars and chains of the forge.
      line(g, [s * 0.36, s * 0.5, s * 0.46, s * 0.58], 'rgba(30,14,10,0.7)', 3);
      line(g, [s * 0.3, s * 0.56, s * 0.7, s * 0.5], 'rgba(120,110,100,0.8)', 3);
      // The head and its single burning eye.
      volume(g, s / 2, s * 0.3, s * 0.17, s * 0.17, 0x7a5e50, { contrast: 1.2 });
      circle(g, s / 2, s * 0.28, s * 0.085, '#e8e0d0', 'rgba(8,6,10,0.9)', 3);
      glow(g, s / 2, s * 0.28, s * 0.12, 0xff4a1a, 0.6);
      circle(g, s / 2, s * 0.28, s * 0.045, '#c8200e');
      circle(g, s / 2, s * 0.28, s * 0.018, '#120604');
      line(g, [s * 0.4, s * 0.19, s * 0.6, s * 0.21], 'rgba(20,10,8,0.9)', 4);
      // Club.
      line(g, [s * 0.84, s * 0.88, s * 0.9, s * 0.38], '#3e2a1c', 11);
      volume(g, s * 0.9, s * 0.35, s * 0.08, s * 0.09, 0x4a3426);
      for (const [x, y] of [
        [0.86, 0.3],
        [0.95, 0.36],
        [0.88, 0.42],
      ])
        circle(g, s * x, s * y, s * 0.012, '#9a948a');
    },
  },

  // Gods of the intro (never playable in this slice).
  ally_warrior: {
    size: 56,
    paint(g, s) {
      footShadow(g, s, 0.3, 0.86);
      line(g, [s * 0.76, s * 0.88, s * 0.82, s * 0.1], '#5a4a36', 3);
      poly(
        g,
        [s * 0.82, s * 0.02, s * 0.79, s * 0.14, s * 0.85, s * 0.14],
        '#c8c0b0',
        'rgba(8,6,10,0.8)',
        1,
      );
      slab(
        g,
        [s * 0.3, s * 0.42, s * 0.7, s * 0.42, s * 0.78, s * 0.86, s * 0.22, s * 0.86],
        0x7a1c1c,
      );
      volume(g, s / 2, s * 0.6, s * 0.2, s * 0.21, 0x8a6430, { contrast: 1.3 });
      volume(g, s / 2, s * 0.32, s * 0.13, s * 0.13, 0x9a7a3a, { contrast: 1.4 });
      poly(
        g,
        [s * 0.36, s * 0.22, s * 0.5, s * 0.06, s * 0.64, s * 0.22, s * 0.5, s * 0.17],
        '#b02020',
        'rgba(8,6,10,0.85)',
        1.5,
      );
      poly(
        g,
        [s * 0.46, s * 0.3, s * 0.62, s * 0.3, s * 0.6, s * 0.36, s * 0.48, s * 0.36],
        '#2a1a12',
      );
    },
  },
  ally_maiden: {
    size: 56,
    paint(g, s) {
      footShadow(g, s, 0.3, 0.86);
      slab(
        g,
        [s * 0.32, s * 0.42, s * 0.68, s * 0.42, s * 0.76, s * 0.88, s * 0.24, s * 0.88],
        0x3e5a7a,
      );
      volume(g, s / 2, s * 0.58, s * 0.18, s * 0.2, 0xb8c0c8, { contrast: 1.3 });
      volume(g, s / 2, s * 0.32, s * 0.12, s * 0.12, 0xc9a07e);
      poly(
        g,
        [s * 0.38, s * 0.3, s * 0.5, s * 0.12, s * 0.62, s * 0.3, s * 0.5, s * 0.24],
        '#c8ccd4',
        'rgba(8,6,10,0.85)',
        1.5,
      );
      volume(g, s * 0.28, s * 0.6, s * 0.16, s * 0.18, 0x9aa8b8, { contrast: 1.4 });
      circle(g, s * 0.28, s * 0.6, s * 0.05, '#2a3e5a');
      line(g, [s * 0.72, s * 0.86, s * 0.78, s * 0.14], '#5a4a36', 3);
    },
  },
  ally_smith: {
    size: 56,
    paint(g, s) {
      glow(g, s * 0.72, s * 0.5, s * 0.22, 0xff8a3d, 0.4);
      footShadow(g, s, 0.32, 0.86);
      volume(g, s / 2, s * 0.6, s * 0.24, s * 0.23, 0x5a3a24);
      slab(
        g,
        [s * 0.36, s * 0.5, s * 0.64, s * 0.5, s * 0.62, s * 0.8, s * 0.38, s * 0.8],
        0x3a2618,
      );
      volume(g, s / 2, s * 0.33, s * 0.14, s * 0.13, 0xa07858);
      volume(g, s / 2, s * 0.43, s * 0.12, s * 0.08, 0x2a1a12, { rim: 0 });
      line(g, [s * 0.62, s * 0.7, s * 0.8, s * 0.42], '#3e2a1c', 4);
      slab(
        g,
        [s * 0.72, s * 0.34, s * 0.92, s * 0.42, s * 0.88, s * 0.5, s * 0.68, s * 0.42],
        0x5a5650,
      );
      glow(g, s * 0.8, s * 0.42, s * 0.06, 0xff8a3d, 0.9);
    },
  },
};
