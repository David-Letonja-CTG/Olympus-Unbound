import type {
  BossDefinition,
  EnemyDefinition,
  EventDefinition,
  RealmDefinition,
  RelicDefinition,
  WeaponDefinition,
} from '../../engine';
import {
  boulders,
  devour,
  EventPack,
  eventAchievements,
  eventShop,
  hostRealm,
  MAP_FRAME,
  summon,
  sweep,
  walls,
} from './shared';

/**
 * Midsummer of Apollo (the summer solstice; spec: seasonal-events / midsummer of apollo): the longest day at Delphi,
 * where Python, the serpent of the earth, rises again from the chasm under the oracle.
 */
const MIDSUMMER_OF_APOLLO: EventDefinition = {
  id: 'midsummer_of_apollo',
  name: 'Midsummer of Apollo',
  tagline: 'The longest day at Delphi. Python rises from the chasm again.',
  window: { from: '06-15', to: '06-28' },
  accent: 0xffc84a,
  // Laurel leaves: Apollo's crown, the victor's prize at the Pythian Games.
  currency: { name: 'Laurel leaves', sprite: 'laurel_leaf', chance: 0.02, elite: 3, boss: 15 },
};

const APOLLO_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'python_spawn',
    name: 'Spawn of Python',
    health: 30,
    speed: 78,
    damage: 7,
    radius: 13,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'python_spawn', color: 0x8aa050 },
  },
  {
    id: 'sunbird',
    name: 'Sunbird',
    health: 40,
    speed: 134,
    damage: 9,
    radius: 14,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.6 },
    visual: { sprite: 'sunbird', color: 0xffd060 },
  },
  {
    id: 'mad_pythia',
    name: 'Mad Pythia',
    health: 46,
    speed: 82,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 300,
      cooldown: 1.9,
      projectileSpeed: 310,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'sun_bolt',
    },
    visual: { sprite: 'mad_pythia', color: 0xffe0a0 },
  },
  {
    id: 'tripod_guardian',
    name: 'Tripod Guardian',
    health: 130,
    speed: 60,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'tripod_guardian', color: 0xd8b060 },
  },
];

/**
 * Python, the serpent of Delphi (spec: seasonal-events / midsummer of apollo): it coils and draws the gods into its
 * maw, spits venom on circles and lashes with its tail; below half health the chasm's rocks rise round it.
 */
const PYTHON: BossDefinition = {
  id: 'python',
  name: 'Python',
  title: 'Serpent of the Earth, Warden of the Chasm',
  health: 15000,
  radius: 50,
  speed: 64,
  contactDamage: 32,
  xp: 0,
  gold: 400,
  attackPause: 1.5,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Python rises from the chasm of Delphi!',
      attacks: [
        devour('the_coils', 1.6, 340, 170, 120, 34),
        boulders('venom_spit', 1.2, 70, 26, 6, 260),
        sweep('tail_lash', 0.9, 240, 1.1, 26, 3, 0.4),
        summon('call_the_spawn', 'python_spawn', 6),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'The earth splits under Delphi!',
      attacks: [
        walls('rocks_of_the_chasm', 1.3, 9, 26, [190, 310], 4, 0.3),
        devour('the_coils', 1.4, 380, 200, 130, 38),
        boulders('venom_spit', 1.1, 70, 28, 8, 300),
        sweep('tail_lash', 0.8, 260, 1.2, 28, 4, 0.35),
      ],
    },
  ],
  visual: { sprite: 'python', color: 0x8a9a40 },
};

