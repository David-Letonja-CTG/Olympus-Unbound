import type { AssetFile, AssetManifest, SpriteAnimation, SpriteAsset } from '../engine';

/**
 * External art and fonts (D12). Files live under `client/public/assets/<pack>/` and `client/public/fonts/`; every
 * file needs an entry here with its licence (checked by `npm run assets:check`). Sprite keys not listed in
 * `sprites` use the code-drawn art. How to add a pack: docs/content.md.
 *
 * The cast shares one source and render setup (D15): most characters are rendered by this project in Blender
 * (`art/blender/`) from the Flare collection's CC-BY 3.0 models, and two are Flare's own sheets. Every sheet is
 * the right-facing direction in an 8-column grid (`scripts/pack-sheet.mjs`); the game flips it for the left.
 */

const PACKED =
  'Right-facing row extracted and re-packed into an 8-column grid (scripts/pack-sheet.mjs)';
const RENDERED = 'Rendered by OLYMPUS UNBOUND in Blender (art/blender/), recoloured and extended';

const CLINT = 'Clint Bellanger';
const HERO_MODEL = {
  name: 'CC-BY-3.0',
  author: CLINT,
  title: 'Isometric Hero and Heroine',
  source: 'https://opengameart.org/content/isometric-hero-and-heroine',
} as const;

/** A sheet rendered by this project from a CC-BY model; `what` names the character and the parts used. */
function rendered(
  id: string,
  frame: number,
  licence: Omit<AssetFile['licence'], 'notes'>,
  what: string,
): AssetFile {
  return {
    id,
    type: 'spritesheet',
    url: `assets/olympus/${id}.png`,
    frameWidth: frame,
    frameHeight: frame,
    licence: { ...licence, notes: `${what}. ${RENDERED}` },
  };
}

function flareSheet(
  id: string,
  file: string,
  licence: Omit<AssetFile['licence'], 'notes'> & { readonly notes?: string },
): AssetFile {
  return {
    id,
    type: 'spritesheet',
    url: `assets/flare/${file}`,
    frameWidth: 128,
    frameHeight: 128,
    licence: { ...licence, notes: licence.notes ? `${licence.notes}. ${PACKED}` : PACKED },
  };
}

/** Frames `from`..`to` (inclusive) of a packed sheet. */
function run(from: number, to: number, fps: number, repeat = true): SpriteAnimation {
  return {
    frames: Array.from({ length: to - from + 1 }, (_, i) => from + i),
    fps,
    ...(repeat ? {} : { repeat: false }),
  };
}

/**
 * A character from a packed sheet. `scale` sizes the figure to the entity's gameplay radius (about 3.4 radii
 * tall for upright figures); the origin puts the feet a little below the entity position. `stride` is the ground
 * one walk cycle covers (about 1.6 figure heights for the hero's run, a body length for beasts), so the walk
 * keeps pace with the movement.
 */
function character(
  file: string,
  scale: number,
  originX: number,
  originY: number,
  stride: number,
  animations: SpriteAsset['animations'],
): SpriteAsset {
  return { file, frame: 0, scale, originX, originY, faces: 'right', stride, animations };
}

/** Flare's humanoid layout: stance 0–3, run 4–11, swing 12–15, block 16–17, hit and die 18–23, cast, shoot. */
const humanoid = (deathFrom = 18, deathTo = 23) => ({
  idle: run(0, 3, 4),
  walk: run(4, 11, 10),
  attack: run(12, 15, 10, false),
  death: run(deathFrom, deathTo, 10, false),
});

