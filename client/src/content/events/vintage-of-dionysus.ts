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
  walls,
} from './shared';

/**
 * The Vintage of Dionysus (the grape harvest and the autumn feasts; spec: seasonal-events / the vintage of dionysus):
 * the vines of Naxos are heavy with grapes, and the god of wine and madness rides among them with his panthers.
 */
const VINTAGE_OF_DIONYSUS: EventDefinition = {
  id: 'vintage_of_dionysus',
  name: 'The Vintage of Dionysus',
  tagline: 'The grapes are in, the wine flows, and Dionysus brings his madness to Naxos.',
  window: { from: '09-15', to: '09-28' },
  accent: 0xb06ad8,
  currency: { name: 'Grapes', sprite: 'grapes', chance: 0.02, elite: 3, boss: 15 },
};

const DIONYSUS_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'tyrrhenian_pirate',
    name: 'Tyrrhenian Pirate',
    health: 32,
    speed: 74,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.12, amount: 2 },
    knockbackResist: 0.05,
    behavior: { type: 'chaser', jitter: 0.35 },
    visual: { sprite: 'tyrrhenian_pirate', color: 0x9a8ab0 },
  },
  {
    id: 'panther_of_dionysus',
    name: 'Panther of Dionysus',
    health: 40,
    speed: 138,
    damage: 9,
    radius: 16,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.5 },
    visual: { sprite: 'panther_of_dionysus', color: 0xd8b060 },
  },
  {
    id: 'bacchant',
    name: 'Bacchant',
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
      projectileSprite: 'pinecone_shot',
    },
    visual: { sprite: 'bacchant', color: 0xc080d0 },
  },
  {
    id: 'drunken_centaur',
    name: 'Drunken Centaur',
    health: 100,
    speed: 98,
    damage: 14,
    radius: 19,
    xp: 4,
    gold: { chance: 0.25, amount: 4 },
    knockbackResist: 0.5,
    behavior: {
      type: 'charger',
      triggerRange: 330,
      windup: 0.8,
      dashSpeed: 520,
      dashDuration: 0.65,
      cooldown: 3,
    },
    visual: { sprite: 'drunken_centaur', color: 0x9a6a8a },
  },
];

/** One of Dionysus' panthers: it guards him and lashes out; slain, it does not come back. */
const panther = (id: string, name: string, angle: number): BossPartDefinition => ({
  id,
  name,
  radius: 20,
  place: { from: 'boss', angle, distance: 96 },
  attacks: [
    { type: 'lash', id: 'panther_pounce', windup: 0.7, length: 300, width: 64, damage: 26 },
  ],
  pause: 3.4,
  delay: angle > 0 ? 2.2 : 1.2,
  health: 2600,
  visual: { sprite: 'panther_of_dionysus', color: 0xd8b060 },
});

/**
 * Dionysus (spec: seasonal-events / the vintage of dionysus): two panthers guard him and never return once slain. He
 * whirls his thyrsus in cones, wine rains on circles, and below half health the vines close in.
 */
const DIONYSUS: BossDefinition = {
  id: 'dionysus',
  name: 'Dionysus',
  title: 'God of the Vine, Bringer of Madness',
  health: 14000,
  radius: 44,
  speed: 72,
  contactDamage: 30,
  xp: 0,
  gold: 400,
  attackPause: 1.4,
  guard: 0.3,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Dionysus rides in among the vines!',
      attacks: [
        sweep('thyrsus_whirl', 0.9, 240, 1.1, 26, 3, 0.4),
        boulders('rain_of_wine', 1.2, 70, 26, 6, 260),
        summon('call_the_bacchants', 'bacchant', 4),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.3,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'Madness takes the vineyard!',
      attacks: [
        walls('the_vines_close', 1.3, 9, 26, [190, 310], 5, 0.3),
        charge('frenzy', 1, 560, 86, 32, 940),
        boulders('rain_of_wine', 1.1, 70, 28, 8, 300),
        sweep('thyrsus_whirl', 0.8, 260, 1.2, 28, 4, 0.35),
      ],
    },
  ],
  parts: [
    panther('left_panther', 'The left panther', -Math.PI / 2),
    panther('right_panther', 'The right panther', Math.PI / 2),
  ],
  visual: { sprite: 'dionysus', color: 0xc890e0 },
};

