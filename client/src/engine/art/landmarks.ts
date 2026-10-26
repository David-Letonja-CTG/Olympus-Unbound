import { circle, Ctx, ellipse, glow, line, poly, slab, SpriteSpec, volume } from './canvas';

/**
 * One great set piece per realm (spec: arena-generation / landmarks): code-drawn like the other ruins, lit from the
 * upper left, painted once into a texture. Each stands on one wide obstacle the gods and monsters walk round.
 */

const shadow = (g: Ctx, s: number, rx: number, ry: number, y = 0.66) =>
  ellipse(g, s * 0.54, s * y, s * rx, s * ry, 'rgba(0,0,0,0.42)');

/** Mount Olympus: the fallen colossus of Zeus, his crowned head and a broken hand with a thunderbolt. */
const fallenColossus: SpriteSpec = {
  size: 290,
  paint(g, s) {
    shadow(g, s, 0.44, 0.24);
    // The broken torso, lying on its side, and the plinth it fell from.
    slab(
      g,
      [s * 0.08, s * 0.7, s * 0.34, s * 0.6, s * 0.38, s * 0.82, s * 0.1, s * 0.86],
      0x6e6a62,
      {
        outline: 3,
      },
    );
    volume(g, s * 0.5, s * 0.6, s * 0.2, s * 0.12, 0xb8b2a2, { contrast: 1.3 });
    // The head: a bearded face looking up, the laurel still on its brow.
    volume(g, s * 0.74, s * 0.46, s * 0.14, s * 0.13, 0xc4beae, { contrast: 1.3 });
    for (let i = 0; i < 7; i++) {
      const a = -2.6 + i * 0.36;
      ellipse(
        g,
        s * (0.74 + Math.cos(a) * 0.13),
        s * (0.46 + Math.sin(a) * 0.12),
        s * 0.025,
        s * 0.012,
        '#7a8a5a',
      );
    }
    line(g, [s * 0.69, s * 0.45, s * 0.72, s * 0.45], '#4a4640', 3);
    line(g, [s * 0.76, s * 0.45, s * 0.79, s * 0.45], '#4a4640', 3);
    volume(g, s * 0.74, s * 0.56, s * 0.08, s * 0.05, 0xa8a292);
    // The hand, open on the ground, and the stone thunderbolt beside it.
    volume(g, s * 0.26, s * 0.42, s * 0.08, s * 0.06, 0xb4ae9e);
    poly(
      g,
      [
        s * 0.14,
        s * 0.3,
        s * 0.2,
        s * 0.36,
        s * 0.17,
        s * 0.38,
        s * 0.24,
        s * 0.46,
        s * 0.18,
        s * 0.4,
        s * 0.2,
        s * 0.38,
      ],
      '#c8c2b2',
      '#4a4640',
      1.5,
    );
    // Cracks and moss.
    line(g, [s * 0.42, s * 0.52, s * 0.48, s * 0.62, s * 0.45, s * 0.7], '#5a564e', 1.5);
    for (const [x, y] of [
      [0.36, 0.66],
      [0.6, 0.54],
      [0.82, 0.52],
      [0.22, 0.78],
    ])
      circle(g, s * x, s * y, s * 0.025, 'rgba(70,90,50,0.6)');
  },
};

