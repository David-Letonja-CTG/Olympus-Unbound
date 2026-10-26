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
  lash,
  MAP_FRAME,
  summon,
  sweep,
} from './shared';

/**
 * The Festival of Eros (Valentine's Day; spec: seasonal-events / the festival of eros): Eros looses his arrows over
 * his mother's garden at Paphos, where she rose from the foam.
 */
const FESTIVAL_OF_EROS: EventDefinition = {
  id: 'festival_of_eros',
  name: 'The Festival of Eros',
  tagline: 'Eros looses his arrows over Aphrodite’s garden. Not every heart they strike is kind.',
  window: { from: '02-07', to: '02-21' },
  accent: 0xff6a9a,
  currency: { name: 'Roses', sprite: 'rose', chance: 0.02, elite: 3, boss: 15 },
};

const EROS_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'lovestruck_satyr',
    name: 'Lovestruck Satyr',
    health: 30,
    speed: 78,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'lovestruck_satyr', color: 0xffb0c8 },
  },
  {
    id: 'erote',
    name: 'Erote',
    health: 40,
    speed: 134,
    damage: 8,
    radius: 13,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.05,
    behavior: { type: 'chaser', jitter: 0.6 },
    visual: { sprite: 'erote', color: 0xffd0e0 },
  },
  {
    id: 'siren_of_paphos',
    name: 'Siren of Paphos',
    health: 46,
    speed: 84,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 300,
      cooldown: 1.8,
      projectileSpeed: 300,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'heart_bolt',
    },
    visual: { sprite: 'siren_of_paphos', color: 0xff8ab0 },
  },
  {
    id: 'phobos',
    name: 'Phobos',
    health: 100,
    speed: 100,
    damage: 14,
    radius: 20,
    xp: 4,
    gold: { chance: 0.25, amount: 4 },
    knockbackResist: 0.55,
    behavior: {
      type: 'charger',
      triggerRange: 330,
      windup: 0.7,
      dashSpeed: 520,
      dashDuration: 0.6,
      cooldown: 3,
    },
    visual: { sprite: 'phobos', color: 0x8a2a3a },
  },
];

/** One of Eros' arrows, hovering at his side; broken, it returns after 16 s. */
const arrow = (id: string, name: string, side: number, sprite: string, color: number) => ({
  id,
  name,
  radius: 16,
  place: { from: 'boss' as const, angle: side * (Math.PI / 2), distance: 92 },
  attacks: [lash('loosed_arrow', 0.7, 380, 40, 24)],
  pause: 3.4 + (side > 0 ? 0.8 : 0),
  delay: 1.5 + (side > 0 ? 1 : 0),
  health: 1500,
  regrow: 16,
  visual: { sprite, color },
});

/**
 * Eros (spec: seasonal-events / the festival of eros): his golden and leaden arrows guard him and lash at the gods.
 * Break both and he is exposed for 6 s.
 */
const EROS: BossDefinition = {
  id: 'eros',
  name: 'Eros',
  title: 'The Winged Archer, Older than Love',
  health: 13500,
  radius: 42,
  speed: 78,
  contactDamage: 28,
  xp: 0,
  gold: 400,
  attackPause: 1.5,
  guard: 0.25,
  exposed: { seconds: 6, damageTaken: 1.8 },
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Eros draws his bow over the garden!',
      attacks: [
        boulders('rain_of_arrows', 1.1, 56, 24, 7, 260),
        sweep('volley_of_hearts', 0.9, 230, 1, 24, 3, 0.4),
        summon('call_the_erotes', 'erote', 5),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'Love turns to hate!',
      attacks: [
        charge('flight_of_eros', 1, 560, 80, 30, 920),
        boulders('rain_of_arrows', 1, 56, 26, 9, 300),
        summon('call_phobos', 'phobos', 2),
        sweep('volley_of_hearts', 0.8, 250, 1.1, 26, 4, 0.36),
      ],
    },
  ],
  parts: [
    arrow('golden_arrow', 'The golden arrow', -1, 'golden_arrow', 0xffd34d),
    arrow('leaden_arrow', 'The leaden arrow', 1, 'leaden_arrow', 0x6a6e7a),
  ],
  visual: { sprite: 'eros', color: 0xffc0d8 },
};

