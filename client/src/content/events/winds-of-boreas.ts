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
  summon,
  sweep,
  walls,
} from './shared';

/**
 * The Winds of Boreas (deep winter; spec: seasonal-events / the winds of boreas): the North Wind comes down from his
 * halls in Thrace, and the frozen lakes slide underfoot.
 */
const WINDS_OF_BOREAS: EventDefinition = {
  id: 'winds_of_boreas',
  name: 'The Winds of Boreas',
  tagline: 'The North Wind comes down from Thrace. Hold your ground.',
  window: { from: '01-10', to: '01-31' },
  accent: 0x9ad8ff,
  currency: { name: 'Hailstones', sprite: 'hailstone', chance: 0.02, elite: 3, boss: 15 },
};

const BOREAS_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'frozen_warrior',
    name: 'Frozen Warrior',
    health: 32,
    speed: 72,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0.05,
    behavior: { type: 'chaser', jitter: 0.25 },
    visual: { sprite: 'frozen_warrior', color: 0xb0d8ff },
  },
  {
    id: 'snow_harpy',
    name: 'Snow Harpy',
    health: 42,
    speed: 132,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.65 },
    visual: { sprite: 'snow_harpy', color: 0xe0f0ff },
  },
  {
    id: 'hyperborean_archer',
    name: 'Hyperborean Archer',
    health: 50,
    speed: 86,
    damage: 6,
    radius: 16,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 320,
      cooldown: 2,
      projectileSpeed: 340,
      projectileDamage: 9,
      projectileRadius: 7,
      projectileSprite: 'ice_shard',
    },
    visual: { sprite: 'hyperborean_archer', color: 0xc0e0ff },
  },
  {
    id: 'frost_gigas',
    name: 'Frost Gigas',
    health: 130,
    speed: 62,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.3, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'frost_gigas', color: 0xa8d0ff },
  },
];

/**
 * Boreas, the North Wind (spec: seasonal-events / the winds of boreas): he rides the gale along marked lines; a charge
 * into a wall stops and dazes him. Hail and biting wind fill the pauses.
 */
const BOREAS: BossDefinition = {
  id: 'boreas',
  name: 'Boreas',
  title: 'The North Wind, Lord of Winter',
  health: 13000,
  radius: 46,
  speed: 72,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.4,
  chargeStun: 2,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Boreas descends on the gale!',
      attacks: [
        charge('the_gale', 1.1, 560, 90, 32, 900),
        boulders('hail', 1.2, 64, 26, 6, 260),
        sweep('biting_wind', 0.9, 240, 1, 26, 3, 0.45),
        summon('call_the_harpies', 'snow_harpy', 4),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'Winter closes in!',
      attacks: [
        walls('walls_of_winter', 1.3, 9, 26, [190, 310], 5, 0.25),
        charge('the_gale', 1, 620, 96, 34, 980),
        boulders('hail', 1.1, 64, 28, 8, 300),
        charge('the_gale', 1, 620, 96, 34, 980),
        sweep('biting_wind', 0.8, 260, 1.1, 28, 4, 0.4),
      ],
    },
  ],
  visual: { sprite: 'boreas', color: 0xc8e8ff },
};

