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
  charge,
  EventPack,
  eventAchievements,
  eventShop,
  hostRealm,
  MAP_FRAME,
  summon,
  sweep,
} from './shared';

/**
 * The Theft of Fire (the fireworks of early July; spec: seasonal-events / the theft of fire): on the Caucasus,
 * Prometheus hangs in his chains for the fire he gave mortals, and Zeus' eagle guards him. The sky bursts with sparks.
 */
const THEFT_OF_FIRE: EventDefinition = {
  id: 'theft_of_fire',
  name: 'The Theft of Fire',
  tagline: 'Prometheus hangs in chains on the Caucasus. Free him from the eagle.',
  window: { from: '07-01', to: '07-14' },
  accent: 0xff7a3a,
  currency: { name: 'Embers', sprite: 'ember', chance: 0.02, elite: 3, boss: 15 },
};

const FIRE_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'ash_shade',
    name: 'Ash Shade',
    health: 30,
    speed: 76,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.4 },
    visual: { sprite: 'ash_shade', color: 0xffa070 },
  },
  {
    id: 'cinder_harpy',
    name: 'Cinder Harpy',
    health: 42,
    speed: 132,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.6 },
    visual: { sprite: 'cinder_harpy', color: 0xff7040 },
  },
  {
    id: 'kabeiros',
    name: 'Kabeiros',
    health: 48,
    speed: 82,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.25,
    behavior: {
      type: 'ranged',
      preferredRange: 300,
      cooldown: 1.9,
      projectileSpeed: 320,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'ember_shot',
    },
    visual: { sprite: 'kabeiros', color: 0xffb070 },
  },
  {
    id: 'forge_cyclops',
    name: 'Forge Cyclops',
    health: 130,
    speed: 60,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'forge_cyclops', color: 0xd08050 },
  },
];

/**
 * One of the stolen fires round the eagle's rock (spec: seasonal-events / the theft of fire): it burns and slows the
 * gods near it and guards the eagle; put out, it is lit again after 22 s.
 */
const stolenFire = (n: number): BossPartDefinition => ({
  id: `stolen_fire_${n}`,
  name: 'A stolen fire',
  radius: 18,
  place: { from: 'arena', angle: (n * Math.PI * 2) / 3 - Math.PI / 2, distance: 200 },
  attacks: [],
  pause: 99,
  delay: 99,
  health: 1400,
  regrow: 22,
  zone: { radius: 90, dps: 10, slow: 0.25 },
  visual: { sprite: 'brazier', color: 0xff8a3d },
});

/**
 * The Caucasian Eagle (spec: seasonal-events / the theft of fire): three stolen fires guard it; it dives along marked
 * lines and rains bronze feathers, and below half health it circles, sweeping the ground with its wings.
 */
const CAUCASIAN_EAGLE: BossDefinition = {
  id: 'caucasian_eagle',
  name: 'The Caucasian Eagle',
  title: 'Hound of Zeus, Tormentor of Prometheus',
  health: 14000,
  radius: 46,
  speed: 84,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.4,
  guard: 0.4,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'The eagle of Zeus swoops from the rock!',
      attacks: [
        charge('the_dive', 1, 600, 80, 30, 1000),
        boulders('bronze_feathers', 1.1, 56, 24, 8, 280),
        summon('call_the_harpies', 'cinder_harpy', 5),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.3,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'The eagle circles, screaming!',
      attacks: [
        sweep('beating_wings', 0.9, 260, 1.3, 28, 4, 0.35),
        charge('the_dive', 0.9, 660, 84, 32, 1080),
        boulders('bronze_feathers', 1, 56, 26, 10, 320),
        charge('the_dive', 0.9, 660, 84, 32, 1080),
      ],
    },
  ],
  parts: [stolenFire(0), stolenFire(1), stolenFire(2)],
  visual: { sprite: 'caucasian_eagle', color: 0xc89050 },
};

