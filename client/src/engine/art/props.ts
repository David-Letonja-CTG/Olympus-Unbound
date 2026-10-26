import { ellipse, hex, line, poly, shade, slab, SpriteSpec, volume } from './canvas';

/**
 * Breakable props (spec: arena-generation / breakable props): small jars, urns, baskets, crates and gourds a god
 * smashes by walking into them, lit from the upper left like the ruins. Factories take the realm's clay or wood.
 */

const shadow = (g: CanvasRenderingContext2D, s: number, rx = 0.3) =>
  ellipse(g, s * 0.55, s * 0.8, s * rx, s * 0.1, 'rgba(0,0,0,0.42)');

/** A two-handled jar: `clay` the body, `band` the painted stripes. */
function amphora(clay: number, band: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s);
      // Handles behind the shoulders, then the body, the neck and the dark mouth.
      line(
        g,
        [s * 0.32, s * 0.3, s * 0.24, s * 0.4, s * 0.32, s * 0.5],
        hex(shade(clay, 0.7)),
        2.5,
      );
      line(
        g,
        [s * 0.68, s * 0.3, s * 0.76, s * 0.4, s * 0.68, s * 0.5],
        hex(shade(clay, 0.7)),
        2.5,
      );
      volume(g, s * 0.5, s * 0.56, s * 0.22, s * 0.25, clay, { outline: 2, contrast: 1.2 });
      line(g, [s * 0.31, s * 0.5, s * 0.69, s * 0.5], hex(band), 2.5);
      line(g, [s * 0.3, s * 0.62, s * 0.7, s * 0.62], hex(band, 0.8), 1.5);
      volume(g, s * 0.5, s * 0.26, s * 0.09, s * 0.08, shade(clay, 0.95), { outline: 1.5 });
      ellipse(g, s * 0.5, s * 0.22, s * 0.08, s * 0.035, hex(shade(clay, 0.3)));
    },
  };
}

/** A lidded funerary urn: wide, squat, with a knob. */
function urn(body: number, trim: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s, 0.32);
      volume(g, s * 0.5, s * 0.58, s * 0.26, s * 0.22, body, { outline: 2, contrast: 1.3 });
      line(g, [s * 0.26, s * 0.56, s * 0.74, s * 0.56], hex(trim), 2);
      volume(g, s * 0.5, s * 0.36, s * 0.2, s * 0.08, shade(body, 1.1), { outline: 1.5 });
      volume(g, s * 0.5, s * 0.3, s * 0.05, s * 0.05, trim, { outline: 1 });
    },
  };
}

/** A woven reed basket, open, with a few reeds sticking out. */
function basket(reed: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s, 0.32);
      volume(g, s * 0.5, s * 0.6, s * 0.25, s * 0.2, reed, { outline: 2 });
      for (let i = 0; i < 4; i++)
        line(
          g,
          [s * 0.27, s * (0.52 + i * 0.06), s * 0.73, s * (0.52 + i * 0.06)],
          hex(shade(reed, 0.6), 0.7),
          1,
        );
      ellipse(
        g,
        s * 0.5,
        s * 0.44,
        s * 0.22,
        s * 0.08,
        hex(shade(reed, 0.35)),
        'rgba(8,6,10,0.85)',
      );
      line(g, [s * 0.42, s * 0.44, s * 0.36, s * 0.22], hex(shade(reed, 1.2)), 1.5);
      line(g, [s * 0.55, s * 0.44, s * 0.62, s * 0.2], hex(shade(reed, 1.1)), 1.5);
    },
  };
}

/** A plank crate in three-quarter view: `wood` the boards. */
function crate(wood: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s, 0.32);
      // The front face, the top, and the side in shadow.
      slab(
        g,
        [s * 0.24, s * 0.4, s * 0.68, s * 0.4, s * 0.68, s * 0.78, s * 0.24, s * 0.78],
        wood,
        {
          outline: 2,
        },
      );
      poly(
        g,
        [s * 0.24, s * 0.4, s * 0.36, s * 0.28, s * 0.8, s * 0.28, s * 0.68, s * 0.4],
        hex(shade(wood, 1.25)),
        'rgba(8,6,10,0.85)',
      );
      poly(
        g,
        [s * 0.68, s * 0.4, s * 0.8, s * 0.28, s * 0.8, s * 0.66, s * 0.68, s * 0.78],
        hex(shade(wood, 0.6)),
        'rgba(8,6,10,0.85)',
      );
      const plank = hex(shade(wood, 0.55), 0.8);
      line(g, [s * 0.24, s * 0.53, s * 0.68, s * 0.53], plank, 1);
      line(g, [s * 0.24, s * 0.65, s * 0.68, s * 0.65], plank, 1);
      line(g, [s * 0.26, s * 0.42, s * 0.66, s * 0.76], hex(shade(wood, 0.7)), 2);
    },
  };
}