/** The Underworld: the gates of Hades, black bronze leaves between two pylons, skulls on the lintel. */
const gatesOfHades: SpriteSpec = {
  size: 290,
  paint(g, s) {
    shadow(g, s, 0.42, 0.18, 0.78);
    for (const x of [0.16, 0.74])
      slab(
        g,
        [s * x, s * 0.2, s * (x + 0.1), s * 0.2, s * (x + 0.1), s * 0.82, s * x, s * 0.82],
        0x2c2a31,
        { outline: 3 },
      );
    slab(
      g,
      [s * 0.12, s * 0.12, s * 0.88, s * 0.12, s * 0.88, s * 0.22, s * 0.12, s * 0.22],
      0x3a3644,
      { outline: 3 },
    );
    // Two bronze leaves, one ajar, with bars.
    slab(
      g,
      [s * 0.26, s * 0.24, s * 0.49, s * 0.24, s * 0.49, s * 0.8, s * 0.26, s * 0.8],
      0x4a3a2a,
      { outline: 2 },
    );
    slab(
      g,
      [s * 0.51, s * 0.24, s * 0.7, s * 0.28, s * 0.7, s * 0.78, s * 0.51, s * 0.8],
      0x3e3022,
      { outline: 2 },
    );
    for (let i = 0; i < 4; i++) {
      line(g, [s * (0.3 + i * 0.05), s * 0.28, s * (0.3 + i * 0.05), s * 0.76], '#7a5e3a', 2);
      line(g, [s * (0.55 + i * 0.04), s * 0.31, s * (0.55 + i * 0.04), s * 0.75], '#6a5032', 2);
    }
    // The glow of the land beyond, through the gap.
    glow(g, s * 0.5, s * 0.5, s * 0.12, 0x7fe0c8, 0.5);
    for (let i = 0; i < 5; i++) {
      const x = s * (0.24 + i * 0.13);
      circle(g, x, s * 0.17, s * 0.03, '#d8d0c0', '#2a2620', 1.2);
      circle(g, x - s * 0.01, s * 0.165, s * 0.007, '#1a1614');
      circle(g, x + s * 0.01, s * 0.165, s * 0.007, '#1a1614');
    }
  },
};

/** The Lernaean Marsh: a sunken temple, only its pediment and column tops above the black water. */
const sunkenTemple: SpriteSpec = {
  size: 290,
  paint(g, s) {
    ellipse(g, s * 0.5, s * 0.6, s * 0.46, s * 0.3, '#10201a', 'rgba(60,90,70,0.6)');
    ellipse(g, s * 0.46, s * 0.54, s * 0.3, s * 0.14, 'rgba(120,160,130,0.12)');
    for (let i = 0; i < 5; i++) {
      const x = s * (0.22 + i * 0.14);
      volume(g, x, s * 0.56, s * 0.035, s * 0.02, 0x7d8470);
      line(g, [x, s * 0.56, x, s * 0.46], '#7d8470', 7);
    }
    poly(g, [s * 0.14, s * 0.46, s * 0.5, s * 0.26, s * 0.86, s * 0.46], '#8a9080', '#2a2e24', 3);
    poly(g, [s * 0.24, s * 0.43, s * 0.5, s * 0.31, s * 0.76, s * 0.43], '#6a705e');
    for (const [x, y] of [
      [0.3, 0.36],
      [0.62, 0.32],
      [0.74, 0.42],
      [0.42, 0.44],
    ])
      circle(g, s * x, s * y, s * 0.03, 'rgba(70,110,50,0.75)');
    // Reeds at the waterline and a will-o'-wisp.
    for (let i = 0; i < 9; i++) {
      const x = s * (0.1 + i * 0.1);
      line(g, [x, s * 0.78, x + s * 0.01, s * (0.66 - (i % 3) * 0.03)], '#4c5a36', 2);
    }
    glow(g, s * 0.8, s * 0.3, s * 0.06, 0x9be8c0, 0.8);
  },
};

/** The Aegean Shore: a beached trireme on her side, oars askew, a torn sail with an eye on the prow. */
const beachedTrireme: SpriteSpec = {
  size: 310,
  paint(g, s) {
    shadow(g, s, 0.46, 0.18, 0.7);
    poly(
      g,
      [
        s * 0.08,
        s * 0.58,
        s * 0.2,
        s * 0.7,
        s * 0.82,
        s * 0.66,
        s * 0.94,
        s * 0.5,
        s * 0.84,
        s * 0.54,
        s * 0.16,
        s * 0.52,
      ],
      '#5e4a36',
      '#1e1810',
      3,
    );
    for (let i = 0; i < 4; i++)
      line(
        g,
        [s * 0.16, s * (0.56 + i * 0.03), s * 0.86, s * (0.54 + i * 0.028)],
        'rgba(30,24,16,0.6)',
        1.5,
      );
    // The eye on the prow.
    ellipse(g, s * 0.86, s * 0.55, s * 0.03, s * 0.018, '#e8dcc8', '#1e1810');
    circle(g, s * 0.86, s * 0.55, s * 0.01, '#1e1810');
    // Oars askew.
    for (let i = 0; i < 7; i++) {
      const x = s * (0.22 + i * 0.08);
      line(g, [x, s * 0.64, x - s * 0.06 + (i % 2) * s * 0.03, s * 0.84], '#7c705e', 3);
    }
    // The mast, fallen across, and the torn sail.
    line(g, [s * 0.42, s * 0.52, s * 0.66, s * 0.14], '#4a3a2a', 6);
    poly(
      g,
      [s * 0.5, s * 0.4, s * 0.66, s * 0.16, s * 0.76, s * 0.3, s * 0.62, s * 0.44],
      '#c8b898',
      '#4a3a2a',
      2,
    );
    line(g, [s * 0.58, s * 0.32, s * 0.68, s * 0.36], '#8a3a2a', 3);
  },
};

