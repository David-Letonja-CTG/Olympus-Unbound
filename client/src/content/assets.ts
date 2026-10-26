import type {
  AssetFile,
  AssetLicence,
  AssetManifest,
  SpriteAnimation,
  SpriteAsset,
} from '../engine';

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

/** The Cyclops and Asterion: VWolfdog's Flare troll. */
const TROLL_MODEL = {
  name: 'CC-BY-3.0',
  author: "VWolfdog (on Clint Bellanger's base human mesh)",
  title: 'FLARE Model - Troll',
  source: 'https://opengameart.org/content/flare-model-troll',
} as const;

/** The beasts Flare has no model for are built on Quaternius's CC0 animated wolf (D15, art/blender/README.md). */
const QUATERNIUS_WOLF = {
  name: 'CC0-1.0',
  author: 'Quaternius',
  title: 'Animated Animals Low Poly (Animal Pack Vol.2): Wolf',
  source: 'https://opengameart.org/content/animated-animales-low-poly',
} as const;

/** The marsh's serpents and crabs: methodical pixel's CC0 animated models (D15). */
const METHODICAL_SNAKE = {
  name: 'CC0-1.0',
  author: 'methodical pixel',
  title: 'Snake low poly animated 3D model',
  source: 'https://opengameart.org/content/snake-low-poly-animated-3d-model',
} as const;
const METHODICAL_CRAB = {
  name: 'CC0-1.0',
  author: 'methodical pixel',
  title: 'Crab low poly animated 3D model',
  source: 'https://opengameart.org/content/crab-low-poly-animated-3d-model',
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

/** The beasts' layout (wolf, serpent, crab): idle 0–3, walk 4–11, a fall 12–17. */
const beast = (fps = 10) => ({
  idle: run(0, 3, 4),
  walk: run(4, 11, fps),
  death: run(12, 17, 10, false),
});

/** Recorded sound effects (CC0): the sound player layers them into the game's cues (spec: hud / sound feedback). */
const KENNEY_IMPACT = {
  name: 'CC0-1.0',
  author: 'Kenney (kenney.nl)',
  title: 'Impact Sounds',
  source: 'https://kenney.nl/assets/impact-sounds',
} as const;
const KENNEY_RPG = {
  name: 'CC0-1.0',
  author: 'Kenney (kenney.nl)',
  title: 'RPG Audio',
  source: 'https://kenney.nl/assets/rpg-audio',
} as const;
const SPELL_IMPACTS = {
  name: 'CC0-1.0',
  author: 'lentikula',
  title: 'Basic Spell Impacts [Free/CC0]',
  source: 'https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx',
  notes: 'Cut, faded, normalized and resampled to 22 kHz mono WAV',
} as const;
const RAIN_THUNDER = {
  name: 'CC0-1.0',
  author: 'WuxiaScrub',
  title: 'Rain + Long Thunder',
  source: 'https://opengameart.org/content/rain-long-thunder',
  notes: 'The thunder cut out, faded, normalized and resampled to 22 kHz mono WAV',
} as const;

const variants = (name: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${name}_${String(i).padStart(3, '0')}`);

/** A sound file; its id (the file name) is what the sound player's cues refer to. */
function sound(dir: string, name: string, ext: string, licence: AssetLicence): AssetFile {
  return { id: name, type: 'sound', url: `assets/sounds/${dir}/${name}.${ext}`, licence };
}

const SOUNDS: AssetFile[] = [
  ...[
    ...variants('impactPunch_medium', 5),
    ...variants('impactPunch_heavy', 5),
    ...variants('impactSoft_heavy', 3),
    ...variants('impactSoft_medium', 3),
    ...variants('impactMining', 5),
    ...variants('impactMetal_light', 3),
    ...variants('impactPlate_heavy', 3),
    ...variants('impactBell_heavy', 2),
  ].map((name) => sound('kenney', name, 'ogg', KENNEY_IMPACT)),
  ...['knifeSlice', 'knifeSlice2', 'chop', 'handleCoins', 'handleCoins2', 'metalLatch'].map(
    (name) => sound('kenney', name, 'ogg', KENNEY_RPG),
  ),
  ...[
    'lightning_crack',
    'lightning_bolt',
    'lightning_spark',
    'fire_burst',
    'fire_roar',
    'fire_spark',
    'ice_shimmer',
    'ice_crack',
    'water_crash',
    'water_surge',
    'water_splash',
  ].map((name) => sound('spells', name, 'wav', SPELL_IMPACTS)),
  ...['thunder_clap', 'thunder_roll'].map((name) => sound('thunder', name, 'wav', RAIN_THUNDER)),
];

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
    rendered('cyclops', 256, TROLL_MODEL, 'The Cyclops: the troll with one great eye'),
    rendered('ally_warrior', 128, HERO_MODEL, 'Intro warrior: leather armour, shield, longsword'),
    rendered('ally_maiden', 128, HERO_MODEL, 'Intro maiden: the heroine with a staff'),
    rendered('ally_smith', 128, HERO_MODEL, 'Intro smith: the hero in work clothes'),
    // The Underworld.
    rendered('shade', 128, HERO_MODEL, 'Shade: the hero as a translucent spirit of the dead'),
    rendered('fury', 128, HERO_MODEL, 'Fury: the heroine in blood-dark robes with black wings'),
    rendered(
      'lampad',
      128,
      HERO_MODEL,
      'Lampad: the heroine in midnight robes with a soul-fire torch',
    ),
    rendered(
      'orthrus',
      128,
      QUATERNIUS_WOLF,
      "Orthrus: the wolf with a second head, on the Flare hero file's stage (camera, sun)",
    ),
    rendered(
      'cerberus',
      256,
      QUATERNIUS_WOLF,
      "Cerberus: the wolf with three heads and a mane of spines, on the Flare troll file's stage",
    ),
    // The Lernaean Marsh.
    rendered(
      'swamp_serpent',
      128,
      METHODICAL_SNAKE,
      "Swamp serpent: the snake thickened and recoloured, on the Flare hero file's stage",
    ),
    rendered(
      'giant_crab',
      128,
      METHODICAL_CRAB,
      "Giant crab: the crab with a bronze-red shell, on the Flare hero file's stage",
    ),
    rendered(
      'lamia',
      128,
      HERO_MODEL,
      'Lamia: the heroine to the hips, with a modelled serpent tail',
    ),
    rendered('naiad', 128, HERO_MODEL, 'Naiad: the heroine in sea-green robes with a venom staff'),
    rendered(
      'hydra',
      256,
      METHODICAL_SNAKE,
      "The Hydra: five snakes as necks on a modelled body, on the Flare troll file's stage",
    ),
    // The Aegean Shore.
    rendered('siren', 128, HERO_MODEL, 'Siren: the heroine with white wings and copper hair'),
    rendered(
      'triton',
      128,
      HERO_MODEL,
      'Triton: the hero to the hips with a modelled fish tail and trident',
    ),
    rendered(
      'drowned_sailor',
      128,
      HERO_MODEL,
      'Drowned sailor: the hero sea-bleached and hung with kelp',
    ),
    rendered(
      'scylla',
      256,
      HERO_MODEL,
      "Scylla: the heroine with hound heads cut from Quaternius's CC0 wolf and tentacles from methodical pixel's CC0 snake",
    ),
    // The Labyrinth of Crete.
    rendered(
      'curete',
      128,
      HERO_MODEL,
      "Curete: the hero in leather armour, red and bronze, with a boar's-tusk helmet, shield and spear",
    ),
    rendered(
      'bronze_guardian',
      128,
      HERO_MODEL,
      'Bronze Guardian: the hero in steel armour cast all in bronze, with a molten heart',
    ),
    rendered(
      'snake_priestess',
      128,
      HERO_MODEL,
      'Snake priestess: the heroine in a flounced Minoan skirt with a snake on each arm',
    ),
    rendered(
      'asterion',
      256,
      TROLL_MODEL,
      "Asterion: the troll with a modelled bull's head and his club made a labrys",
    ),
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
    ...SOUNDS,
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
    // The Underworld.
    shade: character('shade', 1, 0.5, 0.73, 77, humanoid()),
    fury: character('fury', 0.95, 0.52, 0.71, 74, humanoid()),
    lampad: character('lampad', 1, 0.51, 0.71, 74, humanoid()),
    // Beasts on the wolf: idle 0–3, walk 4–11 (one stride per cycle), a roll onto the side 12–17.
    orthrus: character('orthrus', 1, 0.5, 0.71, 70, {
      idle: run(0, 3, 4),
      walk: run(4, 11, 10),
      death: run(12, 17, 10, false),
    }),
    cerberus: {
      ...character('cerberus', 1.55, 0.5, 0.64, 250, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 10),
        death: run(12, 17, 10, false),
      }),
      portrait: 0,
    },
    // The Lernaean Marsh.
    swamp_serpent: character('swamp_serpent', 1, 0.5, 0.69, 50, {
      idle: run(0, 3, 4),
      walk: run(4, 11, 10),
      death: run(12, 17, 10, false),
    }),
    giant_crab: character('giant_crab', 1, 0.5, 0.76, 48, {
      idle: run(0, 3, 4),
      walk: run(4, 11, 12),
      death: run(12, 17, 10, false),
    }),
    lamia: character('lamia', 1, 0.5, 0.72, 70, humanoid()),
    naiad: character('naiad', 1, 0.51, 0.71, 74, humanoid()),
    hydra: {
      ...character('hydra', 1.7, 0.51, 0.66, 120, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 8),
        death: run(12, 17, 10, false),
      }),
      portrait: 0,
    },
    // The Aegean Shore.
    siren: character('siren', 0.95, 0.52, 0.71, 74, humanoid()),
    triton: character('triton', 1.05, 0.5, 0.72, 80, humanoid()),
    drowned_sailor: character('drowned_sailor', 1, 0.5, 0.73, 77, humanoid()),
    scylla: { ...character('scylla', 1.6, 0.5, 0.74, 150, humanoid()), portrait: 26 },
    // The Labyrinth of Crete.
    curete: character('curete', 1, 0.5, 0.73, 77, humanoid()),
    bronze_guardian: character('bronze_guardian', 1.3, 0.5, 0.73, 100, humanoid()),
    snake_priestess: character('snake_priestess', 1, 0.5, 0.72, 74, humanoid()),
    asterion: { ...character('asterion', 1.7, 0.51, 0.62, 210, humanoid()), portrait: 25 },
    // The Night of Hecate (spec: seasonal-events): the cast recoloured for the crossroads.
    restless_dead: { ...character('shade', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xa8ffc8 },
    empusa: { ...character('lamia', 1, 0.5, 0.72, 70, humanoid()), recolor: 0xff8ad0 },
    lampad_of_hecate: { ...character('lampad', 1, 0.51, 0.71, 74, humanoid()), recolor: 0xffb060 },
    hound_of_hecate: {
      ...character('orthrus', 1, 0.5, 0.71, 70, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 10),
        death: run(12, 17, 10, false),
      }),
      recolor: 0x7a9a8a,
    },
    hecate: {
      ...character('snake_priestess', 2.3, 0.5, 0.72, 160, humanoid()),
      recolor: 0xd0c0ff,
      portrait: 25,
    },
    hecate_torch_bearer: {
      ...character('lampad', 0.85, 0.51, 0.71, 70, humanoid()),
      recolor: 0xffc070,
    },
    // Mount Othrys (spec: realm-othrys): existing sheets recoloured and rescaled, as the owner chose (D15).
    titan_soldier: {
      ...character('bronze_guardian', 1.3, 0.5, 0.73, 100, humanoid()),
      recolor: 0x8a5a44,
    },
    gigas: { ...character('cyclops', 1.25, 0.51, 0.62, 160, humanoid()), recolor: 0x8a849a },
    ker: { ...character('fury', 0.95, 0.52, 0.71, 74, humanoid()), recolor: 0xff5a5a },
    kampe_scorpion: {
      ...character('giant_crab', 1.15, 0.5, 0.76, 55, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 12),
        death: run(12, 17, 10, false),
      }),
      recolor: 0xc0402a,
    },
    kronos: {
      ...character('marble_sentinel', 2.9, 0.52, 0.71, 240, humanoid()),
      recolor: 0xd8a84a,
      portrait: 25,
    },
    // The winter events (spec: seasonal-events): the cast recoloured and rescaled for each realm (D15).
    // The Longest Night.
    oneiros: { ...character('shade', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xa8b8ff },
    nightmare: { ...character('fury', 0.95, 0.52, 0.71, 74, humanoid()), recolor: 0x9a9aff },
    star_bearer: { ...character('lampad', 1, 0.51, 0.71, 74, humanoid()), recolor: 0xb8d0ff },
    wolf_of_night: { ...character('orthrus', 1, 0.5, 0.71, 70, beast()), recolor: 0x6070b0 },
    // Night herself: the winged siren in violet, her wings silvered like starlight.
    nyx: {
      ...character('siren', 2.3, 0.52, 0.71, 170, humanoid()),
      recolor: 0x8c84ff,
      portrait: 26,
    },
    hypnos: { ...character('siren', 1.05, 0.52, 0.71, 80, humanoid()), recolor: 0xc8d0ff },
    thanatos: { ...character('fury', 1.05, 0.52, 0.71, 80, humanoid()), recolor: 0x8a8a9a },
    // The Winds of Boreas.
    frozen_warrior: { ...character('curete', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xb8dcff },
    snow_harpy: { ...character('harpy', 0.92, 0.52, 0.7, 72, humanoid()), recolor: 0xe8f4ff },
    hyperborean_archer: {
      ...character('centaur_archer', 0.85, 0.5, 0.68, 77, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 10),
        attack: run(12, 15, 10, false),
        death: run(18, 23, 10, false),
      }),
      recolor: 0xc8e4ff,
    },
    frost_gigas: { ...character('cyclops', 1.06, 0.51, 0.62, 135, humanoid()), recolor: 0xb0d4ff },
    boreas: {
      ...character('zeus', 2.3, 0.47, 0.72, 175, humanoid()),
      recolor: 0xd0ecff,
      portrait: 26,
    },
    // The Festival of Eros.
    lovestruck_satyr: {
      ...character('satyr', 1.06, 0.5, 0.71, 83, humanoid()),
      recolor: 0xffc0d8,
    },
    erote: { ...character('siren', 0.8, 0.52, 0.71, 64, humanoid()), recolor: 0xffe0d0 },
    siren_of_paphos: { ...character('siren', 0.95, 0.52, 0.71, 74, humanoid()), recolor: 0xff9ac0 },
    phobos: { ...character('flare_minotaur', 0.92, 0.52, 0.7, 92, humanoid()), recolor: 0xc8505e },
    eros: {
      ...character('siren', 2.2, 0.52, 0.71, 165, humanoid()),
      recolor: 0xffd8e4,
      portrait: 26,
    },
    // The Golden Apples.
    golden_serpent: {
      ...character('swamp_serpent', 1.05, 0.5, 0.69, 52, beast()),
      recolor: 0xf0e070,
    },
    hesperian_harpy: { ...character('harpy', 0.92, 0.52, 0.7, 72, humanoid()), recolor: 0xffd870 },
    hesperid: { ...character('naiad', 1, 0.51, 0.71, 74, humanoid()), recolor: 0xc0f090 },
    garden_colossus: {
      ...character('marble_sentinel', 1.46, 0.52, 0.71, 122, humanoid()),
      recolor: 0xd8d098,
    },
    ladon: {
      ...character('hydra', 1.75, 0.51, 0.66, 124, beast(8)),
      recolor: 0xe0d860,
      portrait: 0,
    },
    // The spring and summer events (spec: seasonal-events).
    // The Revels of Pan.
    revelling_satyr: {
      ...character('satyr', 1.06, 0.5, 0.71, 83, humanoid()),
      recolor: 0xd8b080,
    },
    paniskos: { ...character('satyr', 0.85, 0.5, 0.71, 66, humanoid()), recolor: 0xe8c090 },
    dryad: { ...character('naiad', 1, 0.51, 0.71, 74, humanoid()), recolor: 0x9ae080 },
    silenus: { ...character('satyr', 1.6, 0.5, 0.71, 125, humanoid()), recolor: 0xb09070 },
    pan: {
      ...character('satyr', 2.4, 0.5, 0.71, 185, humanoid()),
      recolor: 0xd8a070,
      portrait: 25,
    },
    // The Hunt of Artemis.
    curete_raider: { ...character('curete', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xd8b898 },
    hunting_hound: { ...character('orthrus', 0.85, 0.5, 0.71, 60, beast()), recolor: 0xc09a70 },
    nymph_of_artemis: {
      ...character('lampad', 1, 0.51, 0.71, 74, humanoid()),
      recolor: 0xd8e8ff,
    },
    wild_centaur: {
      ...character('centaur_archer', 0.97, 0.5, 0.68, 88, {
        idle: run(0, 3, 4),
        walk: run(4, 11, 10),
        attack: run(12, 15, 10, false),
        death: run(18, 23, 10, false),
      }),
      recolor: 0xa07a5a,
    },
    calydonian_boar: {
      ...character('orthrus', 2.6, 0.5, 0.71, 180, beast(8)),
      recolor: 0x7a5a48,
      portrait: 0,
    },
    // Midsummer of Apollo.
    python_spawn: {
      ...character('swamp_serpent', 1.05, 0.5, 0.69, 52, beast()),
      recolor: 0x9ab060,
    },
    sunbird: {
      ...character('stymphalian_bird', 0.9, 0.52, 0.59, 70, {
        idle: run(0, 7, 12),
        walk: run(0, 7, 12),
        death: run(8, 13, 10, false),
      }),
      recolor: 0xffe080,
    },
    mad_pythia: {
      ...character('fallen_oracle', 1.04, 0.51, 0.71, 84, {
        ...humanoid(),
        attack: run(24, 27, 8, false),
      }),
      recolor: 0xffe8b0,
    },
    tripod_guardian: {
      ...character('bronze_guardian', 1.4, 0.5, 0.73, 108, humanoid()),
      recolor: 0xffd890,
    },
    python: {
      ...character('swamp_serpent', 4, 0.5, 0.69, 200, beast(8)),
      recolor: 0xa0b050,
      portrait: 0,
    },
    // The Theft of Fire.
    ash_shade: { ...character('shade', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xffb890 },
    cinder_harpy: { ...character('harpy', 0.92, 0.52, 0.7, 72, humanoid()), recolor: 0xff9060 },
    kabeiros: { ...character('ally_smith', 1, 0.5, 0.73, 77, humanoid()), recolor: 0xffc090 },
    forge_cyclops: {
      ...character('cyclops', 1.06, 0.51, 0.62, 135, humanoid()),
      recolor: 0xe09070,
    },
    caucasian_eagle: {
      ...character('stymphalian_bird', 2.6, 0.52, 0.59, 200, {
        idle: run(0, 7, 12),
        walk: run(0, 7, 12),
        death: run(8, 13, 10, false),
      }),
      recolor: 0xd8a060,
      portrait: 0,
    },
  },
};