/** A round gourd with a carved, glowing grin: an offering at the crossroads. */
function gourd(skin: number, glowColor: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s, 0.32);
      for (const dx of [-0.12, 0.12, 0])
        volume(
          g,
          s * (0.5 + dx),
          s * 0.58,
          s * 0.15,
          s * 0.19,
          shade(skin, dx === 0 ? 1.05 : 0.85),
          {
            outline: 1.5,
          },
        );
      poly(g, [s * 0.4, s * 0.52, s * 0.46, s * 0.52, s * 0.43, s * 0.47], hex(glowColor));
      poly(g, [s * 0.54, s * 0.52, s * 0.6, s * 0.52, s * 0.57, s * 0.47], hex(glowColor));
      poly(
        g,
        [
          s * 0.4,
          s * 0.62,
          s * 0.6,
          s * 0.62,
          s * 0.56,
          s * 0.67,
          s * 0.5,
          s * 0.64,
          s * 0.44,
          s * 0.67,
        ],
        hex(glowColor),
      );
      line(g, [s * 0.5, s * 0.4, s * 0.53, s * 0.3], '#4a5a2a', 2.5);
    },
  };
}

/** A wrapped offering for the solstice: a cloth-bound box tied with a ribbon (`cloth`, `ribbon`). */
function gift(cloth: number, ribbon: number): SpriteSpec {
  return {
    size: 64,
    paint(g, s) {
      shadow(g, s, 0.3);
      slab(
        g,
        [s * 0.26, s * 0.44, s * 0.66, s * 0.44, s * 0.66, s * 0.78, s * 0.26, s * 0.78],
        cloth,
        { outline: 2 },
      );
      poly(
        g,
        [s * 0.26, s * 0.44, s * 0.36, s * 0.34, s * 0.76, s * 0.34, s * 0.66, s * 0.44],
        hex(shade(cloth, 1.3)),
        'rgba(8,6,10,0.85)',
      );
      poly(
        g,
        [s * 0.66, s * 0.44, s * 0.76, s * 0.34, s * 0.76, s * 0.68, s * 0.66, s * 0.78],
        hex(shade(cloth, 0.6)),
        'rgba(8,6,10,0.85)',
      );
      // The ribbon across the front and the top, and its bow.
      line(g, [s * 0.46, s * 0.44, s * 0.46, s * 0.78], hex(ribbon), 3);
      line(g, [s * 0.31, s * 0.39, s * 0.71, s * 0.39], hex(ribbon), 3);
      volume(g, s * 0.44, s * 0.33, s * 0.06, s * 0.04, ribbon, { outline: 1, rim: 0.3 });
      volume(g, s * 0.56, s * 0.33, s * 0.06, s * 0.04, ribbon, { outline: 1, rim: 0.3 });
    },
  };
}

export const PROPS: Record<string, SpriteSpec> = {
  prop_amphora: amphora(0xb0623a, 0x2a1a14),
  prop_amphora_pale: amphora(0xc8a77a, 0x6a3a22),
  prop_urn_black: urn(0x2e2a36, 0x5ad6c8),
  prop_basket: basket(0x8a7a48),
  prop_crate: crate(0x8a6238),
  prop_urn_bronze: urn(0x8a6a3a, 0xd0a050),
  prop_gourd: gourd(0xd0782a, 0xffd36a),
  // The seasonal events (spec: seasonal-events).
  prop_gift: gift(0xa8303a, 0xe8c050),
  prop_urn_frost: urn(0x8aa4c4, 0xe0f0ff),
  prop_amphora_rose: amphora(0xd8968a, 0x8a2a3a),
  prop_amphora_gold: amphora(0xc8a04a, 0x5a3a14),
  prop_amphora_wine: amphora(0x7a2a4a, 0xe0c070),
};
