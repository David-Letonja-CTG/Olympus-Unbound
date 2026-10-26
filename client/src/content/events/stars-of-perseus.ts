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
  summon,
  sweep,
  walls,
} from './shared';

/**
 * The Stars of Perseus (the Perseids in mid-August; spec: seasonal-events / the stars of perseus): stars fall over the
 * isle of the Gorgons, where Medusa turns heroes to stone and her immortal sisters guard her.
 */
const STARS_OF_PERSEUS: EventDefinition = {
  id: 'stars_of_perseus',
  name: 'The Stars of Perseus',
  tagline: 'Stars fall over the isle of the Gorgons. Do not meet Medusa’s eyes.',
  window: { from: '08-06', to: '08-19' },
  accent: 0x7ad8a0,
  currency: { name: 'Meteor stones', sprite: 'meteor_stone', chance: 0.02, elite: 3, boss: 15 },
};

const PERSEUS_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'gorgon_brood',
    name: 'Gorgon’s Brood',
    health: 28,
    speed: 80,
    damage: 7,
    radius: 13,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'gorgon_brood', color: 0x7ac860 },
  },
  {
    id: 'stone_lamia',
    name: 'Stone Lamia',
    health: 44,
    speed: 130,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.55 },
    visual: { sprite: 'stone_lamia', color: 0x9ad0a0 },
  },
  {
    id: 'graea',
    name: 'Graea',
    health: 46,
    speed: 80,
    damage: 6,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.2,
    behavior: {
      type: 'ranged',
      preferredRange: 310,
      cooldown: 1.9,
      projectileSpeed: 300,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'grey_eye',
    },
    visual: { sprite: 'graea', color: 0xc8c8c4 },
  },
  {
    id: 'petrified_hero',
    name: 'Petrified Hero',
    health: 130,
    speed: 58,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.75,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'petrified_hero', color: 0xb8b8b0 },
  },
];

/** One of Medusa's immortal sisters: cut them in order; with both down, Medusa is exposed. */
const sister = (order: number, id: string, name: string, angle: number): BossPartDefinition => ({
  id,
  name,
  radius: 18,
  place: { from: 'boss', angle, distance: 100 },
  attacks: [lash('gorgon_lash', 0.8, 320, 54, 24)],
  pause: 3.6 + order * 0.6,
  delay: 1.2 + order,
  health: 1600,
  order,
  regrow: 18,
  visual: { sprite: 'gorgon_sister', color: 0x6ab880 },
});

/**
 * Medusa (spec: seasonal-events / the stars of perseus): her sisters Stheno and Euryale guard her and must be cut in
 * order; with both down she is exposed. Her gaze sweeps in long, slow cones that hit hard.
 */
const MEDUSA: BossDefinition = {
  id: 'medusa',
  name: 'Medusa',
  title: 'The Gorgon, Whose Gaze Is Stone',
  health: 14000,
  radius: 46,
  speed: 64,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.5,
  guard: 0.2,
  exposed: { seconds: 7, damageTaken: 1.6 },
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Medusa turns her head… do not meet her eyes!',
      attacks: [
        sweep('petrifying_gaze', 1.4, 300, 0.9, 40, 2, 0.6),
        boulders('stone_rain', 1.2, 66, 26, 6, 260),
        summon('call_the_brood', 'gorgon_brood', 6),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'Medusa unveils her face!',
      attacks: [
        walls('ring_of_statues', 1.3, 9, 26, [200, 320], 4, 0.25),
        sweep('petrifying_gaze', 1.2, 320, 1, 42, 3, 0.5),
        boulders('stone_rain', 1.1, 66, 28, 8, 300),
        summon('call_the_heroes', 'petrified_hero', 2),
      ],
    },
  ],
  parts: [
    sister(1, 'stheno', 'Stheno', -Math.PI / 2),
    sister(2, 'euryale', 'Euryale', Math.PI / 2),
  ],
  visual: { sprite: 'medusa', color: 0x8ad890 },
};