/** The Slopes of Delphi: sun-baked terraces, laurels and the tripod over the oracle's chasm. */
const SLOPES_OF_DELPHI: RealmDefinition = {
  id: 'slopes_of_delphi',
  name: 'The Slopes of Delphi',
  event: 'midsummer_of_apollo',
  description:
    'Sun-baked terraces under Mount Parnassus on the longest day of the year. Laurels shade the sacred way, and the chasm breathes.',
  backgroundColor: 0x1a160c,
  tips: [
    'Python draws every god in its ring toward its maw. Run, or dash out, before it strikes.',
    'Below half its strength the earth splits: rocks rise round it with four ways out.',
    'The columns of Delphi lean. Walk near one and it falls along the line it marks.',
    'The Sunbirds are quick. Keep moving.',
    'The Mad Pythiai throw sunfire from afar. Close in on them.',
    'The Tripod Guardians are slow, but nothing pushes them back.',
    'Midsummer of Apollo lasts until June 28. Its items appear only while it lasts.',
  ],
  // A warm, bright summer dusk: golden stone, dust in the air.
  atmosphere: {
    ambient: 0xb0a080,
    fog: 0xd0b890,
    particles: 0xffe090,
    ambience: {
      weather: { kind: 'dust', rate: 6, color: 0xffe0a0, wind: 10 },
      clouds: 0.12,
      wildlife: { kind: 'bird', sprite: 'dove', count: 6 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'dry_grass', color: 0x8a8448, texture: { kind: 'grass', strength: 0.7 } },
        { id: 'limestone', color: 0xa8a08a, texture: { kind: 'cracks', strength: 0.5 } },
        { id: 'dust', color: 0x8a7656, texture: { kind: 'earth' } },
        { id: 'sacred_way', color: 0xc0b498, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x1a160e },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.36, terrain: 'limestone' },
        { below: 0.72, terrain: 'dry_grass' },
        { below: 1.01, terrain: 'dust' },
      ],
      plaza: 'sacred_way',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 62,
        visual: { sprite: 'delphic_tripod', color: 0xd8b060 },
        light: { radius: 260, color: 0xffd080, intensity: 0.9, flicker: 0.25 },
      },
      {
        id: 'laurel',
        radius: 18,
        visual: { sprite: 'laurel_tree', color: 0x4a6a32 },
        sway: 0.03,
      },
      {
        id: 'olive_tree',
        radius: 18,
        visual: { sprite: 'olive_tree', color: 0x4e623a },
        sway: 0.03,
      },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xe8e2d4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xd8d0bf } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xe0dac8 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xd0c8b4 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0xc0b8a4 } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x9a9284 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 230, color: 0xffb060, intensity: 0.85, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'sacred_way' },
      {
        type: 'ring',
        kind: 'column',
        count: [4, 6],
        radius: [120, 180],
        pieces: 10,
        missingChance: 0.3,
        plazaTerrain: 'sacred_way',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [500, 320],
        spacing: 90,
        fallenChance: 0.25,
        missingChance: 0.12,
      },
      {
        type: 'walls',
        kind: 'wall',
        count: [3, 5],
        length: [180, 320],
        spacing: 66,
        missingChance: 0.3,
      },
      { type: 'cluster', kind: 'laurel', count: [8, 12], size: [2, 5], spread: 90 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'laurel', density: 7, terrain: ['dry_grass', 'dust'] },
      { kind: 'olive_tree', density: 3 },
      { kind: 'rock', density: 4, terrain: ['limestone'] },
      { kind: 'statue', density: 0.5 },
    ],
    props: {
      kinds: [
        { id: 'amphora', radius: 14, visual: { sprite: 'prop_amphora', color: 0xb0623a } },
        {
          id: 'golden_amphora',
          radius: 14,
          visual: { sprite: 'prop_amphora_gold', color: 0xd8b04a },
        },
      ],
      clusters: 12,
    },
    // The columns of Delphi lean (spec: arena-generation / map hazards).
    features: [
      {
        type: 'teetering',
        kind: 'column',
        chance: 0.18,
        trigger: 120,
        length: 150,
        width: 44,
        damage: 22,
        monsters: 0.6,
        windup: 1.1,
        stump: 'broken_column',
        shaft: 'column_shaft',
      },
    ],
    decorations: [
      {
        id: 'grass_tuft',
        terrain: ['dry_grass'],
        density: 70,
        visual: { sprite: 'grass_tuft', color: 0xa8a060 },
        sway: 0.15,
      },
      {
        id: 'marble_shards',
        terrain: ['limestone', 'sacred_way'],
        density: 40,
        visual: { sprite: 'marble_shards', color: 0xe0dccc },
      },
      {
        id: 'pebbles',
        terrain: ['dust', 'limestone'],
        density: 40,
        visual: { sprite: 'pebbles', color: 0x9a9080 },
      },
      {
        id: 'wildflowers',
        terrain: ['dry_grass'],
        density: 30,
        visual: { sprite: 'wildflowers', color: 0xf0e070 },
      },
    ],
  },
  ...hostRealm(
    { fodder: 'python_spawn', quick: 'sunbird', ranged: 'mad_pythia', heavy: 'tripod_guardian' },
    'python',
  ),
};