/** The Vineyards of Naxos: terraces of vines in rows, grape presses, and the pirates' ship overgrown with ivy. */
const VINEYARDS_OF_NAXOS: RealmDefinition = {
  id: 'vineyards_of_naxos',
  name: 'The Vineyards of Naxos',
  event: 'vintage_of_dionysus',
  description:
    'Terraced vineyards over the wine-dark sea, heavy with grapes at the end of summer. The god of madness has come for the vintage.',
  backgroundColor: 0x140c16,
  tips: [
    'Two panthers guard Dionysus: while one lives he takes less damage. Slain, they do not return.',
    'His thyrsus whirls in cones before him. Step out of them.',
    'Below half his strength madness takes the vineyard: vines close round him with five ways out, and he charges.',
    'The Panthers are quick. Keep moving.',
    'The Bacchants throw pinecones from afar. Close in on them.',
    'The Drunken Centaurs stop before they charge. When they stop, move.',
    'The Vintage of Dionysus lasts until September 28. Its items appear only while it lasts.',
  ],
  // A warm late-summer dusk, purple and gold.
  atmosphere: {
    ambient: 0x9a8098,
    fog: 0xb090a8,
    particles: 0xffd0f0,
    ambience: {
      weather: { kind: 'leaves', sprite: 'leaf_vine', rate: 4, color: 0x8a9a3a, wind: 12 },
      clouds: 0.12,
      wildlife: { kind: 'bird', sprite: 'dove', count: 5 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'vineyard_earth', color: 0x6a4e3e, texture: { kind: 'earth' } },
        { id: 'grass', color: 0x5a6a3a, texture: { kind: 'grass' } },
        { id: 'pressed_must', color: 0x5a2e4a, texture: { kind: 'mud', strength: 0.6 } },
        { id: 'terrace_slabs', color: 0xa89888, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x140c14 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.16, terrain: 'pressed_must' },
        { below: 0.62, terrain: 'vineyard_earth' },
        { below: 1.01, terrain: 'grass' },
      ],
      plaza: 'terrace_slabs',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 70,
        visual: { sprite: 'ivy_ship', color: 0x6a5a40 },
        light: { radius: 250, color: 0xffc8f0, intensity: 0.8, flicker: 0.2 },
      },
      { id: 'vine', radius: 15, visual: { sprite: 'vine_trellis', color: 0x5a7a2e } },
      {
        id: 'olive_tree',
        radius: 18,
        visual: { sprite: 'olive_tree', color: 0x4e623a },
        sway: 0.03,
      },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xe8e2d4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xd8d0bf } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xe0d8c8 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xd0c8b8 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0xb0a490 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 230, color: 0xffb070, intensity: 0.9, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'terrace_slabs' },
      {
        type: 'ring',
        kind: 'column',
        count: [3, 5],
        radius: [120, 170],
        pieces: 9,
        missingChance: 0.3,
        plazaTerrain: 'terrace_slabs',
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
      // Rows of vines across the terraces.
      {
        type: 'walls',
        kind: 'vine',
        count: [6, 9],
        length: [200, 340],
        spacing: 46,
        missingChance: 0.2,
      },
      { type: 'cluster', kind: 'olive_tree', count: [5, 8], size: [2, 4], spread: 80 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'vine', density: 5, terrain: ['vineyard_earth'] },
      { kind: 'olive_tree', density: 3, terrain: ['grass'] },
      { kind: 'statue', density: 0.5 },
    ],
    props: {
      kinds: [
        {
          id: 'wine_amphora',
          radius: 14,
          visual: { sprite: 'prop_amphora_wine', color: 0x8a3a5a },
        },
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
      ],
      clusters: 14,
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
        id: 'fallen_grapes',
        terrain: ['vineyard_earth', 'pressed_must'],
        density: 50,
        visual: { sprite: 'fallen_grapes', color: 0x6a2a6a },
      },
      {
        id: 'grass_tuft',
        terrain: ['grass'],
        density: 60,
        visual: { sprite: 'grass_tuft', color: 0x7a8a4a },
        sway: 0.15,
      },
      {
        id: 'pebbles',
        terrain: ['vineyard_earth', 'terrace_slabs'],
        density: 40,
        visual: { sprite: 'pebbles', color: 0x9a8a7a },
      },
    ],
  },
  ...hostRealm(
    {
      fodder: 'tyrrhenian_pirate',
      quick: 'panther_of_dionysus',
      ranged: 'bacchant',
      heavy: 'drunken_centaur',
    },
    'dionysus',
  ),
};