/** The Peaks of Thrace: bare peaks in a blizzard, frozen lakes, hot springs and the ice throne of Boreas. */
const PEAKS_OF_THRACE: RealmDefinition = {
  id: 'peaks_of_thrace',
  name: 'The Peaks of Thrace',
  event: 'winds_of_boreas',
  description:
    'Bare peaks in the teeth of the North Wind. The lakes are frozen, the springs steam, and Boreas sits on his ice throne.',
  backgroundColor: 0x0c121c,
  tips: [
    'Boreas charges along the line he marks. Step aside, or lure him into a wall: it dazes him.',
    'Below half his strength winter closes in: stone rings rise round him with five ways out.',
    'The frozen lakes slide underfoot. Let go and you keep going.',
    'The hot springs heal a god who stands in them, until they run dry.',
    'The Frost Gigantes are slow, but nothing pushes them back.',
    'The Hyperborean Archers shoot ice from afar. Close in on them.',
    'The Winds of Boreas last until January 31. Their items appear only while they last.',
  ],
  // A pale, windy night: blue-white snow, grey rock and the steam of the springs.
  atmosphere: {
    ambient: 0x7888a8,
    fog: 0xb0c0d8,
    particles: 0xe8f4ff,
    ambience: {
      weather: { kind: 'snow', rate: 16, color: 0xf4f8ff, wind: 70 },
      clouds: 0.2,
      glints: { terrain: ['frozen_lake'], color: 0xe0f0ff },
      smoke: 0xd8e0e8,
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'snowfield', color: 0xb0bac8, texture: { kind: 'ash', strength: 0.4 } },
        { id: 'bare_rock', color: 0x6a7080, texture: { kind: 'cracks', strength: 0.7 } },
        // The frozen lakes slide (spec: arena-generation / footing).
        {
          id: 'frozen_lake',
          color: 0x7a98bc,
          texture: { kind: 'cracks', size: 90, strength: 0.5 },
          footing: { grip: 0.3 },
        },
        { id: 'icy_slabs', color: 0x8a94a8, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x1a1e28 },
      ],
      noiseScale: 10,
      bands: [
        { below: 0.26, terrain: 'frozen_lake' },
        { below: 0.7, terrain: 'snowfield' },
        { below: 1.01, terrain: 'bare_rock' },
      ],
      plaza: 'icy_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 64,
        visual: { sprite: 'ice_throne', color: 0xa8d0f0 },
        light: { radius: 260, color: 0xa8e0ff, intensity: 0.9, flicker: 0.1 },
      },
      { id: 'pine', radius: 18, visual: { sprite: 'snowy_pine', color: 0x1e3a2e }, sway: 0.04 },
      { id: 'ice_spire', radius: 16, visual: { sprite: 'ice_spire', color: 0xc8e8ff } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x7a8090 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xc0c8d8 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x8a92a2 } },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xd0d8e4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xc0c8d4 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xb0b8c8 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        // Gentler than other realms' fires: the snow throws the light back.
        light: { radius: 190, color: 0xffa050, intensity: 0.65, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'icy_slabs' },
      {
        type: 'ring',
        kind: 'ice_spire',
        count: [4, 6],
        radius: [110, 170],
        pieces: 9,
        missingChance: 0.25,
        plazaTerrain: 'icy_slabs',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [480, 320],
        spacing: 90,
        fallenChance: 0.35,
        missingChance: 0.15,
      },
      {
        type: 'walls',
        kind: 'wall',
        count: [3, 5],
        length: [180, 320],
        spacing: 66,
        missingChance: 0.3,
      },
      { type: 'cluster', kind: 'pine', count: [6, 9], size: [3, 5], spread: 90 },
      { type: 'cluster', kind: 'ice_spire', count: [5, 8], size: [2, 4], spread: 70 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'pine', density: 4, terrain: ['snowfield'] },
      { kind: 'rock', density: 5, terrain: ['bare_rock', 'snowfield'] },
      { kind: 'ice_spire', density: 2 },
      { kind: 'statue', density: 0.4 },
    ],
    props: {
      kinds: [
        { id: 'frost_urn', radius: 14, visual: { sprite: 'prop_urn_frost', color: 0xa8c0e0 } },
        { id: 'crate', radius: 15, visual: { sprite: 'prop_crate', color: 0x8a6a48 } },
      ],
      clusters: 10,
    },
    // Hot springs in the snow heal (spec: arena-generation / map helpers).
    features: [
      {
        type: 'spring',
        count: 3,
        radius: 44,
        heal: 30,
        pool: 120,
        refill: 45,
        visual: { sprite: 'hot_spring', color: 0x8ad0e8 },
        light: { radius: 150, color: 0x9ae0ff, intensity: 0.6, flicker: 0.1 },
      },
    ],
    decorations: [
      {
        id: 'snow_drift',
        terrain: ['snowfield'],
        density: 80,
        visual: { sprite: 'snow_drift', color: 0xf0f4ff },
      },
      {
        id: 'ice_shards',
        terrain: ['frozen_lake', 'icy_slabs'],
        density: 45,
        visual: { sprite: 'ice_shards', color: 0xc8e0ff },
      },
      {
        id: 'grass_tuft',
        terrain: ['bare_rock'],
        density: 30,
        visual: { sprite: 'grass_tuft', color: 0x8a8a70 },
        sway: 0.12,
      },
    ],
  },
  ...hostRealm(
    {
      fodder: 'frozen_warrior',
      quick: 'snow_harpy',
      ranged: 'hyperborean_archer',
      heavy: 'frost_gigas',
    },
    'boreas',
  ),
};

/** Offered only in the Winds of Boreas (spec: seasonal-events / event items). */
const BREATH_OF_BOREAS: WeaponDefinition = {
  id: 'breath_of_boreas',
  name: 'Breath of Boreas',
  description: 'Gusts of the North Wind pierce the horde and chill what they touch.',
  event: 'winds_of_boreas',
  element: 'physical',
  behavior: 'projectile',
  base: {
    damage: 12,
    cooldown: 1.2,
    amount: 1,
    speed: 420,
    pierce: 4,
    size: 16,
    range: 420,
    arc: 0.35,
    duration: 1.4,
    knockback: 90,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'slow', chance: 0.5, duration: 1.6, potency: 0.4 }],
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: '+1 gust.', amount: 1 },
    { text: 'Wider gusts that pierce more.', size: 4, pierce: 2 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.15 },
    { text: '+1 gust.', amount: 1 },
  ],
  visual: { sprite: 'breath_of_boreas', color: 0xd0f0ff, projectile: 'gust' },
};

const CLOAK_OF_BOREAS: RelicDefinition = {
  id: 'cloak_of_boreas',
  name: 'Cloak of the North Wind',
  event: 'winds_of_boreas',
  description: '+12% move speed, +1 armour.',
  modifiers: [
    { stat: 'moveSpeed', percent: 0.12 },
    { stat: 'armor', flat: 1 },
  ],
  visual: { sprite: 'cloak_of_boreas', color: 0xb0e0ff },
};

export const BOREAS_PACK: EventPack = {
  event: WINDS_OF_BOREAS,
  realm: PEAKS_OF_THRACE,
  boss: BOREAS,
  enemies: BOREAS_ENEMIES,
  weapons: [BREATH_OF_BOREAS],
  relics: [CLOAK_OF_BOREAS],
  rewards: eventShop(
    'winds_of_boreas',
    {
      id: 'north_wind',
      name: 'The North Wind',
      description: '+4% move speed in every run.',
      modifiers: [{ stat: 'moveSpeed', percent: 0.04 }],
      sprite: 'hailstone',
    },
    { id: 'windcloak', name: 'Windcloak', item: CLOAK_OF_BOREAS },
    { id: 'galecaller', name: 'Galecaller', item: BREATH_OF_BOREAS },
  ),
  achievements: eventAchievements(
    'peaks_of_thrace',
    {
      id: 'winters_end',
      name: 'Winter’s End',
      description: 'Defeat Boreas on the Peaks of Thrace.',
      sprite: 'cloak_of_boreas',
    },
    {
      id: 'frostbound',
      name: 'Frost-Bound',
      description: 'Survive 10 minutes from the Peaks of Thrace.',
      sprite: 'breath_of_boreas',
    },
  ),
};
