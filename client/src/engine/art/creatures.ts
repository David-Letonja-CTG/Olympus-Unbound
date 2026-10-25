import { circle, ellipse, hex, line, poly, shade, SpriteSpec, volume } from './canvas';

/**
 * Small creatures of the realms' ambient life (spec: visual-atmosphere / ambient life), seen from above and facing
 * right: the view flips them, beats their wings by scaling and fades them as they flee.
 */

/** A bird with its wings spread: `body` and `wing` colours, `beak`. */
function bird(body: number, wing: number, beak: string): SpriteSpec {
  return {
    size: 52,
    paint(g, s) {
      ellipse(g, s * 0.52, s * 0.62, s * 0.2, s * 0.08, 'rgba(0,0,0,0.3)');
      for (const dir of [-1, 1])
        poly(
          g,
          [
            s * 0.42,
            s * 0.5,
            s * 0.5,
            s * (0.5 + dir * 0.4),
            s * 0.62,
            s * (0.5 + dir * 0.36),
            s * 0.58,
            s * 0.5,
          ],
          hex(wing),
          'rgba(8,6,10,0.85)',
        );
      volume(g, s * 0.52, s * 0.5, s * 0.17, s * 0.07, body, { outline: 1.2 });
      circle(g, s * 0.7, s * 0.5, s * 0.06, hex(shade(body, 1.05)), 'rgba(8,6,10,0.85)');
      poly(g, [s * 0.75, s * 0.48, s * 0.84, s * 0.5, s * 0.75, s * 0.52], beak);
      poly(
        g,
        [s * 0.36, s * 0.47, s * 0.26, s * 0.44, s * 0.28, s * 0.56, s * 0.36, s * 0.53],
        hex(shade(wing, 0.8)),
      );
    },
  };
}

/** A bat: leathery scalloped wings, a small furred body. */
const bat: SpriteSpec = {
  size: 52,
  paint(g, s) {
    for (const dir of [-1, 1])
      poly(
        g,
        [
          s * 0.5,
          s * 0.46,
          s * (0.5 + dir * 0.42),
          s * 0.34,
          s * (0.5 + dir * 0.38),
          s * 0.5,
          s * (0.5 + dir * 0.28),
          s * 0.46,
          s * (0.5 + dir * 0.22),
          s * 0.58,
          s * 0.5,
          s * 0.56,
        ],
        '#2a2230',
        'rgba(8,6,10,0.9)',
      );
    volume(g, s / 2, s * 0.5, s * 0.08, s * 0.1, 0x3a3040, { outline: 1 });
    circle(g, s * 0.47, s * 0.44, s * 0.015, '#ff6a6a');
    circle(g, s * 0.53, s * 0.44, s * 0.015, '#ff6a6a');
  },
};

/** A marsh frog, crouched. */
const frog: SpriteSpec = {
  size: 40,
  paint(g, s) {
    ellipse(g, s * 0.54, s * 0.62, s * 0.26, s * 0.12, 'rgba(0,0,0,0.3)');
    for (const dir of [-1, 1])
      line(g, [s * 0.4, s * (0.5 + dir * 0.1), s * 0.26, s * (0.5 + dir * 0.28)], '#3e6a2e', 3);
    volume(g, s * 0.52, s * 0.5, s * 0.22, s * 0.17, 0x5a8a3a, { outline: 1.2 });
    circle(g, s * 0.66, s * 0.4, s * 0.06, '#c8d86a', 'rgba(8,6,10,0.85)');
    circle(g, s * 0.66, s * 0.6, s * 0.06, '#c8d86a', 'rgba(8,6,10,0.85)');
  },
};

/** A rat with a long tail. */
const rat: SpriteSpec = {
  size: 44,
  paint(g, s) {
    ellipse(g, s * 0.52, s * 0.6, s * 0.26, s * 0.08, 'rgba(0,0,0,0.3)');
    line(g, [s * 0.32, s * 0.5, s * 0.18, s * 0.46, s * 0.06, s * 0.54], '#8a6a62', 1.5);
    volume(g, s * 0.5, s * 0.5, s * 0.18, s * 0.1, 0x5a4a44, { outline: 1.2 });
    poly(
      g,
      [s * 0.66, s * 0.44, s * 0.82, s * 0.5, s * 0.66, s * 0.56],
      '#6a5a52',
      'rgba(8,6,10,0.85)',
    );
    circle(g, s * 0.62, s * 0.42, s * 0.04, '#8a6a62');
    circle(g, s * 0.62, s * 0.58, s * 0.04, '#8a6a62');
  },
};

/** A leaf blown on the wind (weather). */
function leaf(color: number): SpriteSpec {
  return {
    size: 16,
    paint(g, s) {
      poly(
        g,
        [s * 0.1, s * 0.5, s * 0.5, s * 0.2, s * 0.9, s * 0.5, s * 0.5, s * 0.8],
        hex(color),
        'rgba(8,6,10,0.6)',
      );
      line(g, [s * 0.15, s * 0.5, s * 0.85, s * 0.5], hex(shade(color, 0.7)), 1);
    },
  };
}

export const CREATURES: Record<string, SpriteSpec> = {
  leaf_olive: leaf(0x7a9a4a),
  leaf_dead: leaf(0x8a6a3a),
  dove: bird(0xe8e4dc, 0xd0ccc4, '#c8805a'),
  gull: bird(0xf0f0ec, 0x9aa4b0, '#e0b040'),
  crow: bird(0x2a2630, 0x1e1a24, '#4a4a4a'),
  bat,
  frog,
  rat,
};
