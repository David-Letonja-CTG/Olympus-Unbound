import type {
  BossDefinition,
  BossPartDefinition,
  EnemyDefinition,
  EventDefinition,
  RealmDefinition,
  RelicDefinition,
  WeaponDefinition,
} from '../../engine';
import {
  boulders,
  EventPack,
  eventAchievements,
  eventShop,
  hostRealm,
  lash,
  MAP_FRAME,
  slam,
  summon,
  sweep,
} from './shared';

/**
 * The Golden Apples (St Patrick's green and gold, and the spring equinox; spec: seasonal-events / the golden apples):
 * spring wakes the Garden of the Hesperides at the western edge of the world, where Ladon guards the golden apples.
 */
const APPLES_OF_HESPERIDES: EventDefinition = {
  id: 'apples_of_hesperides',
  name: 'The Golden Apples',
  tagline: 'Spring wakes the Garden of the Hesperides. Ladon guards the golden apples.',
  window: { from: '03-10', to: '03-24' },
  accent: 0x9ad84a,
  currency: { name: 'Golden apples', sprite: 'golden_apple', chance: 0.02, elite: 3, boss: 15 },
};

const APPLES_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'golden_serpent',
    name: 'Golden Serpent',
    health: 28,
    speed: 80,
    damage: 7,
    radius: 13,
    xp: 1,
    gold: { chance: 0.14, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'golden_serpent', color: 0xd8d060 },
  },
  {
    id: 'hesperian_harpy',
    name: 'Hesperian Harpy',
    health: 42,
    speed: 130,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.18, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.6 },
    visual: { sprite: 'hesperian_harpy', color: 0xe8c860 },
  },
  {
    id: 'hesperid',
    name: 'Hesperid',
    health: 46,
    speed: 84,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.18, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 300,
      cooldown: 1.9,
      projectileSpeed: 300,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'apple_shot',
    },
    visual: { sprite: 'hesperid', color: 0xa8e080 },
  },
  {
    id: 'garden_colossus',
    name: 'Garden Colossus',
    health: 130,
    speed: 60,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'garden_colossus', color: 0xc8c088 },
  },
];

/** One of Ladon's heads: it strikes on its own rhythm and cannot be hurt (spec: boss-encounter / parts). */
const head = (n: number, angle: number, fromPhase = 0): BossPartDefinition => ({
  id: `ladon_head_${n}`,
  name: `Head ${['I', 'II', 'III', 'IV', 'V'][n - 1]}`,
  radius: 15,
  place: { from: 'boss', angle, distance: 60 },
  attacks: [lash('serpent_strike', 0.8, 330, 54, 24)],
  pause: 3.2 + n * 0.45,
  delay: 1 + n * 0.6,
  fromPhase,
  visual: { sprite: 'ladon_head', color: 0xc8c050 },
});

/**
 * Ladon, the dragon of the golden apples (spec: seasonal-events / the golden apples): coiled round his tree near the
 * arena's middle, his heads striking on their own rhythm; two more from his second phase.
 */
const LADON: BossDefinition = {
  id: 'ladon',
  name: 'Ladon',
  title: 'The Hundred-Headed, Guardian of the Golden Apples',
  health: 15000,
  radius: 52,
  speed: 56,
  contactDamage: 32,
  xp: 0,
  gold: 400,
  attackPause: 1.5,
  anchored: 170,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Ladon wakes coiled round the golden tree!',
      attacks: [
        sweep('tail_sweep', 1, 250, 1.2, 28, 3, 0.45),
        boulders('golden_venom', 1.2, 70, 26, 6, 260),
        summon('call_the_brood', 'golden_serpent', 6),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.2,
      enraged: true,
      pauseMultiplier: 0.75,
      announcement: 'Ladon uncoils! A hundred heads hiss!',
      attacks: [
        slam('the_coils_tighten', 1, 200, 32),
        boulders('golden_venom', 1.1, 70, 28, 8, 300),
        sweep('tail_sweep', 0.9, 270, 1.3, 30, 4, 0.4),
        summon('call_the_colossi', 'garden_colossus', 2),
      ],
    },
  ],
  parts: [head(1, -1.2), head(2, 0), head(3, 1.2), head(4, -2.4, 1), head(5, 2.4, 1)],
  visual: { sprite: 'ladon', color: 0xc8c050 },
};

