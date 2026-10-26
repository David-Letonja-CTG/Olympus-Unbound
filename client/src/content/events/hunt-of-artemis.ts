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
  charge,
  EventPack,
  eventAchievements,
  eventShop,
  hostRealm,
  MAP_FRAME,
  slam,
  summon,
  walls,
} from './shared';

/**
 * The Hunt of Artemis (May Day and the spring in bloom; spec: seasonal-events / the hunt of artemis): Artemis has
 * loosed the great boar on Calydon, and the heroes gather for the hunt under her moon.
 */
const HUNT_OF_ARTEMIS: EventDefinition = {
  id: 'hunt_of_artemis',
  name: 'The Hunt of Artemis',
  tagline: 'Artemis has loosed the great boar on Calydon. Join the hunt.',
  window: { from: '05-01', to: '05-14' },
  accent: 0xc8d8f0,
  currency: {
    name: 'Silver arrowheads',
    sprite: 'silver_arrowhead',
    chance: 0.02,
    elite: 3,
    boss: 15,
  },
};

const ARTEMIS_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'curete_raider',
    name: 'Curete Raider',
    health: 32,
    speed: 76,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0.05,
    behavior: { type: 'chaser', jitter: 0.3 },
    visual: { sprite: 'curete_raider', color: 0xc8a888 },
  },
  {
    id: 'hunting_hound',
    name: 'Hunting Hound',
    health: 38,
    speed: 140,
    damage: 8,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'hunting_hound', color: 0xb08860 },
  },
  {
    id: 'nymph_of_artemis',
    name: 'Nymph of Artemis',
    health: 46,
    speed: 86,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 330,
      cooldown: 1.8,
      projectileSpeed: 380,
      projectileDamage: 9,
      projectileRadius: 7,
      projectileSprite: 'moon_arrow',
    },
    visual: { sprite: 'nymph_of_artemis', color: 0xd0e4ff },
  },
  {
    id: 'wild_centaur',
    name: 'Wild Centaur',
    health: 100,
    speed: 100,
    damage: 14,
    radius: 19,
    xp: 4,
    gold: { chance: 0.25, amount: 4 },
    knockbackResist: 0.5,
    behavior: {
      type: 'charger',
      triggerRange: 340,
      windup: 0.7,
      dashSpeed: 540,
      dashDuration: 0.6,
      cooldown: 3,
    },
    visual: { sprite: 'wild_centaur', color: 0x8a6a4a },
  },
];

/**
 * The Calydonian Boar (spec: seasonal-events / the hunt of artemis): it charges down marked lines, gores the ground
 * round it and brings trees down; a charge into a wall dazes it longer than any other beast.
 */
const CALYDONIAN_BOAR: BossDefinition = {
  id: 'calydonian_boar',
  name: 'The Calydonian Boar',
  title: 'Wrath of Artemis, Ravager of Calydon',
  health: 15000,
  radius: 50,
  speed: 70,
  contactDamage: 34,
  xp: 0,
  gold: 400,
  attackPause: 1.3,
  chargeStun: 3,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'The Calydonian Boar bursts from the thicket!',
      attacks: [
        charge('the_charge', 1.1, 600, 100, 34, 940),
        slam('goring_tusks', 0.9, 170, 30),
        boulders('falling_trees', 1.3, 80, 28, 4, 280),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.3,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'The boar tramples the fields!',
      attacks: [
        walls('the_thicket', 1.3, 9, 26, [200, 320], 3, 0.3),
        charge('the_charge', 1, 660, 104, 36, 1020),
        charge('the_charge', 0.9, 660, 104, 36, 1020),
        slam('goring_tusks', 0.8, 190, 32),
        summon('call_the_hunters', 'curete_raider', 6),
      ],
    },
  ],
  visual: { sprite: 'calydonian_boar', color: 0x6a4a3a },
};

