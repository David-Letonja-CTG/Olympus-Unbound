import type {
  BossDefinition,
  EventRewardDefinition,
  EnemyDefinition,
  EventDefinition,
  RealmDefinition,
  RelicDefinition,
  WeaponDefinition,
} from '../engine';

/**
 * Seasonal events (spec: seasonal-events): each brings a realm outside the chain, its host, its boss and its items,
 * only while it is on. The cast reuses the rendered sheets, recoloured (D15, as for Mount Othrys).
 */
export const EVENTS: readonly EventDefinition[] = [
  {
    id: 'night_of_hecate',
    name: 'The Night of Hecate',
    tagline: 'The dead walk the crossroads. Hecate holds the keys.',
    window: { from: '10-24', to: '11-07' },
    accent: 0xff8a2a,
    // Honey cakes: the offering that calms Cerberus at the gates of the dead.
    currency: { name: 'Honey cakes', chance: 0.02, elite: 3, boss: 15 },
  },
];

// ---------------------------------------------------------------------------------------------------------------
// The Night of Hecate (Halloween)

export const HECATE_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'restless_dead',
    name: 'Restless Dead',
    health: 30,
    speed: 76,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.4 },
    visual: { sprite: 'restless_dead', color: 0x8ad8a8 },
  },
  {
    id: 'empusa',
    name: 'Empusa',
    health: 44,
    speed: 128,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.55 },
    visual: { sprite: 'empusa', color: 0xd04a9a },
  },
  {
    id: 'lampad_of_hecate',
    name: 'Lampad of Hecate',
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
      cooldown: 1.9,
      projectileSpeed: 310,
      projectileDamage: 9,
      projectileRadius: 8,
      projectileSprite: 'hecate_fire',
    },
    visual: { sprite: 'lampad_of_hecate', color: 0xff9a3a },
  },
  {
    id: 'hound_of_hecate',
    name: 'Hound of Hecate',
    health: 90,
    speed: 104,
    damage: 13,
    radius: 19,
    xp: 4,
    gold: { chance: 0.25, amount: 4 },
    knockbackResist: 0.5,
    behavior: {
      type: 'charger',
      triggerRange: 320,
      windup: 0.7,
      dashSpeed: 500,
      dashDuration: 0.6,
      cooldown: 3,
    },
    visual: { sprite: 'hound_of_hecate', color: 0x2e3a34 },
  },
];

/**
 * Hecate, goddess of the crossroads, of witchcraft and of ghosts (spec: seasonal-events / Hecate). Her three torches,
 * carried by her Lampades, guard her: while one burns she takes a third of the damage. Put them out; they relight.
 */
export const HECATE: BossDefinition = {
  id: 'hecate',
  name: 'Hecate',
  title: 'Queen of the Crossroads, Keeper of the Keys',
  health: 14000,
  radius: 46,
  speed: 66,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.5,
  guard: 0.35,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Hecate lights her torches at the crossroads!',
      attacks: [
        {
          type: 'boulder',
          id: 'ghost_fire',
          windup: 1.2,
          radius: 70,
          damage: 28,
          count: 5,
          spread: 240,
        },
        { type: 'summon', id: 'call_the_dead', enemy: 'restless_dead', count: 5 },
        { type: 'slam', id: 'keys_of_hades', windup: 1, radius: 170, damage: 32 },
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'The three roads close!',
      attacks: [
        // The crossroads: rings of stone with three ways out.
        {
          type: 'walls',
          id: 'the_three_roads',
          windup: 1.3,
          duration: 9,
          damage: 26,
          rings: [190, 310],
          segments: 3,
          gapShare: 0.3,
        },
        {
          type: 'boulder',
          id: 'ghost_fire',
          windup: 1.1,
          radius: 70,
          damage: 30,
          count: 7,
          spread: 280,
        },
        { type: 'summon', id: 'call_the_hounds', enemy: 'hound_of_hecate', count: 3 },
        { type: 'slam', id: 'keys_of_hades', windup: 0.9, radius: 190, damage: 34 },
      ],
    },
  ],
  parts: [0, 1, 2].map((i) => ({
    id: ['maiden_torch', 'mother_torch', 'crone_torch'][i],
    name: ['The Maiden’s torch', 'The Mother’s torch', 'The Crone’s torch'][i],
    radius: 16,
    place: { from: 'boss' as const, angle: (i * Math.PI * 2) / 3, distance: 90 },
    attacks: [
      {
        type: 'lash' as const,
        id: 'torch_lash',
        windup: 0.8,
        length: 320,
        width: 60,
        damage: 24,
      },
    ],
    pause: 4 + i * 0.7,
    delay: 1.5 + i,
    health: 1600,
    regrow: 18,
    visual: { sprite: 'hecate_torch_bearer', color: 0xff9a3a },
  })),
  visual: { sprite: 'hecate', color: 0x9a8ad8 },
};