/** The Garden of the Hesperides: a green orchard of golden apples, where Atlas kneels under the sky. */
const GARDEN_OF_HESPERIDES: RealmDefinition = {
  id: 'garden_of_hesperides',
  name: 'Garden of the Hesperides',
  event: 'apples_of_hesperides',
  description:
    'The orchard at the western edge of the world, green with spring. The golden apples hang ripe, and Atlas holds up the sky.',
  backgroundColor: 0x10160c,
  tips: [
    'Ladon stays coiled near his tree. Fight him at the edge of his reach.',
    'His heads strike along the lines they mark. They cannot be hurt: strike Ladon himself.',
    'Below half his strength Ladon uncoils: two more heads strike, and the ground round him shakes.',
    'Golden Serpents come in hundreds. Clear them before they surround you.',
    'The Hesperides throw apples from afar. Close in on them.',
    'The Garden Colossi are slow, but nothing pushes them back.',
    'The Golden Apples last until March 24. Their items appear only while they last.',
  ],
  // A golden spring evening: deep green orchards, warm light, blossoms on the breeze.
  atmosphere: {
    ambient: 0x98a070,
    fog: 0xc0c088,
    particles: 0xffe070,
    ambience: {
      weather: { kind: 'leaves', sprite: 'petal_blossom', rate: 5, color: 0xfff0e0, wind: 14 },
      clouds: 0.15,
      wildlife: { kind: 'bird', sprite: 'dove', count: 6 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'orchard_grass', color: 0x4a6e36, texture: { kind: 'grass' } },
        { id: 'clover', color: 0x3e6a34, texture: { kind: 'moss', strength: 0.7 } },
        { id: 'tilled_earth', color: 0x6a5838, texture: { kind: 'earth' } },
        { id: 'golden_slabs', color: 0xb0a070, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x161a10 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.4, terrain: 'clover' },
        { below: 0.8, terrain: 'orchard_grass' },
        { below: 1.01, terrain: 'tilled_earth' },
      ],
      plaza: 'golden_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 72,
        visual: { sprite: 'atlas_holding_sky', color: 0xa89878 },
        light: { radius: 260, color: 0xffe08a, intensity: 0.85, flicker: 0.1 },
      },
      {
        id: 'apple_tree',
        radius: 20,
        visual: { sprite: 'apple_tree', color: 0x3e6a2e },
        sway: 0.03,
      },
      { id: 'cypress', radius: 18, visual: { sprite: 'cypress', color: 0x1e2a1e }, sway: 0.03 },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xe8e0c8 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xd8d0b8 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xe0d8c0 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xd0c8b0 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0xb8ae94 } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x8a8070 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 240, color: 0xffc060, intensity: 1, flicker: 0.3 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'golden_slabs' },
      {
        type: 'ring',
        kind: 'column',
        count: [3, 5],
        radius: [120, 180],
        pieces: 9,
        missingChance: 0.35,
        plazaTerrain: 'golden_slabs',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [480, 320],
        spacing: 90,
        fallenChance: 0.3,
        missingChance: 0.15,
      },
      {
        type: 'walls',
        kind: 'wall',
        count: [2, 4],
        length: [160, 300],
        spacing: 66,
        missingChance: 0.3,
      },
      { type: 'cluster', kind: 'apple_tree', count: [8, 12], size: [3, 5], spread: 100 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'apple_tree', density: 12, terrain: ['orchard_grass', 'clover'] },
      { kind: 'cypress', density: 2 },
      { kind: 'rock', density: 2 },
      { kind: 'statue', density: 0.5 },
    ],
    props: {
      kinds: [
        {
          id: 'golden_amphora',
          radius: 14,
          visual: { sprite: 'prop_amphora_gold', color: 0xd8b04a },
        },
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
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
        id: 'windfalls',
        terrain: ['orchard_grass', 'clover'],
        density: 40,
        visual: { sprite: 'windfalls', color: 0xffd34d },
      },
      {
        id: 'clover_flowers',
        terrain: ['clover', 'orchard_grass'],
        density: 70,
        visual: { sprite: 'clover', color: 0xf0f0e0 },
      },
      {
        id: 'grass_tuft',
        terrain: ['orchard_grass'],
        density: 60,
        visual: { sprite: 'grass_tuft', color: 0x6a9a4a },
        sway: 0.15,
      },
      {
        id: 'pebbles',
        terrain: ['tilled_earth', 'golden_slabs'],
        density: 40,
        visual: { sprite: 'pebbles', color: 0x9a9080 },
      },
    ],
  },
  ...hostRealm(
    {
      fodder: 'golden_serpent',
      quick: 'hesperian_harpy',
      ranged: 'hesperid',
      heavy: 'garden_colossus',
    },
    'ladon',
  ),
};