/** The Caucasus: black peaks at night, forges glowing, Prometheus chained to his rock. */
const PEAKS_OF_CAUCASUS: RealmDefinition = {
  id: 'peaks_of_caucasus',
  name: 'The Peaks of the Caucasus',
  event: 'theft_of_fire',
  description:
    'Black peaks at the edge of the world, where Prometheus hangs in chains for the fire he stole. Sparks burst in the night sky.',
  backgroundColor: 0x140c0a,
  tips: [
    'Three stolen fires guard the eagle: while one burns it takes much less damage. Put them out.',
    'The fires burn and slow a god who stands near them.',
    'The eagle dives along the line it marks. Step aside.',
    'Below half its strength it circles, sweeping the ground with its wings.',
    'The Kabeiroi, smiths of the forge, throw embers from afar. Close in on them.',
    'The Forge Cyclopes are slow, but nothing pushes them back.',
    'The Theft of Fire lasts until July 14. Its items appear only while it lasts.',
  ],
  // A warm summer night, sparks bursting like fireworks.
  atmosphere: {
    ambient: 0x8a7870,
    fog: 0x9a7a6a,
    particles: 0xffb060,
    ambience: {
      weather: { kind: 'fireflies', rate: 8, color: 0xffc070, wind: 10 },
      lightning: { every: [6, 12], color: 0xffb0e0 },
      smoke: 0x5a4a44,
      wildlife: { kind: 'bird', sprite: 'crow', count: 5 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'scree', color: 0x5a5048, texture: { kind: 'cracks', strength: 0.7 } },
        { id: 'ash', color: 0x4a4240, texture: { kind: 'ash' } },
        { id: 'scorched_grass', color: 0x5a5236, texture: { kind: 'grass', strength: 0.5 } },
        { id: 'basalt_slabs', color: 0x6a605a, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x120a08 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.3, terrain: 'ash' },
        { below: 0.66, terrain: 'scree' },
        { below: 1.01, terrain: 'scorched_grass' },
      ],
      plaza: 'basalt_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 66,
        visual: { sprite: 'chained_titan', color: 0x6a605a },
        light: { radius: 260, color: 0xff9a50, intensity: 0.9, flicker: 0.35 },
      },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x6a6058 } },
      { id: 'dead_tree', radius: 16, visual: { sprite: 'dead_tree', color: 0x2a2420 } },
      { id: 'column', radius: 16, visual: { sprite: 'obsidian_column', color: 0x3a3440 } },
      {
        id: 'broken_column',
        radius: 18,
        visual: { sprite: 'broken_obsidian_column', color: 0x34303a },
      },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0x9a9084 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x7a7068 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xa8a098 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 240, color: 0xff9a50, intensity: 1, flicker: 0.4 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'basalt_slabs' },
      {
        type: 'ring',
        kind: 'rock',
        count: [4, 6],
        radius: [110, 170],
        pieces: 9,
        missingChance: 0.3,
        plazaTerrain: 'basalt_slabs',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [460, 300],
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
      { type: 'cluster', kind: 'rock', count: [6, 9], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'rock', density: 6 },
      { kind: 'dead_tree', density: 3, terrain: ['scorched_grass', 'scree'] },
      { kind: 'statue', density: 0.4 },
    ],
    props: {
      kinds: [
        { id: 'crate', radius: 15, visual: { sprite: 'prop_crate', color: 0x6a4a30 } },
        { id: 'bronze_urn', radius: 14, visual: { sprite: 'prop_urn_bronze', color: 0x8a6a3a } },
      ],
      clusters: 10,
    },
    // The mountain smoulders: vents in the ash erupt (spec: arena-generation / map hazards).
    features: [
      {
        type: 'vent',
        count: 5,
        radius: 64,
        damage: 20,
        monsters: 0.5,
        windup: 1.2,
        every: [5, 9],
        terrain: ['ash'],
        visual: { sprite: 'lava_vent', color: 0xff7a2a },
        light: { radius: 140, color: 0xff7a2a, intensity: 0.7, flicker: 0.4 },
      },
    ],
    decorations: [
      {
        id: 'ash_pebbles',
        terrain: ['ash', 'scree'],
        density: 60,
        visual: { sprite: 'ash_pebbles', color: 0x5a5660 },
      },
      {
        id: 'embers',
        terrain: ['ash'],
        density: 40,
        visual: { sprite: 'cinders', color: 0xff8a3a },
      },
      {
        id: 'grass_tuft',
        terrain: ['scorched_grass'],
        density: 50,
        visual: { sprite: 'grass_tuft', color: 0x7a6a40 },
        sway: 0.12,
      },
      {
        id: 'bones',
        terrain: ['scree'],
        density: 15,
        visual: { sprite: 'bones', color: 0xcfc6b4 },
      },
    ],
  },
  ...hostRealm(
    { fodder: 'ash_shade', quick: 'cinder_harpy', ranged: 'kabeiros', heavy: 'forge_cyclops' },
    'caucasian_eagle',
  ),
};

/** Offered only in the Theft of Fire (spec: seasonal-events / event items). */
const STOLEN_FIRE: WeaponDefinition = {
  id: 'stolen_fire',
  name: 'Stolen Fire',
  description: 'The fire of the gods leaps from foe to foe, leaving them burning.',
  event: 'theft_of_fire',
  element: 'fire',
  behavior: 'chain',
  base: {
    damage: 12,
    cooldown: 1.9,
    amount: 1,
    speed: 0,
    pierce: 0,
    size: 160,
    range: 440,
    arc: 0,
    duration: 0,
    knockback: 20,
    chains: 3,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'burn', chance: 0.5, duration: 2.5, potency: 0.3 }],
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: '+1 leap.', chains: 1 },
    { text: '+1 flame.', amount: 1 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.3 },
    { text: '+2 leaps.', chains: 2 },
  ],
  visual: { sprite: 'stolen_fire', color: 0xff8a3a },
};

const FENNEL_STALK: RelicDefinition = {
  id: 'fennel_stalk',
  name: 'Fennel Stalk',
  event: 'theft_of_fire',
  description: '+20% fire damage, +10% area.',
  modifiers: [
    { stat: 'fireDamage', flat: 0.2 },
    { stat: 'area', flat: 0.1 },
  ],
  element: 'fire',
  visual: { sprite: 'fennel_stalk', color: 0xffa050 },
};

export const FIRE_PACK: EventPack = {
  event: THEFT_OF_FIRE,
  realm: PEAKS_OF_CAUCASUS,
  boss: CAUCASIAN_EAGLE,
  enemies: FIRE_ENEMIES,
  weapons: [STOLEN_FIRE],
  relics: [FENNEL_STALK],
  rewards: eventShop(
    'theft_of_fire',
    {
      id: 'forethought',
      name: 'Forethought',
      description: '+15% pickup range in every run.',
      modifiers: [{ stat: 'magnet', percent: 0.15 }],
      sprite: 'ember',
    },
    { id: 'fennel_bearer', name: 'Fennel-Bearer', item: FENNEL_STALK },
    { id: 'firebringer', name: 'Firebringer', item: STOLEN_FIRE },
  ),
  achievements: eventAchievements(
    'peaks_of_caucasus',
    {
      id: 'prometheus_unbound',
      name: 'Prometheus Unbound',
      description: 'Bring down the Caucasian Eagle.',
      sprite: 'stolen_fire',
    },
    {
      id: 'firekeeper',
      name: 'Firekeeper',
      description: 'Survive 10 minutes from the Peaks of the Caucasus.',
      sprite: 'fennel_stalk',
    },
  ),
};