/** Offered only at Midsummer of Apollo (spec: seasonal-events / event items). */
const RAYS_OF_APOLLO: WeaponDefinition = {
  id: 'rays_of_apollo',
  name: 'Rays of Apollo',
  description: 'A fan of sun-rays at the nearest foe, setting what they pierce alight.',
  event: 'midsummer_of_apollo',
  element: 'fire',
  behavior: 'projectile',
  base: {
    damage: 9,
    cooldown: 1.4,
    amount: 3,
    speed: 560,
    pierce: 1,
    size: 9,
    range: 480,
    arc: 0.5,
    duration: 1,
    knockback: 30,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'burn', chance: 0.3, duration: 2, potency: 0.3 }],
  levels: [
    { text: '+4 damage.', damage: 4 },
    { text: '+1 ray.', amount: 1 },
    { text: 'Rays pierce one more, burn more often.', pierce: 1 },
    { text: '+5 damage, faster.', damage: 5, cooldown: -0.25 },
    { text: '+2 rays.', amount: 2 },
  ],
  visual: { sprite: 'rays_of_apollo', color: 0xffc84a, projectile: 'sun_ray' },
};

const LYRE_OF_APOLLO: RelicDefinition = {
  id: 'lyre_of_apollo',
  name: 'Lyre of Apollo',
  event: 'midsummer_of_apollo',
  description: '+10% XP, +0.5 health per second.',
  modifiers: [
    { stat: 'xpGain', flat: 0.1 },
    { stat: 'regen', flat: 0.5 },
  ],
  visual: { sprite: 'lyre_of_apollo', color: 0xffd060 },
};

export const APOLLO_PACK: EventPack = {
  event: MIDSUMMER_OF_APOLLO,
  realm: SLOPES_OF_DELPHI,
  boss: PYTHON,
  enemies: APOLLO_ENEMIES,
  weapons: [RAYS_OF_APOLLO],
  relics: [LYRE_OF_APOLLO],
  rewards: eventShop(
    'midsummer_of_apollo',
    {
      id: 'midsummer_sun',
      name: 'Midsummer Sun',
      description: '+3% damage in every run.',
      modifiers: [{ stat: 'might', flat: 0.03 }],
      sprite: 'laurel_leaf',
    },
    { id: 'lyrist', name: 'Lyrist', item: LYRE_OF_APOLLO },
    { id: 'sunbearer', name: 'Sunbearer', item: RAYS_OF_APOLLO },
  ),
  achievements: eventAchievements(
    'slopes_of_delphi',
    {
      id: 'pythian_victor',
      name: 'Pythian Victor',
      description: 'Slay Python at Delphi.',
      sprite: 'rays_of_apollo',
    },
    {
      id: 'longest_day',
      name: 'The Longest Day',
      description: 'Survive 10 minutes from the Slopes of Delphi.',
      sprite: 'lyre_of_apollo',
    },
  ),
};