/** The Forest of Calydon: a spring forest in flower under the moon, Artemis' stag shrine in a glade. */
const FOREST_OF_CALYDON: RealmDefinition = {
  id: 'forest_of_calydon',
  name: 'The Forest of Calydon',
  event: 'hunt_of_artemis',
  description:
    'A forest in May flower under Artemis’ moon, its fields trampled by the great boar. The heroes of Greece gather for the hunt.',
  backgroundColor: 0x0c1210,
  tips: [
    'The boar charges along the line it marks. Lure it into a wall: it stands dazed for 3 seconds.',
    'Below half its strength the boar tramples the fields: a thicket rises round it with three ways out, and it charges twice.',
    'The Hunting Hounds are the quickest things in the forest.',
    'The Nymphs of Artemis shoot moon-silver arrows from afar. Close in on them.',
    'The Wild Centaurs stop before they charge. When they stop, move.',
    'The Hunt of Artemis lasts until May 14. Its items appear only while it lasts.',
  ],
  // A silver moonlit night in a flowering forest.
  atmosphere: {
    ambient: 0x7a8aa0,
    fog: 0x98a8b8,
    particles: 0xf0f4ff,
    ambience: {
      weather: { kind: 'fireflies', rate: 6, color: 0xe0f0a0, wind: 6 },
      clouds: 0.15,
      wildlife: { kind: 'bird', sprite: 'dove', count: 5 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'meadow', color: 0x546e44, texture: { kind: 'grass' } },
        { id: 'forest_floor', color: 0x4e4434, texture: { kind: 'earth' } },
        { id: 'moss', color: 0x3a5434, texture: { kind: 'moss' } },
        { id: 'trampled_mud', color: 0x5a4a38, texture: { kind: 'mud', strength: 0.7 } },
        { id: 'moonlit_slabs', color: 0x8a8e98, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x10140e },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.22, terrain: 'trampled_mud' },
        { below: 0.5, terrain: 'meadow' },
        { below: 0.78, terrain: 'moss' },
        { below: 1.01, terrain: 'forest_floor' },
      ],
      plaza: 'moonlit_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 60,
        visual: { sprite: 'stag_shrine', color: 0xb0b4c0 },
        light: { radius: 250, color: 0xd0e0ff, intensity: 0.85, flicker: 0.1 },
      },
      { id: 'oak', radius: 20, visual: { sprite: 'oak_tree', color: 0x3e5a2e }, sway: 0.03 },
      {
        id: 'blossom',
        radius: 18,
        visual: { sprite: 'blossom_tree', color: 0x6a8a52 },
        sway: 0.03,
      },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x7a7a74 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xc8ccd4 } },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xd8dce4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xc8ccd4 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xc0c4cc } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x9a9a94 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 240, color: 0xffb060, intensity: 0.95, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'moonlit_slabs' },
      {
        type: 'ring',
        kind: 'statue',
        count: [3, 5],
        radius: [110, 160],
        pieces: 7,
        missingChance: 0.3,
        plazaTerrain: 'moonlit_slabs',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [460, 300],
        spacing: 90,
        fallenChance: 0.3,
        missingChance: 0.15,
      },
      {
        type: 'walls',
        kind: 'wall',
        count: [2, 4],
        length: [160, 280],
        spacing: 66,
        missingChance: 0.35,
      },
      { type: 'cluster', kind: 'oak', count: [10, 14], size: [3, 6], spread: 100 },
      { type: 'cluster', kind: 'blossom', count: [5, 8], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'brazier', count: 5, offset: 18 },
    ],
    scatter: [
      { kind: 'oak', density: 12, terrain: ['moss', 'forest_floor'] },
      { kind: 'blossom', density: 5, terrain: ['meadow'] },
      { kind: 'rock', density: 3 },
    ],
    props: {
      kinds: [
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
        { id: 'crate', radius: 15, visual: { sprite: 'prop_crate', color: 0x8a6238 } },
      ],
      clusters: 12,
    },
    features: [
      {
        type: 'spring',
        count: 2,
        radius: 44,
        heal: 30,
        pool: 120,
        refill: 45,
        visual: { sprite: 'healing_spring', color: 0x8affe0 },
        light: { radius: 150, color: 0x8affe0, intensity: 0.6, flicker: 0.1 },
      },
    ],
    decorations: [
      {
        id: 'wildflowers',
        terrain: ['meadow'],
        density: 80,
        visual: { sprite: 'wildflowers', color: 0xf0e070 },
      },
      {
        id: 'ferns',
        terrain: ['moss', 'forest_floor'],
        density: 60,
        visual: { sprite: 'ferns', color: 0x4a7a3a },
        sway: 0.12,
      },
      {
        id: 'hoofprints',
        terrain: ['trampled_mud'],
        density: 50,
        visual: { sprite: 'mud_pebbles', color: 0x3a3024 },
      },
      {
        id: 'grass_tuft',
        terrain: ['meadow', 'moss'],
        density: 50,
        visual: { sprite: 'grass_tuft', color: 0x7a9a5a },
        sway: 0.15,
      },
    ],
  },
  ...hostRealm(
    {
      fodder: 'curete_raider',
      quick: 'hunting_hound',
      ranged: 'nymph_of_artemis',
      heavy: 'wild_centaur',
    },
    'calydonian_boar',
  ),
};