/** The Crossroads of Hecate: a moonlit graveyard where three roads meet, lit by carved gourd lanterns. */
export const CROSSROADS_OF_HECATE: RealmDefinition = {
  id: 'crossroads_of_hecate',
  name: 'Crossroads of Hecate',
  event: 'night_of_hecate',
  description:
    'A moonlit graveyard where three roads meet. Gourd lanterns burn for the dead, and Hecate keeps the keys.',
  backgroundColor: 0x0e0c14,
  tips: [
    'Hecate’s three torches guard her: while one burns she takes a third of the damage. Put them out first.',
    'Her torches relight after a while. Strike her while they are dark.',
    'Below half her strength the three roads close: stone rings rise round her with three ways out.',
    'The Empusae are quick and hungry. Keep moving.',
    'The Lampades carried torches for Hecate. Now they throw them.',
    'Hecate’s hounds stop before they spring. When they stop, move.',
    'The Night of Hecate lasts until November 7. Its items appear only while it lasts.',
  ],
  // Moonlight and lantern-glow: a cold violet night, mist, and orange sparks over the graves.
  atmosphere: { ambient: 0x6a6488, fog: 0x7a7896, particles: 0xffa050 },
  map: {
    widthTiles: 64,
    heightTiles: 64,
    tileSize: 64,
    borderTiles: 3,
    terrain: {
      types: [
        { id: 'grave_earth', color: 0x3a342c, texture: { kind: 'earth' } },
        { id: 'moss', color: 0x2e3a2a, texture: { kind: 'moss' } },
        { id: 'dead_grass', color: 0x4a4434, texture: { kind: 'grass', strength: 0.8 } },
        { id: 'flagstones', color: 0x6a6670, texture: { kind: 'slabs' } },
        { id: 'void', color: 0x07060a },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.34, terrain: 'moss' },
        { below: 0.68, terrain: 'grave_earth' },
        { below: 1.01, terrain: 'dead_grass' },
      ],
      plaza: 'flagstones',
      border: 'void',
    },
    spawnClearRadius: 260,
    bossArena: { radius: 320, minDistanceFromSpawn: 1300 },
    minObstacleGap: 46,
    maxObstacles: 260,
    obstacles: [
      // The realm's landmark (spec: arena-generation / landmarks).
      {
        id: 'landmark',
        radius: 56,
        visual: { sprite: 'hekataion', color: 0x8a8070 },
        light: { radius: 260, color: 0xff9a40, intensity: 1, flicker: 0.35 },
      },
      { id: 'stele', radius: 14, visual: { sprite: 'grave_stele', color: 0x8a8690 } },
      { id: 'dead_tree', radius: 16, visual: { sprite: 'dead_tree', color: 0x2a2420 } },
      { id: 'cypress', radius: 18, visual: { sprite: 'cypress', color: 0x1e2a1e } },
      { id: 'altar', radius: 26, visual: { sprite: 'black_altar', color: 0x2a2228 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0x9a96a0 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x6a6670 } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x4a4650 } },
      {
        id: 'gourd',
        radius: 13,
        visual: { sprite: 'gourd_lantern', color: 0xff8a2a },
        light: { radius: 230, color: 0xff9a40, intensity: 0.95, flicker: 0.4 },
      },
    ],
    roads: { width: 64, wander: 90 },
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'flagstones' },
      {
        type: 'ring',
        kind: 'stele',
        count: [4, 6],
        radius: [120, 180],
        pieces: 9,
        missingChance: 0.3,
        plazaTerrain: 'flagstones',
      },
      {
        type: 'temple',
        column: 'cypress',
        fallen: 'dead_tree',
        altar: 'altar',
        light: 'gourd',
        size: [480, 320],
        spacing: 90,
        fallenChance: 0.3,
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
      { type: 'cluster', kind: 'gourd', count: [6, 9], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'gourd', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'stele', density: 6, terrain: ['grave_earth', 'moss'] },
      { kind: 'dead_tree', density: 2 },
      { kind: 'rock', density: 3 },
      { kind: 'statue', density: 0.5 },
    ],
    // Jars and crates a god breaks by walking into them (spec: arena-generation / breakable props).
    props: {
      kinds: [
        { id: 'offering_gourd', radius: 15, visual: { sprite: 'prop_gourd', color: 0xd0782a } },
      ],
      clusters: 12,
    },
    decorations: [
      {
        id: 'bones',
        terrain: ['grave_earth'],
        density: 40,
        visual: { sprite: 'bones', color: 0xcfc6b4 },
      },
      {
        id: 'asphodel',
        terrain: ['moss', 'dead_grass'],
        density: 60,
        visual: { sprite: 'asphodel', color: 0xe8e0c8 },
      },
      {
        id: 'grass_tuft',
        terrain: ['dead_grass'],
        density: 70,
        visual: { sprite: 'grass_tuft', color: 0x6a6448 },
      },
      {
        id: 'ash_pebbles',
        terrain: ['flagstones', 'grave_earth'],
        density: 50,
        visual: { sprite: 'ash_pebbles', color: 0x5a5660 },
      },
    ],
  },
  timeline: [
    { from: 0, rate: 1.4, maxAlive: 45, enemies: [{ id: 'restless_dead', weight: 1 }] },
    {
      from: 40,
      rate: 2,
      maxAlive: 75,
      enemies: [
        { id: 'restless_dead', weight: 3 },
        { id: 'empusa', weight: 1 },
      ],
      groups: [{ id: 'restless_dead', size: [6, 10], every: 18 }],
    },
    {
      from: 90,
      rate: 2.6,
      maxAlive: 105,
      enemies: [
        { id: 'restless_dead', weight: 3 },
        { id: 'empusa', weight: 1.5 },
        { id: 'lampad_of_hecate', weight: 1 },
      ],
      groups: [{ id: 'restless_dead', size: [8, 12], every: 16 }],
    },
    {
      from: 150,
      rate: 3.1,
      maxAlive: 140,
      enemies: [
        { id: 'restless_dead', weight: 2.5 },
        { id: 'empusa', weight: 2 },
        { id: 'lampad_of_hecate', weight: 1.5 },
        { id: 'hound_of_hecate', weight: 0.8 },
      ],
    },
    {
      from: 210,
      rate: 3.7,
      maxAlive: 175,
      enemies: [
        { id: 'restless_dead', weight: 2 },
        { id: 'empusa', weight: 2 },
        { id: 'lampad_of_hecate', weight: 2 },
        { id: 'hound_of_hecate', weight: 1.2 },
      ],
      groups: [{ id: 'restless_dead', size: [10, 14], every: 15 }],
    },
    {
      from: 270,
      rate: 4.3,
      maxAlive: 215,
      enemies: [
        { id: 'restless_dead', weight: 2 },
        { id: 'empusa', weight: 2 },
        { id: 'lampad_of_hecate', weight: 2 },
        { id: 'hound_of_hecate', weight: 1.6 },
      ],
    },
    {
      from: 330,
      rate: 5,
      maxAlive: 255,
      enemies: [
        { id: 'restless_dead', weight: 1.5 },
        { id: 'empusa', weight: 2 },
        { id: 'lampad_of_hecate', weight: 2 },
        { id: 'hound_of_hecate', weight: 2 },
      ],
    },
    {
      from: 390,
      rate: 5.6,
      maxAlive: 290,
      enemies: [
        { id: 'restless_dead', weight: 1.5 },
        { id: 'empusa', weight: 2 },
        { id: 'lampad_of_hecate', weight: 2 },
        { id: 'hound_of_hecate', weight: 2 },
      ],
    },
  ],
  events: [
    { at: 60, type: 'horde', enemy: 'restless_dead', count: 34 },
    { at: 120, type: 'elite', enemy: 'empusa' },
    { at: 180, type: 'horde', enemy: 'empusa', count: 18 },
    { at: 240, type: 'elite', enemy: 'hound_of_hecate' },
    { at: 300, type: 'horde', enemy: 'restless_dead', count: 44 },
    { at: 330, type: 'elite', enemy: 'lampad_of_hecate' },
    { at: 375, type: 'elite', enemy: 'hound_of_hecate' },
  ],
  scaling: { healthPerMinute: 0.12, damagePerMinute: 0.05, max: 2.2 },
  elite: { health: 12, damage: 1.6, size: 1.5, gold: 15, xp: 10 },
  boss: { id: 'hecate', at: 420, spawnRateMultiplier: 0.45 },
  rewards: { bossGold: 400 },
};