/** The Garden of Aphrodite: rose terraces over the sea at Paphos, myrtle groves and her great shell in the foam. */
const GARDEN_OF_APHRODITE: RealmDefinition = {
  id: 'garden_of_aphrodite',
  name: 'Garden of Aphrodite',
  event: 'festival_of_eros',
  description:
    'Rose terraces by the sea at Paphos, where Aphrodite rose from the foam. Love runs wild here, and Eros keeps his bow drawn.',
  backgroundColor: 0x1a0e16,
  tips: [
    'Eros’ two arrows guard him: while one flies he takes a quarter of the damage.',
    'Break both arrows and Eros is exposed: for a few seconds he takes almost twice the damage.',
    'Below half his strength love turns to hate: he flies at you along the line he marks.',
    'The Erotes are small and quick. Keep moving.',
    'The Sirens of Paphos throw hearts from afar. They hurt all the same.',
    'Phobos stops before he charges. When he stops, move.',
    'Aphrodite’s pools heal a god who stands in them, until they run dry.',
    'The Festival of Eros lasts until February 21. Its items appear only while it lasts.',
  ],
  // A warm rose dusk over the sea, petals on the breeze.
  atmosphere: {
    ambient: 0xa88898,
    fog: 0xd8a8bc,
    particles: 0xffc8d8,
    ambience: {
      weather: { kind: 'leaves', sprite: 'petal_rose', rate: 6, color: 0xff8ab0, wind: 16 },
      glints: { terrain: ['pool'], color: 0xffe0ec },
      wildlife: { kind: 'bird', sprite: 'dove', count: 7 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'lawn', color: 0x4e6a42, texture: { kind: 'grass' } },
        { id: 'rose_earth', color: 0x6a4a44, texture: { kind: 'earth' } },
        { id: 'clover', color: 0x5a7a4a, texture: { kind: 'moss', strength: 0.6 } },
        // Aphrodite's shallow pools: they slow a walker (spec: arena-generation / footing).
        {
          id: 'pool',
          color: 0x5a8aa0,
          texture: { kind: 'ripples', strength: 0.6 },
          footing: { speed: 0.75 },
        },
        { id: 'pink_marble', color: 0xb8aaa4, texture: { kind: 'slabs' } },
        { id: 'sea_cliff', color: 0x1e1420 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.14, terrain: 'pool' },
        { below: 0.46, terrain: 'lawn' },
        { below: 0.74, terrain: 'clover' },
        { below: 1.01, terrain: 'rose_earth' },
      ],
      plaza: 'pink_marble',
      border: 'sea_cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 66,
        visual: { sprite: 'shell_of_aphrodite', color: 0xf0d8d0 },
        light: { radius: 250, color: 0xffb8d0, intensity: 0.9, flicker: 0.12 },
      },
      { id: 'rose_bush', radius: 15, visual: { sprite: 'rose_bush', color: 0xc8344a } },
      {
        id: 'myrtle',
        radius: 18,
        visual: { sprite: 'myrtle_tree', color: 0x3e5a36 },
        sway: 0.03,
      },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xf0e4e0 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xe0d4d0 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xf0e8e4 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xe0d0d0 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0xc8b4b0 } },
      {
        id: 'lamp',
        radius: 14,
        visual: { sprite: 'rose_lamp', color: 0xff8ab0 },
        light: { radius: 190, color: 0xffb0c8, intensity: 0.6, flicker: 0.3 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'pink_marble' },
      {
        type: 'ring',
        kind: 'column',
        count: [3, 5],
        radius: [120, 180],
        pieces: 10,
        missingChance: 0.3,
        plazaTerrain: 'pink_marble',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'lamp',
        size: [480, 320],
        spacing: 90,
        fallenChance: 0.2,
        missingChance: 0.1,
      },
      {
        type: 'walls',
        kind: 'rose_bush',
        count: [4, 6],
        length: [160, 300],
        spacing: 44,
        missingChance: 0.25,
      },
      { type: 'cluster', kind: 'myrtle', count: [6, 9], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'lamp', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'rose_bush', density: 6, terrain: ['lawn', 'clover', 'rose_earth'] },
      { kind: 'myrtle', density: 3 },
      { kind: 'statue', density: 0.6 },
    ],
    props: {
      kinds: [
        {
          id: 'rose_amphora',
          radius: 14,
          visual: { sprite: 'prop_amphora_rose', color: 0xd88a8a },
        },
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
      ],
      clusters: 12,
    },
    features: [
      {
        type: 'spring',
        count: 3,
        radius: 44,
        heal: 30,
        pool: 120,
        refill: 45,
        visual: { sprite: 'rose_pool', color: 0xffa8c8 },
        light: { radius: 150, color: 0xffb0cc, intensity: 0.6, flicker: 0.1 },
      },
    ],
    decorations: [
      {
        id: 'rose_petals',
        terrain: ['lawn', 'clover', 'pink_marble'],
        density: 60,
        visual: { sprite: 'rose_petals', color: 0xff6a8a },
      },
      {
        id: 'flowers',
        terrain: ['lawn', 'clover'],
        density: 60,
        visual: { sprite: 'flowers', color: 0xffe0a0 },
      },
      {
        id: 'grass_tuft',
        terrain: ['lawn'],
        density: 60,
        visual: { sprite: 'grass_tuft', color: 0x7a9a5a },
        sway: 0.15,
      },
      {
        id: 'marble_shards',
        terrain: ['pink_marble', 'rose_earth'],
        density: 30,
        visual: { sprite: 'marble_shards', color: 0xe8d8d4 },
      },
    ],
  },
  ...hostRealm(
    { fodder: 'lovestruck_satyr', quick: 'erote', ranged: 'siren_of_paphos', heavy: 'phobos' },
    'eros',
  ),
};