/** Offered only in the Hunt of Artemis (spec: seasonal-events / event items). */
const MOONBOW: WeaponDefinition = {
  id: 'moonbow_of_artemis',
  name: 'Moonbow of Artemis',
  description: 'Silver arrows fly true to the nearest foe and pierce, striking deep and often.',
  event: 'hunt_of_artemis',
  element: 'physical',
  behavior: 'projectile',
  base: {
    damage: 15,
    cooldown: 1.1,
    amount: 1,
    speed: 720,
    pierce: 2,
    size: 8,
    range: 560,
    arc: 0.12,
    duration: 1.2,
    knockback: 60,
    chains: 0,
    critChance: 0.15,
    homing: 0,
  },
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: '+1 arrow.', amount: 1 },
    { text: '+10% critical chance, pierces more.', critChance: 0.1, pierce: 2 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.2 },
    { text: '+1 arrow.', amount: 1 },
  ],
  visual: { sprite: 'moonbow_of_artemis', color: 0xd8e4ff, projectile: 'moon_arrow' },
};

const HIDE_OF_THE_BOAR: RelicDefinition = {
  id: 'hide_of_the_boar',
  name: 'Hide of the Boar',
  event: 'hunt_of_artemis',
  description: '+2 armour, +10 max health.',
  modifiers: [
    { stat: 'armor', flat: 2 },
    { stat: 'maxHealth', flat: 10 },
  ],
  visual: { sprite: 'hide_of_the_boar', color: 0x8a6a4a },
};

export const ARTEMIS_PACK: EventPack = {
  event: HUNT_OF_ARTEMIS,
  realm: FOREST_OF_CALYDON,
  boss: CALYDONIAN_BOAR,
  enemies: ARTEMIS_ENEMIES,
  weapons: [MOONBOW],
  relics: [HIDE_OF_THE_BOAR],
  rewards: eventShop(
    'hunt_of_artemis',
    {
      id: 'huntress_eye',
      name: 'Eye of the Huntress',
      description: '+3% critical chance in every run.',
      modifiers: [{ stat: 'critChance', flat: 0.03 }],
      sprite: 'silver_arrowhead',
    },
    { id: 'boarskin', name: 'Boarskin', item: HIDE_OF_THE_BOAR },
    { id: 'moonstruck', name: 'Moonstruck', item: MOONBOW },
  ),
  achievements: eventAchievements(
    'forest_of_calydon',
    {
      id: 'meleagers_prize',
      name: 'Meleager’s Prize',
      description: 'Bring down the Calydonian Boar.',
      sprite: 'hide_of_the_boar',
    },
    {
      id: 'huntress',
      name: 'Huntress',
      description: 'Survive 10 minutes from the Forest of Calydon.',
      sprite: 'moonbow_of_artemis',
    },
  ),
};