/** Offered only in the Golden Apples (spec: seasonal-events / event items). */
const APPLE_OF_DISCORD: WeaponDefinition = {
  id: 'apple_of_discord',
  name: 'Apple of Discord',
  description: 'Golden apples fall on the foes around you and burst, scattering them.',
  event: 'apples_of_hesperides',
  element: 'physical',
  behavior: 'strike',
  base: {
    damage: 18,
    cooldown: 1.8,
    amount: 2,
    speed: 0,
    pierce: 0,
    size: 52,
    range: 420,
    arc: 0,
    duration: 0,
    knockback: 140,
    chains: 0,
    critChance: 0.05,
    homing: 0,
  },
  levels: [
    { text: '+7 damage.', damage: 7 },
    { text: '+1 apple.', amount: 1 },
    { text: 'Wider bursts.', size: 14 },
    { text: '+8 damage, faster.', damage: 8, cooldown: -0.3 },
    { text: '+2 apples.', amount: 2 },
  ],
  visual: { sprite: 'apple_of_discord', color: 0xffd34d, projectile: 'falling_apple' },
};

const BURDEN_OF_ATLAS: RelicDefinition = {
  id: 'burden_of_atlas',
  name: 'Burden of Atlas',
  event: 'apples_of_hesperides',
  description: '+1 armour, +15% gold.',
  modifiers: [
    { stat: 'armor', flat: 1 },
    { stat: 'goldGain', flat: 0.15 },
  ],
  visual: { sprite: 'burden_of_atlas', color: 0xd8c070 },
};

export const APPLES_PACK: EventPack = {
  event: APPLES_OF_HESPERIDES,
  realm: GARDEN_OF_HESPERIDES,
  boss: LADON,
  enemies: APPLES_ENEMIES,
  weapons: [APPLE_OF_DISCORD],
  relics: [BURDEN_OF_ATLAS],
  rewards: eventShop(
    'apples_of_hesperides',
    {
      id: 'hesperides_gift',
      name: 'Gift of the Hesperides',
      description: '+8% gold in every run.',
      modifiers: [{ stat: 'goldGain', flat: 0.08 }],
      sprite: 'golden_apple',
    },
    { id: 'skybearer', name: 'Skybearer', item: BURDEN_OF_ATLAS },
    { id: 'erisian', name: 'Eris’ Due', item: APPLE_OF_DISCORD },
  ),
  achievements: eventAchievements(
    'garden_of_hesperides',
    {
      id: 'eleventh_labour',
      name: 'The Eleventh Labour',
      description: 'Defeat Ladon in the Garden of the Hesperides.',
      sprite: 'apple_of_discord',
    },
    {
      id: 'evergreen',
      name: 'Evergreen',
      description: 'Survive 10 minutes from the Garden of the Hesperides.',
      sprite: 'burden_of_atlas',
    },
  ),
};