/** Offered only at the Festival of Eros (spec: seasonal-events / event items). */
const ARROWS_OF_EROS: WeaponDefinition = {
  id: 'arrows_of_eros',
  name: 'Arrows of Eros',
  description:
    'An arrow of Eros leaps from heart to heart, and the struck may stand still, smitten.',
  event: 'festival_of_eros',
  element: 'physical',
  behavior: 'chain',
  base: {
    damage: 12,
    cooldown: 1.8,
    amount: 1,
    speed: 0,
    pierce: 0,
    size: 160,
    range: 440,
    arc: 0,
    duration: 0,
    knockback: 20,
    chains: 3,
    critChance: 0.05,
    homing: 0,
  },
  effects: [{ effect: 'stun', chance: 0.2, duration: 0.6, potency: 0 }],
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: '+1 leap.', chains: 1 },
    { text: '+1 arrow.', amount: 1 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.3 },
    { text: '+2 leaps, +10% critical chance.', chains: 2, critChance: 0.1 },
  ],
  visual: { sprite: 'arrows_of_eros', color: 0xff7aa8, projectile: 'love_arrow' },
};

const GIRDLE_OF_APHRODITE: RelicDefinition = {
  id: 'girdle_of_aphrodite',
  name: 'Girdle of Aphrodite',
  event: 'festival_of_eros',
  description: '+20 max health, +0.5 health per second.',
  modifiers: [
    { stat: 'maxHealth', flat: 20 },
    { stat: 'regen', flat: 0.5 },
  ],
  visual: { sprite: 'girdle_of_aphrodite', color: 0xff9ab8 },
};

export const EROS_PACK: EventPack = {
  event: FESTIVAL_OF_EROS,
  realm: GARDEN_OF_APHRODITE,
  boss: EROS,
  enemies: EROS_ENEMIES,
  weapons: [ARROWS_OF_EROS],
  relics: [GIRDLE_OF_APHRODITE],
  rewards: eventShop(
    'festival_of_eros',
    {
      id: 'aphrodites_favour',
      name: 'Aphrodite’s Favour',
      description: '+10 max health in every run.',
      modifiers: [{ stat: 'maxHealth', flat: 10 }],
      sprite: 'rose',
    },
    { id: 'girdlebearer', name: 'Girdlebearer', item: GIRDLE_OF_APHRODITE },
    { id: 'archer_of_love', name: 'Archer of Love', item: ARROWS_OF_EROS },
  ),
  achievements: eventAchievements(
    'garden_of_aphrodite',
    {
      id: 'heartbreaker',
      name: 'Heartbreaker',
      description: 'Defeat Eros in the Garden of Aphrodite.',
      sprite: 'arrows_of_eros',
    },
    {
      id: 'devoted',
      name: 'Devoted',
      description: 'Survive 10 minutes from the Garden of Aphrodite.',
      sprite: 'girdle_of_aphrodite',
    },
  ),
};