/** The Labyrinth: Daedalus's workshop, a bench of tools and the wax-and-feather wings hung on their frame. */
const daedalusWorkshop: SpriteSpec = {
  size: 260,
  paint(g, s) {
    shadow(g, s, 0.42, 0.22);
    // The workbench.
    slab(
      g,
      [s * 0.14, s * 0.56, s * 0.86, s * 0.56, s * 0.86, s * 0.66, s * 0.14, s * 0.66],
      0x6a4e34,
      { outline: 2.5 },
    );
    for (const x of [0.18, 0.82]) line(g, [s * x, s * 0.66, s * x, s * 0.8], '#3a2a1e', 5);
    for (const [x, w] of [
      [0.24, 0.1],
      [0.4, 0.06],
      [0.6, 0.12],
    ])
      slab(
        g,
        [s * x, s * 0.52, s * (x + w), s * 0.52, s * (x + w), s * 0.56, s * x, s * 0.56],
        0x8a7a62,
        { outline: 1 },
      );
    // The wings on their frame: feathers fanned from a wax spar.
    line(g, [s * 0.5, s * 0.14, s * 0.5, s * 0.5], '#4a3a2a', 4);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const a = -0.2 - i * 0.12;
        const len = s * (0.3 - i * 0.015);
        const x0 = s * 0.5 + side * s * 0.02;
        line(
          g,
          [x0, s * 0.22, x0 + side * Math.cos(a) * len, s * 0.22 - Math.sin(a) * len * 0.6],
          i % 2 ? '#e8dcc8' : '#c8b898',
          4,
        );
      }
      line(g, [s * 0.5, s * 0.22, s * 0.5 + side * s * 0.3, s * 0.24], '#d8b860', 3);
    }
    circle(g, s * 0.3, s * 0.82, s * 0.03, '#d8b860', '#5a4020', 1.5);
  },
};

/** Mount Othrys: the shattered throne of Kronos, black and bronze, his sickle across the steps. */
const throneOfKronos: SpriteSpec = {
  size: 290,
  paint(g, s) {
    shadow(g, s, 0.42, 0.22, 0.72);
    for (let i = 0; i < 3; i++)
      slab(
        g,
        [
          s * (0.16 + i * 0.05),
          s * (0.7 + i * 0.05),
          s * (0.84 - i * 0.05),
          s * (0.7 + i * 0.05),
          s * (0.84 - i * 0.05),
          s * (0.75 + i * 0.05),
          s * (0.16 + i * 0.05),
          s * (0.75 + i * 0.05),
        ],
        0x2e2a2c,
        { outline: 2 },
      );
    // The back of the throne, split down the middle.
    slab(
      g,
      [s * 0.28, s * 0.12, s * 0.48, s * 0.1, s * 0.46, s * 0.7, s * 0.28, s * 0.7],
      0x3a3436,
      { outline: 3 },
    );
    slab(
      g,
      [s * 0.52, s * 0.16, s * 0.72, s * 0.14, s * 0.72, s * 0.7, s * 0.54, s * 0.7],
      0x332e30,
      { outline: 3 },
    );
    for (const x of [0.38, 0.62])
      volume(g, s * x, s * 0.12, s * 0.06, s * 0.04, 0x8a6a3e, { contrast: 1.4 });
    slab(
      g,
      [s * 0.24, s * 0.5, s * 0.76, s * 0.5, s * 0.76, s * 0.58, s * 0.24, s * 0.58],
      0x8a6a3e,
      { outline: 2 },
    );
    // The sickle (harpe) lying across the steps.
    g.beginPath();
    g.arc(s * 0.62, s * 0.8, s * 0.12, Math.PI * 1.05, Math.PI * 1.85);
    g.strokeStyle = '#c8c0b0';
    g.lineWidth = 5;
    g.stroke();
    line(g, [s * 0.5, s * 0.8, s * 0.3, s * 0.86], '#5a3a22', 5);
    glow(g, s * 0.5, s * 0.4, s * 0.1, 0xff7a40, 0.25);
  },
};