/** The Isle of the Gorgons: a rocky shore under falling stars, crowded with heroes turned to stone. */
const ISLE_OF_GORGONS: RealmDefinition = {
  id: 'isle_of_gorgons',
  name: 'The Isle of the Gorgons',
  event: 'stars_of_perseus',
  description:
    'A rocky isle at the end of the sea, crowded with heroes turned to stone. Stars fall all night, and Medusa waits in her lair.',
  backgroundColor: 0x0a1014,
  tips: [
    'Medusa’s sisters guard her. Cut them in order: Stheno first, then Euryale.',
    'With both sisters down Medusa is exposed for a few seconds. Strike then.',
    'Her gaze sweeps slowly, and it hits hard. Leave the cone before it lands.',
    'Below half her strength she unveils her face: a ring of statues rises round her with four ways out.',
    'The Graeae throw their one eye’s glare from afar. Close in on them.',
    'The Petrified Heroes are slow, but nothing pushes them back.',
    'The Stars of Perseus last until August 19. Their items appear only while they last.',
  ],
  // A clear August night by the sea, pale green starlight.
  atmosphere: {
    ambient: 0x708a8a,
    fog: 0x8aa0a0,
    particles: 0xd0fff0,
    ambience: {
      weather: { kind: 'fireflies', rate: 5, color: 0xd8f0ff, wind: 8 },
      lightning: { every: [10, 20], color: 0xd8f0ff },
      glints: { terrain: ['shallows'], color: 0xe0fff0 },
      wildlife: { kind: 'bird', sprite: 'gull', count: 5 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'sand', color: 0x8a8070, texture: { kind: 'ash', strength: 0.4 } },
        { id: 'rock', color: 0x5a6060, texture: { kind: 'cracks', strength: 0.7 } },
        { id: 'sea_grass', color: 0x4a6a58, texture: { kind: 'grass', strength: 0.6 } },
        {
          id: 'shallows',
          color: 0x3a6a70,
          texture: { kind: 'ripples', strength: 0.7 },
          footing: { speed: 0.75 },
        },
        { id: 'pale_slabs', color: 0x8a9090, texture: { kind: 'slabs' } },
        { id: 'sea', color: 0x0c1c22 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.18, terrain: 'shallows' },
        { below: 0.5, terrain: 'sand' },
        { below: 0.78, terrain: 'rock' },
        { below: 1.01, terrain: 'sea_grass' },
      ],
      plaza: 'pale_slabs',
      border: 'sea',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 64,
        visual: { sprite: 'gorgoneion', color: 0x9a9a92 },
        light: { radius: 240, color: 0x9affc8, intensity: 0.8, flicker: 0.15 },
      },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xb8b8b0 } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x6a7070 } },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xd0d4d0 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xc0c4c0 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xb0b4b0 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x8a908c } },
      { id: 'cypress', radius: 18, visual: { sprite: 'cypress', color: 0x1e2a1e }, sway: 0.03 },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 230, color: 0xffb060, intensity: 0.9, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'pale_slabs' },
      {
        type: 'ring',
        kind: 'statue',
        count: [4, 6],
        radius: [110, 170],
        pieces: 8,
        missingChance: 0.2,
        plazaTerrain: 'pale_slabs',
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
        count: [2, 4],
        length: [160, 300],
        spacing: 66,
        missingChance: 0.3,
      },
      { type: 'cluster', kind: 'statue', count: [6, 9], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'statue', density: 4 },
      { kind: 'rock', density: 5, terrain: ['rock', 'sand'] },
      { kind: 'cypress', density: 1.5, terrain: ['sea_grass'] },
    ],
    props: {
      kinds: [
        { id: 'amphora', radius: 14, visual: { sprite: 'prop_amphora_pale', color: 0xc8a77a } },
        { id: 'crate', radius: 15, visual: { sprite: 'prop_crate', color: 0x7a5a3a } },
      ],
      clusters: 10,
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
        id: 'shells',
        terrain: ['sand'],
        density: 50,
        visual: { sprite: 'shells', color: 0xe8dcc8 },
      },
      {
        id: 'seaweed',
        terrain: ['shallows', 'sand'],
        density: 40,
        visual: { sprite: 'seaweed', color: 0x3a6a3a },
        sway: 0.15,
      },
      {
        id: 'marble_shards',
        terrain: ['rock', 'pale_slabs'],
        density: 50,
        visual: { sprite: 'marble_shards', color: 0xc8c8c0 },
      },
      {
        id: 'grass_tuft',
        terrain: ['sea_grass'],
        density: 50,
        visual: { sprite: 'grass_tuft', color: 0x6a8a6a },
        sway: 0.15,
      },
    ],
  },
  ...hostRealm(
    { fodder: 'gorgon_brood', quick: 'stone_lamia', ranged: 'graea', heavy: 'petrified_hero' },
    'medusa',
  ),
};