/** Offered only in the Vintage of Dionysus (spec: seasonal-events / event items). */
const THYRSUS: WeaponDefinition = {
  id: 'thyrsus',
  name: 'Thyrsus',
  description: 'Ivy-wound staves circle you, tangling what they strike.',
  event: 'vintage_of_dionysus',
  element: 'physical',
  behavior: 'orbit',
  base: {
    damage: 11,
    cooldown: 0.6,
    amount: 2,
    speed: 2.6,
    pierce: -1,
    size: 14,
    range: 110,
    arc: 0,
    duration: 1.2,
    knockback: 60,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'slow', chance: 0.35, duration: 1.5, potency: 0.3 }],
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: '+1 thyrsus.', amount: 1 },
    { text: 'A wider circle.', range: 20, size: 3 },
    { text: '+6 damage.', damage: 6 },
    { text: '+1 thyrsus, faster.', amount: 1, speed: 0.7 },
  ],
  visual: { sprite: 'thyrsus', color: 0x9ab850, projectile: 'thyrsus_staff' },
};

const CUP_OF_DIONYSUS: RelicDefinition = {
  id: 'cup_of_dionysus',
  name: 'Cup of Dionysus',
  event: 'vintage_of_dionysus',
  description: '+3% life steal, +10 max health.',
  modifiers: [
    { stat: 'lifesteal', flat: 0.03 },
    { stat: 'maxHealth', flat: 10 },
  ],
  visual: { sprite: 'cup_of_dionysus', color: 0xb06ad8 },
};

export const DIONYSUS_PACK: EventPack = {
  event: VINTAGE_OF_DIONYSUS,
  realm: VINEYARDS_OF_NAXOS,
  boss: DIONYSUS,
  enemies: DIONYSUS_ENEMIES,
  weapons: [THYRSUS],
  relics: [CUP_OF_DIONYSUS],
  rewards: eventShop(
    'vintage_of_dionysus',
    {
      id: 'good_vintage',
      name: 'A Good Vintage',
      description: '+1% life steal in every run.',
      modifiers: [{ stat: 'lifesteal', flat: 0.01 }],
      sprite: 'grapes',
    },
    { id: 'cupbearer', name: 'Cupbearer', item: CUP_OF_DIONYSUS },
    { id: 'reveller', name: 'Reveller', item: THYRSUS },
  ),
  achievements: eventAchievements(
    'vineyards_of_naxos',
    {
      id: 'sober_god',
      name: 'Sober as a God',
      description: 'Defeat Dionysus in the Vineyards of Naxos.',
      sprite: 'thyrsus',
    },
    {
      id: 'the_last_vintage',
      name: 'The Last Vintage',
      description: 'Survive 10 minutes from the Vineyards of Naxos.',
      sprite: 'cup_of_dionysus',
    },
  ),
};