/** Offered only on the Night of Hecate (spec: seasonal-events / event items). */
export const HECATE_WEAPONS: readonly WeaponDefinition[] = [
  {
    id: 'hecates_torches',
    name: 'Hecate’s Torches',
    description: 'Torches of the crossroads circle you and set the dead alight.',
    event: 'night_of_hecate',
    element: 'fire',
    behavior: 'orbit',
    base: {
      damage: 10,
      cooldown: 0.6,
      amount: 2,
      speed: 2.8,
      pierce: -1,
      size: 14,
      range: 104,
      arc: 0,
      duration: 1.2,
      knockback: 70,
      chains: 0,
      critChance: 0,
      homing: 0,
    },
    effects: [{ effect: 'burn', chance: 0.35, duration: 2, potency: 0.3 }],
    levels: [
      { text: '+5 damage.', damage: 5 },
      { text: '+1 torch.', amount: 1 },
      { text: 'Wider circle, fiercer burns.', range: 18, size: 3 },
      { text: '+6 damage.', damage: 6 },
      { text: '+1 torch, faster.', amount: 1, speed: 0.8 },
    ],
    visual: { sprite: 'hecates_torches', color: 0xff8a2a, projectile: 'torch_flame' },
  },
];

export const HECATE_RELICS: readonly RelicDefinition[] = [
  {
    id: 'key_of_hecate',
    name: 'Key of Hecate',
    event: 'night_of_hecate',
    description: '+20% fire and shadow damage, +10% XP.',
    modifiers: [
      { stat: 'fireDamage', flat: 0.2 },
      { stat: 'shadowDamage', flat: 0.2 },
      { stat: 'xpGain', flat: 0.1 },
    ],
    visual: { sprite: 'key_of_hecate', color: 0xc8a0ff },
  },
];

