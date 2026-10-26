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
  walls,
} from './shared';

/**
 * The Revels of Pan (April Fools' Day and the Easter season; spec: seasonal-events / the revels of pan): the wild god
 * of Arcadia plays his tricks in the spring woods, and his echoes answer from every side.
 */
const REVELS_OF_PAN: EventDefinition = {
  id: 'revels_of_pan',
  name: 'The Revels of Pan',
  tagline: 'Spring comes to Arcadia, and Pan plays his tricks. Do not panic.',
  window: { from: '04-01', to: '04-14' },
  accent: 0x8ac860,
  // Painted eggs: spring's offering, hidden in the grass.
  currency: { name: 'Painted eggs', sprite: 'painted_egg', chance: 0.02, elite: 3, boss: 15 },
};

const PAN_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'revelling_satyr',
    name: 'Revelling Satyr',
    health: 30,
    speed: 78,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.55 },
    visual: { sprite: 'revelling_satyr', color: 0xc8a070 },
  },
  {
    id: 'paniskos',
    name: 'Paniskos',
    health: 36,
    speed: 136,
    damage: 8,
    radius: 12,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.7 },
    visual: { sprite: 'paniskos', color: 0xd8b080 },
  },
  {
    id: 'dryad',
    name: 'Dryad',
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
      projectileSpeed: 300,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'thorn_shot',
    },
    visual: { sprite: 'dryad', color: 0x8ad070 },
  },
  {
    id: 'silenus',
    name: 'Silenus',
    health: 130,
    speed: 58,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.2 },
    visual: { sprite: 'silenus', color: 0xa08060 },
  },
];

/**
 * One of Pan's echoes (spec: seasonal-events / the revels of pan): fixed round the arena, it strikes along a marked
 * line on its own rhythm; it cannot be hurt.
 */
const echo = (n: number): BossPartDefinition => ({
  id: `echo_${n}`,
  name: 'An echo',
  radius: 14,
  place: { from: 'arena', angle: (n * Math.PI * 2) / 4 + Math.PI / 4, distance: 290 },
  attacks: [lash('echoing_cry', 1, 420, 46, 22)],
  pause: 4.5 + n * 0.5,
  delay: 2 + n * 0.8,
  visual: { sprite: 'paniskos', color: 0xd8b080 },
});

/**
 * Pan, god of the wild (spec: seasonal-events / the revels of pan): his shout spreads panic in cones, his echoes
 * strike from round the arena, and below half health the reeds of Syrinx rise.
 */
const PAN: BossDefinition = {
  id: 'pan',
  name: 'Pan',
  title: 'Lord of the Wild, Piper of Arcadia',
  health: 14000,
  radius: 46,
  speed: 76,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.4,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Pan leaps from the thicket, laughing!',
      attacks: [
        sweep('panic', 0.9, 250, 1.1, 26, 3, 0.4),
        summon('call_the_revel', 'revelling_satyr', 6),
        boulders('falling_acorns', 1.2, 60, 24, 7, 260),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.3,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'The reeds of Syrinx rise!',
      attacks: [
        walls('reeds_of_syrinx', 1.3, 9, 24, [180, 300], 6, 0.35),
        sweep('panic', 0.8, 270, 1.2, 28, 4, 0.35),
        slam('the_pipes_shriek', 1, 200, 32),
        summon('call_silenus', 'silenus', 2),
      ],
    },
  ],
  parts: [echo(0), echo(1), echo(2), echo(3)],
  visual: { sprite: 'pan', color: 0xc89060 },
};