/** Offered only in the Stars of Perseus (spec: seasonal-events / event items). */
const SHIELD_OF_PERSEUS: WeaponDefinition = {
  id: 'shield_of_perseus',
  name: 'Shield of Perseus',
  description:
    'The mirror shield flashes round you, throwing foes back and leaving some frozen in place.',
  event: 'stars_of_perseus',
  element: 'physical',
  behavior: 'nova',
  base: {
    damage: 18,
    cooldown: 2.2,
    amount: 1,
    speed: 0,
    pierce: -1,
    size: 120,
    range: 0,
    arc: 0,
    duration: 0,
    knockback: 260,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'stun', chance: 0.25, duration: 0.8, potency: 0 }],
  levels: [
    { text: '+7 damage.', damage: 7 },
    { text: 'A wider flash.', size: 25 },
    { text: '+8 damage, faster.', damage: 8, cooldown: -0.4 },
    { text: 'Wider still.', size: 30 },
    { text: '+10 damage, faster.', damage: 10, cooldown: -0.3 },
  ],
  visual: { sprite: 'shield_of_perseus', color: 0xc8e0d8 },
};

const WINGED_SANDALS: RelicDefinition = {
  id: 'winged_sandals',
  name: 'Winged Sandals',
  event: 'stars_of_perseus',
  description: '+12% move speed, +10% projectile speed.',
  modifiers: [
    { stat: 'moveSpeed', percent: 0.12 },
    { stat: 'projectileSpeed', flat: 0.1 },
  ],
  visual: { sprite: 'winged_sandals', color: 0xd8c890 },
};

export const PERSEUS_PACK: EventPack = {
  event: STARS_OF_PERSEUS,
  realm: ISLE_OF_GORGONS,
  boss: MEDUSA,
  enemies: PERSEUS_ENEMIES,
  weapons: [SHIELD_OF_PERSEUS],
  relics: [WINGED_SANDALS],
  rewards: eventShop(
    'stars_of_perseus',
    {
      id: 'starfall',
      name: 'Starfall',
      description: '+10% critical damage in every run.',
      modifiers: [{ stat: 'critMultiplier', flat: 0.1 }],
      sprite: 'meteor_stone',
    },
    { id: 'skywalker', name: 'Skywalker', item: WINGED_SANDALS },
    { id: 'mirrorbearer', name: 'Mirrorbearer', item: SHIELD_OF_PERSEUS },
  ),
  achievements: eventAchievements(
    'isle_of_gorgons',
    {
      id: 'gorgon_slayer',
      name: 'Gorgon-Slayer',
      description: 'Defeat Medusa on the Isle of the Gorgons.',
      sprite: 'shield_of_perseus',
    },
    {
      id: 'unpetrified',
      name: 'Not Yet Stone',
      description: 'Survive 10 minutes from the Isle of the Gorgons.',
      sprite: 'winged_sandals',
    },
  ),
};