/** The Crossroads of Hecate: a hekataion, her three faces round one pillar, a torch in every hand. */
const hekataion: SpriteSpec = {
  size: 260,
  paint(g, s) {
    shadow(g, s, 0.36, 0.2, 0.74);
    slab(g, [s * 0.3, s * 0.7, s * 0.7, s * 0.7, s * 0.7, s * 0.8, s * 0.3, s * 0.8], 0x6a6670, {
      outline: 2.5,
    });
    line(g, [s * 0.5, s * 0.7, s * 0.5, s * 0.3], '#4a4650', 18);
    line(g, [s * 0.5, s * 0.7, s * 0.5, s * 0.3], '#8a8690', 12);
    // Three faces: front and both sides.
    for (const [x, r] of [
      [0.5, 0.08],
      [0.38, 0.06],
      [0.62, 0.06],
    ]) {
      volume(g, s * x, s * 0.26, s * r, s * r, 0xb0aab8, { contrast: 1.3 });
      line(g, [s * (x - r * 0.4), s * 0.25, s * (x - r * 0.15), s * 0.25], '#3a3640', 2);
      line(g, [s * (x + r * 0.15), s * 0.25, s * (x + r * 0.4), s * 0.25], '#3a3640', 2);
    }
    // Torches held out to the three roads, and an offering of honey cakes at her feet.
    for (const [x, y] of [
      [0.24, 0.4],
      [0.76, 0.4],
      [0.5, 0.12],
    ]) {
      line(g, [s * 0.5, s * 0.36, s * x, s * y], '#4a3a2a', 3);
      glow(g, s * x, s * (y - 0.04), s * 0.08, 0xff8a2a, 0.9);
      poly(g, [s * (x - 0.025), s * y, s * x, s * (y - 0.07), s * (x + 0.025), s * y], '#ffc060');
    }
    for (const [x, y] of [
      [0.4, 0.84],
      [0.47, 0.86],
      [0.56, 0.84],
    ])
      circle(g, s * x, s * y, s * 0.025, '#c8782a', '#5a3010', 1);
  },
};

/** The Starlit Wood: the cave of Nyx, a dark mouth in a snowy hill, stars hanging over it and frost at its lip. */
const caveOfNyx: SpriteSpec = {
  size: 270,
  paint(g, s) {
    shadow(g, s, 0.4, 0.22, 0.7);
    // The hill: grey rock under snow, the cave mouth black and deep.
    slab(
      g,
      [
        s * 0.12,
        s * 0.74,
        s * 0.22,
        s * 0.38,
        s * 0.44,
        s * 0.22,
        s * 0.7,
        s * 0.26,
        s * 0.88,
        s * 0.5,
        s * 0.86,
        s * 0.76,
      ],
      0x5a6274,
      { outline: 3, contrast: 1.2 },
    );
    for (const [x, y, rx, ry] of [
      [0.36, 0.3, 0.14, 0.06],
      [0.62, 0.3, 0.12, 0.05],
      [0.2, 0.48, 0.07, 0.04],
      [0.8, 0.52, 0.06, 0.04],
    ])
      ellipse(g, s * x, s * y, s * rx, s * ry, 'rgba(236,242,255,0.92)');
    ellipse(g, s * 0.5, s * 0.6, s * 0.17, s * 0.14, '#05060c', 'rgba(8,6,10,0.9)');
    glow(g, s * 0.5, s * 0.6, s * 0.14, 0x4a5aa8, 0.5);
    // Icicles on the lip, and her stars in the dark above.
    for (let i = 0; i < 6; i++) {
      const x = s * (0.37 + i * 0.052);
      poly(
        g,
        [x - s * 0.012, s * 0.48, x, s * (0.53 + (i % 2) * 0.03), x + s * 0.012, s * 0.48],
        '#d8ecff',
      );
    }
    for (const [x, y, r] of [
      [0.5, 0.08, 0.03],
      [0.3, 0.14, 0.02],
      [0.7, 0.12, 0.022],
      [0.42, 0.04, 0.015],
      [0.6, 0.02, 0.016],
    ]) {
      glow(g, s * x, s * y, s * r * 3, 0xb0c8ff, 0.8);
      circle(g, s * x, s * y, s * r * 0.5, '#ffffff');
    }
    // Lamps left for her at the threshold.
    for (const x of [0.34, 0.66]) {
      glow(g, s * x, s * 0.76, s * 0.05, 0xffc860, 0.9);
      circle(g, s * x, s * 0.76, s * 0.015, '#fff0b0');
    }
  },
};