/** The Woods of Arcadia: spring oaks, reed-fringed ponds and Pan's herm on its rock. */
const WOODS_OF_ARCADIA: RealmDefinition = {
  id: 'woods_of_arcadia',
  name: 'The Woods of Arcadia',
  event: 'revels_of_pan',
  description:
    'Spring woods in the hills of Arcadia, where the oaks are in leaf and the ponds are full. Pan plays here, and his echoes answer.',
  backgroundColor: 0x0e140c,
  tips: [
    'Pan’s shout spreads panic in cones before him. Step out of them.',
    'His echoes strike from round the arena along the lines they mark. They cannot be hurt.',
    'Below half his strength the reeds of Syrinx rise round him with six ways out.',
    'The Panisci are small and quick. Keep moving.',
    'The Dryads throw thorns from afar. Close in on them.',
    'Silenus is slow, but nothing pushes him back.',
    'The Revels of Pan last until April 14. Their items appear only while they last.',
  ],
  // A green spring evening, blossom on the breeze, frogs at the ponds.
  atmosphere: {
    ambient: 0x8a9a78,
    fog: 0xa8b890,
    particles: 0xe8f0a0,
    ambience: {
      weather: { kind: 'leaves', sprite: 'petal_blossom', rate: 4, color: 0xfff0f0, wind: 12 },
      clouds: 0.18,
      glints: { terrain: ['pond'], color: 0xe0f0ff },
      wildlife: { kind: 'hopper', sprite: 'frog', count: 6 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'meadow', color: 0x587a40, texture: { kind: 'grass' } },
        { id: 'moss', color: 0x3e5a32, texture: { kind: 'moss' } },
        { id: 'forest_floor', color: 0x5a4a34, texture: { kind: 'earth' } },
        // Ponds: wading slows (spec: arena-generation / footing).
        {
          id: 'pond',
          color: 0x3a6a78,
          texture: { kind: 'ripples', strength: 0.7 },
          footing: { speed: 0.7 },
        },
        { id: 'mossy_slabs', color: 0x8a8a70, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x141a10 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.16, terrain: 'pond' },
        { below: 0.42, terrain: 'moss' },
        { below: 0.78, terrain: 'meadow' },
        { below: 1.01, terrain: 'forest_floor' },
      ],
      plaza: 'mossy_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 60,
        visual: { sprite: 'shrine_of_pan', color: 0x8a8070 },
        light: { radius: 230, color: 0xffd08a, intensity: 0.8, flicker: 0.25 },
      },
      { id: 'oak', radius: 20, visual: { sprite: 'oak_tree', color: 0x3e5a2e }, sway: 0.03 },
      { id: 'cypress', radius: 18, visual: { sprite: 'cypress', color: 0x1e2a1e }, sway: 0.03 },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x7a786a } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xc8c4b0 } },
      { id: 'column', radius: 16, visual: { sprite: 'mossy_column', color: 0x8c9478 } },
      {
        id: 'broken_column',
        radius: 18,
        visual: { sprite: 'broken_mossy_column', color: 0x7e8670 },
      },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xb0aa98 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x9a9480 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 240, color: 0xffb060, intensity: 0.95, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'mossy_slabs' },
      {
        type: 'ring',
        kind: 'rock',
        count: [3, 5],
        radius: [110, 160],
        pieces: 8,
        missingChance: 0.3,
        plazaTerrain: 'mossy_slabs',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'brazier',
        size: [440, 300],
        spacing: 90,
        fallenChance: 0.4,
        missingChance: 0.2,
      },
      { type: 'cluster', kind: 'oak', count: [10, 14], size: [3, 6], spread: 100 },
      { type: 'plazaLights', kind: 'brazier', count: 5, offset: 18 },
    ],
    scatter: [
      { kind: 'oak', density: 14, terrain: ['meadow', 'moss', 'forest_floor'] },
      { kind: 'cypress', density: 2 },
      { kind: 'rock', density: 3 },
      { kind: 'statue', density: 0.4 },
    ],
    props: {
      kinds: [
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
        { id: 'amphora', radius: 14, visual: { sprite: 'prop_amphora_pale', color: 0xc8a77a } },
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
        id: 'reeds',
        terrain: ['pond'],
        density: 120,
        visual: { sprite: 'reeds', color: 0x7a8a46 },
        sway: 0.2,
      },
      {
        id: 'ferns',
        terrain: ['moss', 'forest_floor'],
        density: 60,
        visual: { sprite: 'ferns', color: 0x4a7a3a },
        sway: 0.12,
      },
      {
        id: 'wildflowers',
        terrain: ['meadow'],
        density: 70,
        visual: { sprite: 'wildflowers', color: 0xf0e070 },
      },
      {
        id: 'grass_tuft',
        terrain: ['meadow'],
        density: 60,
        visual: { sprite: 'grass_tuft', color: 0x7a9a5a },
        sway: 0.15,
      },
    ],
  },
  ...hostRealm(
    { fodder: 'revelling_satyr', quick: 'paniskos', ranged: 'dryad', heavy: 'silenus' },
    'pan',
  ),
};

/** Offered only in the Revels of Pan (spec: seasonal-events / event items). */
const PIPES_OF_PAN: WeaponDefinition = {
  id: 'pipes_of_pan',
  name: 'Pipes of Pan',
  description: 'A shrill blast of the pipes sweeps before you, scattering the horde in panic.',
  event: 'revels_of_pan',
  element: 'shadow',
  behavior: 'sweep',
  base: {
    damage: 14,
    cooldown: 1.6,
    amount: 1,
    speed: 0,
    pierce: -1,
    size: 130,
    range: 130,
    arc: 1.6,
    duration: 0,
    knockback: 260,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'slow', chance: 0.3, duration: 1.2, potency: 0.35 }],
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: 'A wider blast.', arc: 0.6, size: 20, range: 20 },
    { text: '+1 blast.', amount: 1 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.3 },
    { text: 'Wider still.', arc: 0.8, size: 25, range: 25 },
  ],
  visual: { sprite: 'pipes_of_pan', color: 0xc8a060 },
};

const REEDS_OF_SYRINX: RelicDefinition = {
  id: 'reeds_of_syrinx',
  name: 'Reeds of Syrinx',
  event: 'revels_of_pan',
  description: 'Attacks 6% faster, +15% knockback.',
  modifiers: [
    { stat: 'cooldown', flat: -0.06 },
    { stat: 'knockback', flat: 0.15 },
  ],
  visual: { sprite: 'reeds_of_syrinx', color: 0x9ab860 },
};

export const PAN_PACK: EventPack = {
  event: REVELS_OF_PAN,
  realm: WOODS_OF_ARCADIA,
  boss: PAN,
  enemies: PAN_ENEMIES,
  weapons: [PIPES_OF_PAN],
  relics: [REEDS_OF_SYRINX],
  rewards: eventShop(
    'revels_of_pan',
    {
      id: 'arcadian_spring',
      name: 'Arcadian Spring',
      description: '+0.3 health per second in every run.',
      modifiers: [{ stat: 'regen', flat: 0.3 }],
      sprite: 'painted_egg',
    },
    { id: 'reedcutter', name: 'Reedcutter', item: REEDS_OF_SYRINX },
    { id: 'piper', name: 'Piper', item: PIPES_OF_PAN },
  ),
  achievements: eventAchievements(
    'woods_of_arcadia',
    {
      id: 'lord_of_the_wild',
      name: 'Lord of the Wild',
      description: 'Defeat Pan in the Woods of Arcadia.',
      sprite: 'pipes_of_pan',
    },
    {
      id: 'no_panic',
      name: 'No Panic',
      description: 'Survive 10 minutes from the Woods of Arcadia.',
      sprite: 'reeds_of_syrinx',
    },
  ),
};