/** What honey cakes buy (spec: seasonal-events / event shop): kept for good, whenever bought. */
export const EVENT_REWARDS: readonly EventRewardDefinition[] = [
  {
    id: 'hecates_blessing',
    event: 'night_of_hecate',
    name: 'Hecate’s Blessing',
    description: '+5% XP in every run.',
    cost: 40,
    effect: { type: 'modifiers', modifiers: [{ stat: 'xpGain', flat: 0.05 }] },
    sprite: 'honey_cake',
  },
  {
    id: 'keykeeper',
    event: 'night_of_hecate',
    name: 'Keykeeper',
    description: 'The Key of Hecate may be offered in every run, all year.',
    cost: 60,
    effect: { type: 'unlock', item: 'key_of_hecate' },
    sprite: 'key_of_hecate',
  },
  {
    id: 'torchbearer',
    event: 'night_of_hecate',
    name: 'Torchbearer',
    description: 'Hecate’s Torches may be offered in every run, all year.',
    cost: 80,
    effect: { type: 'unlock', item: 'hecates_torches' },
    sprite: 'hecates_torches',
  },
  {
    id: 'ward_of_the_crossroads',
    event: 'night_of_hecate',
    name: 'Ward of the Crossroads',
    description: '+1 armour in every run.',
    cost: 120,
    effect: { type: 'modifiers', modifiers: [{ stat: 'armor', flat: 1 }] },
    sprite: 'honey_cake',
  },
];