/** The Peaks of Thrace: the ice throne of Boreas between two pillars of ice, a wind-carved crest at its back. */
const iceThrone: SpriteSpec = {
  size: 270,
  paint(g, s) {
    shadow(g, s, 0.38, 0.2, 0.74);
    slab(
      g,
      [s * 0.24, s * 0.68, s * 0.76, s * 0.68, s * 0.8, s * 0.8, s * 0.2, s * 0.8],
      0x8aa4c4,
      {
        outline: 2.5,
      },
    );
    // The crest: shards of ice fanned out like a frozen gust.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32;
      const tip = [s * 0.5 + Math.cos(a) * s * 0.4, s * 0.5 + Math.sin(a) * s * 0.4];
      poly(
        g,
        [s * 0.46, s * 0.5, tip[0], tip[1], s * 0.54, s * 0.5],
        i % 2 ? '#a8d0f0' : '#d0ecff',
        'rgba(20,30,50,0.8)',
        1.5,
      );
    }
    // The seat and its arms.
    slab(
      g,
      [s * 0.36, s * 0.42, s * 0.64, s * 0.42, s * 0.66, s * 0.68, s * 0.34, s * 0.68],
      0xb8d8f0,
      {
        outline: 2.5,
        contrast: 1.3,
      },
    );
    slab(
      g,
      [s * 0.4, s * 0.52, s * 0.6, s * 0.52, s * 0.6, s * 0.62, s * 0.4, s * 0.62],
      0x7a9ac0,
      {
        outline: 1.5,
      },
    );
    // The pillars, each crowned with a frozen flame of pale light.
    for (const x of [0.2, 0.8]) {
      volume(g, s * x, s * 0.52, s * 0.06, s * 0.2, 0xc0e0f8, { contrast: 1.4 });
      glow(g, s * x, s * 0.3, s * 0.08, 0xa8e0ff, 0.9);
      poly(g, [s * (x - 0.03), s * 0.34, s * x, s * 0.22, s * (x + 0.03), s * 0.34], '#e8f8ff');
    }
    for (let i = 0; i < 5; i++)
      line(
        g,
        [s * (0.38 + i * 0.06), s * 0.7, s * (0.4 + i * 0.06), s * 0.76],
        'rgba(255,255,255,0.5)',
        1,
      );
  },
};

/** The Garden of Aphrodite: the great scallop shell she rose in, half sunk in sea foam, a ring of roses round it. */
const shellOfAphrodite: SpriteSpec = {
  size: 270,
  paint(g, s) {
    shadow(g, s, 0.4, 0.22, 0.72);
    // Foam round the base.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      circle(
        g,
        s * 0.5 + Math.cos(a) * s * 0.34,
        s * 0.66 + Math.sin(a) * s * 0.12,
        s * 0.05,
        'rgba(236,244,248,0.85)',
      );
    }
    ellipse(g, s * 0.5, s * 0.66, s * 0.32, s * 0.1, '#6a9ab0', 'rgba(8,6,10,0.7)');
    // The shell: ribs fanning from the hinge.
    const hinge = [s * 0.5, s * 0.68];
    for (let i = 0; i < 9; i++) {
      const a0 = Math.PI + (i / 9) * Math.PI;
      const a1 = Math.PI + ((i + 1) / 9) * Math.PI;
      poly(
        g,
        [
          hinge[0],
          hinge[1],
          hinge[0] + Math.cos(a0) * s * 0.34,
          hinge[1] + Math.sin(a0) * s * 0.44,
          hinge[0] + Math.cos((a0 + a1) / 2) * s * 0.37,
          hinge[1] + Math.sin((a0 + a1) / 2) * s * 0.48,
          hinge[0] + Math.cos(a1) * s * 0.34,
          hinge[1] + Math.sin(a1) * s * 0.44,
        ],
        i % 2 ? '#f0d8cc' : '#e4c4b8',
        'rgba(60,30,30,0.75)',
        1.5,
      );
    }
    volume(g, hinge[0], hinge[1], s * 0.06, s * 0.04, 0xd8b0a4, { outline: 1.5 });
    glow(g, s * 0.5, s * 0.42, s * 0.2, 0xffd0e0, 0.4);
    // Roses at the foot.
    for (const [x, y] of [
      [0.24, 0.8],
      [0.36, 0.84],
      [0.64, 0.84],
      [0.76, 0.8],
    ]) {
      circle(g, s * x, s * y, s * 0.025, '#c8283e', 'rgba(60,10,20,0.8)', 1);
      ellipse(g, s * (x + 0.02), s * (y + 0.02), s * 0.02, s * 0.01, '#3a6a2e');
    }
  },
};