export const ASSETS: AssetManifest = {
  files: [
    rendered(
      'zeus',
      128,
      HERO_MODEL,
      'Zeus: the hero in a white chiton, gold, silver beard and laurel',
    ),
    rendered(
      'hades',
      128,
      HERO_MODEL,
      'Hades: the hero in blackened steel, crimson tabard, iron crown and bident',
    ),
    rendered(
      'poseidon',
      128,
      HERO_MODEL,
      'Poseidon: the hero in a sea-green chiton, gold crown and trident',
    ),
    rendered(
      'athena',
      128,
      HERO_MODEL,
      'Athena: the heroine in bronze and gold with crested helmet, Aegis and spear',
    ),
    rendered('satyr', 128, HERO_MODEL, 'Satyr: the hero with horns, goat legs and a thyrsus'),
    rendered('harpy', 128, HERO_MODEL, 'Harpy: the heroine with feathered wings and talons'),
    rendered('fallen_oracle', 128, HERO_MODEL, 'Fallen Oracle: the heroine in dark robes'),
    rendered(
      'marble_sentinel',
      128,
      HERO_MODEL,
      'Marble Sentinel: the hero in steel, carved in marble',
    ),
    rendered(
      'stymphalian_bird',
      128,
      HERO_MODEL,
      "Stymphalian Bird: modelled by this project in the hero file's scene (camera and sun)",
    ),
    rendered(
      'centaur_archer',
      128,
      {
        name: 'CC-BY-3.0',
        author: "VWolfdog (horse, on _canyon's rigged horse); Clint Bellanger (rider)",
        title: 'FLARE Model - Horse; Isometric Hero and Heroine',
        source: 'https://opengameart.org/content/flare-model-horse',
      },
      'Centaur Archer: the horse with the hero as rider, neck and legs removed',
    ),
    rendered(
      'cyclops',
      256,
      {
        name: 'CC-BY-3.0',
        author: "VWolfdog (on Clint Bellanger's base human mesh)",
        title: 'FLARE Model - Troll',
        source: 'https://opengameart.org/content/flare-model-troll',
      },
      'The Cyclops: the troll with one great eye',
    ),
    rendered('ally_warrior', 128, HERO_MODEL, 'Intro warrior: leather armour, shield, longsword'),
    rendered('ally_maiden', 128, HERO_MODEL, 'Intro maiden: the heroine with a staff'),
    rendered('ally_smith', 128, HERO_MODEL, 'Intro smith: the hero in work clothes'),
    flareSheet('flare_skeleton', 'skeleton.png', {
      name: 'CC-BY-3.0',
      author: CLINT,
      title: 'Skeleton Warrior',
      source: 'https://opengameart.org/node/3102',
      notes: 'Rendered in Blender for Flare, sword after a concept sketch by Misha',
    }),
    flareSheet('flare_minotaur', 'minotaur.png', {
      name: 'CC-BY-3.0',
      author: CLINT,
      title: 'Minotaur',
      source: 'https://opengameart.org/content/minotaur',
    }),
    {
      id: 'font_cinzel',
      type: 'font',
      url: 'fonts/cinzel/Cinzel-wght.ttf',
      licence: {
        name: 'OFL-1.1',
        author: 'Natanael Gama, The Cinzel Project Authors',
        title: 'Cinzel',
        source: 'https://github.com/NDISCOVER/Cinzel',
        notes: 'Variable font, unmodified; Reserved Font Name "Cinzel"',
      },
    },
  ],
  sprites: {
    // His portrait raises the storm sceptre (the cast frames).
    zeus: { ...character('zeus', 1, 0.47, 0.72, 77, humanoid()), portrait: 26 },
    // His portrait raises the bident (the cast frames).
    hades: { ...character('hades', 1, 0.47, 0.72, 77, humanoid()), portrait: 26 },
    // His portrait raises the trident (the cast frames).
    poseidon: { ...character('poseidon', 1, 0.47, 0.72, 77, humanoid()), portrait: 26 },
    // Her portrait raises the spear (the cast frames).
    athena: { ...character('athena', 0.95, 0.5, 0.71, 74, humanoid()), portrait: 26 },
    satyr: character('satyr', 1.06, 0.5, 0.71, 83, humanoid()),
    harpy: character('harpy', 0.92, 0.52, 0.7, 72, humanoid()),
    // Flies at body height: one wingbeat for idle and flight.
    stymphalian_bird: character('stymphalian_bird', 0.9, 0.52, 0.59, 70, {
      idle: run(0, 7, 12),
      walk: run(0, 7, 12),
      death: run(8, 13, 10, false),
    }),
    corrupted_hoplite: character('flare_skeleton', 1.1, 0.53, 0.71, 78, humanoid(22, 27)),
    centaur_archer: character('centaur_archer', 0.82, 0.5, 0.68, 74, {
      idle: run(0, 3, 4),
      walk: run(4, 11, 10),
      attack: run(12, 15, 10, false),
      death: run(18, 23, 10, false),
    }),
    minotaur: character('flare_minotaur', 1, 0.52, 0.7, 100, humanoid()),
    fallen_oracle: character('fallen_oracle', 1.04, 0.51, 0.71, 84, {
      ...humanoid(),
      attack: run(24, 27, 8, false),
    }),
    marble_sentinel: character('marble_sentinel', 1.73, 0.52, 0.71, 145, humanoid()),
    cyclops: { ...character('cyclops', 1.6, 0.51, 0.62, 200, humanoid()), portrait: 25 },
    // The intro's fallen defenders.
    ally_warrior: character('ally_warrior', 1, 0.5, 0.73, 77, humanoid()),
    ally_maiden: character('ally_maiden', 1, 0.5, 0.73, 77, humanoid()),
    ally_smith: character('ally_smith', 1, 0.5, 0.73, 77, humanoid()),
  },
};