/** The Garden of the Hesperides: Atlas on one knee, the sphere of the sky on his shoulders, its stars engraved. */
const atlasHoldingSky: SpriteSpec = {
  size: 290,
  paint(g, s) {
    shadow(g, s, 0.42, 0.22, 0.72);
    slab(
      g,
      [s * 0.26, s * 0.72, s * 0.74, s * 0.72, s * 0.78, s * 0.84, s * 0.22, s * 0.84],
      0x8a8270,
      {
        outline: 2.5,
      },
    );
    // The kneeling Titan: a bent leg, the torso, both arms raised to the sphere.
    volume(g, s * 0.4, s * 0.68, s * 0.1, s * 0.06, 0xa89878);
    volume(g, s * 0.58, s * 0.66, s * 0.07, s * 0.08, 0xa08e70);
    volume(g, s * 0.5, s * 0.56, s * 0.12, s * 0.13, 0xb4a484, { contrast: 1.3 });
    line(g, [s * 0.4, s * 0.52, s * 0.34, s * 0.36], '#7a6a52', 12);
    line(g, [s * 0.4, s * 0.52, s * 0.34, s * 0.36], '#b0a080', 8);
    line(g, [s * 0.6, s * 0.52, s * 0.66, s * 0.36], '#7a6a52', 12);
    line(g, [s * 0.6, s * 0.52, s * 0.66, s * 0.36], '#b0a080', 8);
    volume(g, s * 0.5, s * 0.43, s * 0.05, s * 0.05, 0xb8a888);
    // The sphere of the sky: a bronze globe with its circles and stars.
    volume(g, s * 0.5, s * 0.24, s * 0.2, s * 0.18, 0x6a7a8a, { contrast: 1.4, outline: 3 });
    g.beginPath();
    g.ellipse(s * 0.5, s * 0.24, s * 0.2, s * 0.06, -0.3, 0, Math.PI * 2);
    g.strokeStyle = '#d8b860';
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.ellipse(s * 0.5, s * 0.24, s * 0.07, s * 0.18, 0.2, 0, Math.PI * 2);
    g.stroke();
    for (const [x, y] of [
      [0.42, 0.16],
      [0.56, 0.14],
      [0.6, 0.28],
      [0.38, 0.3],
      [0.5, 0.33],
    ]) {
      glow(g, s * x, s * y, s * 0.025, 0xffe08a, 0.9);
      circle(g, s * x, s * y, s * 0.008, '#fff4c0');
    }
    // Golden apples left at his feet.
    for (const [x, y] of [
      [0.32, 0.78],
      [0.4, 0.8],
      [0.66, 0.78],
    ])
      circle(g, s * x, s * y, s * 0.022, '#f2c030', 'rgba(60,40,0,0.8)', 1);
  },
};

export const LANDMARKS: Readonly<Record<string, SpriteSpec>> = {
  cave_of_nyx: caveOfNyx,
  ice_throne: iceThrone,
  shell_of_aphrodite: shellOfAphrodite,
  atlas_holding_sky: atlasHoldingSky,
  fallen_colossus: fallenColossus,
  gates_of_hades: gatesOfHades,
  sunken_temple: sunkenTemple,
  beached_trireme: beachedTrireme,
  daedalus_workshop: daedalusWorkshop,
  throne_of_kronos: throneOfKronos,
  hekataion,
};
