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
  devour,
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
 * The Hunger of Erysichthon (the harvest feasts of late November; spec: seasonal-events / the hunger of
 * erysichthon): the king who felled Demeter's sacred oak, cursed with a hunger nothing can fill, has eaten his
 * kingdom bare and comes for the harvest.
 */
const HUNGER_OF_ERYSICHTHON: EventDefinition = {
  id: 'hunger_of_erysichthon',
  name: 'The Hunger of Erysichthon',
  tagline: 'The king who felled Demeter’s oak hungers still. Save the harvest.',
  window: { from: '11-16', to: '11-30' },
  accent: 0xe0a040,
  currency: { name: 'Wheat sheaves', sprite: 'wheat_sheaf', chance: 0.02, elite: 3, boss: 15 },
};

const HUNGER_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'famished_shade',
    name: 'Famished Shade',
    health: 30,
    speed: 78,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.45 },
    visual: { sprite: 'famished_shade', color: 0xc8b880 },
  },
  {
    id: 'famine_crow',
    name: 'Famine Crow',
    health: 38,
    speed: 136,
    damage: 8,
    radius: 14,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.05,
    behavior: { type: 'chaser', jitter: 0.65 },
    visual: { sprite: 'famine_crow', color: 0x3a3440 },
  },
  {
    id: 'priestess_of_demeter',
    name: 'Priestess of Demeter',
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
      projectileSprite: 'sickle_shot',
    },
    visual: { sprite: 'priestess_of_demeter', color: 0xe8c070 },
  },
  {
    id: 'famished_giant',
    name: 'Famished Giant',
    health: 130,
    speed: 60,
    damage: 15,
    radius: 22,
    xp: 5,
    gold: { chance: 0.35, amount: 5 },
    knockbackResist: 0.7,
    behavior: { type: 'chaser', jitter: 0.1 },
    visual: { sprite: 'famished_giant', color: 0x9a8a6a },
  },
];

/**
 * Erysichthon (spec: seasonal-events / the hunger of erysichthon): he swings the axe that felled the oak and brings
 * branches down; below half health his hunger draws the gods to his mouth, and the famine closes round him.
 */
const ERYSICHTHON: BossDefinition = {
  id: 'erysichthon',
  name: 'Erysichthon',
  title: 'The Insatiable, Feller of the Sacred Oak',
  health: 15000,
  radius: 48,
  speed: 68,
  contactDamage: 32,
  xp: 0,
  gold: 400,
  attackPause: 1.4,
  chargeStun: 1.5,
  phases: [
    {
      below: 1,
      speedMultiplier: 1,
      announcement: 'Erysichthon stumbles out of the stripped fields, starving!',
      attacks: [
        slam('the_axe', 1, 180, 32),
        boulders('falling_branches', 1.2, 74, 26, 6, 260),
        charge('ravenous_rush', 1.1, 520, 90, 30, 860),
        summon('call_the_crows', 'famine_crow', 6),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'His hunger knows no end!',
      attacks: [
        devour('insatiable_hunger', 1.5, 400, 220, 140, 40),
        walls('the_famine', 1.3, 9, 26, [190, 310], 3, 0.3),
        boulders('falling_branches', 1.1, 74, 28, 8, 300),
        charge('ravenous_rush', 1, 580, 94, 32, 940),
      ],
    },
  ],
  visual: { sprite: 'erysichthon', color: 0xd8c090 },
};

/** The Grove of Demeter: autumn wheat, stripped fields and the great felled oak of the goddess. */
const GROVE_OF_DEMETER: RealmDefinition = {
  id: 'grove_of_demeter',
  name: 'The Grove of Demeter',
  event: 'hunger_of_erysichthon',
  description:
    'Demeter’s sacred grove in late autumn, its great oak felled and its fields stripped bare. What wheat is left stands gold in the dusk.',
  backgroundColor: 0x16100a,
  tips: [
    'Erysichthon swings the axe that felled the oak: step out of the ring it marks.',
    'His rush runs along the line he marks. Into a wall, he stands dazed.',
    'Below half his strength his hunger draws every god in its ring to his mouth. Run, or dash out.',
    'The Famine Crows come in flocks. Keep moving.',
    'Demeter’s priestesses throw sickles from afar. Close in on them.',
    'The Famished Giants are slow, but nothing pushes them back.',
    'The Hunger of Erysichthon lasts until November 30. Its items appear only while it lasts.',
  ],
  // A gold and russet autumn dusk, leaves on the wind.
  atmosphere: {
    ambient: 0xa08a6a,
    fog: 0xb89a70,
    particles: 0xffd890,
    ambience: {
      weather: { kind: 'leaves', sprite: 'leaf_autumn', rate: 7, color: 0xc8702a, wind: 22 },
      clouds: 0.2,
      smoke: 0x8a7a68,
      wildlife: { kind: 'bird', sprite: 'crow', count: 7 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'wheat', color: 0x9a8440, texture: { kind: 'grass', strength: 0.9 } },
        { id: 'stubble', color: 0x7a6440, texture: { kind: 'earth' } },
        { id: 'fallen_leaves', color: 0x7a4a2a, texture: { kind: 'moss', strength: 0.6 } },
        { id: 'threshing_floor', color: 0xa8987a, texture: { kind: 'slabs' } },
        { id: 'cliff', color: 0x140e08 },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.34, terrain: 'fallen_leaves' },
        { below: 0.7, terrain: 'stubble' },
        { below: 1.01, terrain: 'wheat' },
      ],
      plaza: 'threshing_floor',
      border: 'cliff',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 72,
        visual: { sprite: 'felled_oak', color: 0x5a4430 },
        light: { radius: 240, color: 0xffc070, intensity: 0.8, flicker: 0.25 },
      },
      {
        id: 'autumn_oak',
        radius: 20,
        visual: { sprite: 'autumn_oak', color: 0xa85a2a },
        sway: 0.03,
      },
      { id: 'stump', radius: 16, visual: { sprite: 'tree_stump', color: 0x6a4a30 } },
      { id: 'haystack', radius: 18, visual: { sprite: 'haystack', color: 0xc8a050 } },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xe0d8c4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xd0c8b2 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xd8d0bc } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xc8c0aa } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0xa89a80 } },
      {
        id: 'brazier',
        radius: 14,
        visual: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 230, color: 0xffb060, intensity: 0.9, flicker: 0.35 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'threshing_floor' },
      {
        type: 'ring',
        kind: 'stump',
        count: [4, 6],
        radius: [110, 160],
        pieces: 8,
        missingChance: 0.25,
        plazaTerrain: 'threshing_floor',
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
      { type: 'cluster', kind: 'autumn_oak', count: [8, 12], size: [3, 5], spread: 100 },
      { type: 'cluster', kind: 'haystack', count: [4, 6], size: [1, 3], spread: 70 },
      { type: 'plazaLights', kind: 'brazier', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'autumn_oak', density: 8, terrain: ['fallen_leaves', 'stubble'] },
      { kind: 'stump', density: 5 },
      { kind: 'haystack', density: 1.5, terrain: ['wheat', 'stubble'] },
    ],
    props: {
      kinds: [
        { id: 'basket', radius: 14, visual: { sprite: 'prop_basket', color: 0xc8a06a } },
        { id: 'amphora', radius: 14, visual: { sprite: 'prop_amphora', color: 0xb0623a } },
      ],
      clusters: 14,
    },
    features: [
      {
        type: 'brazier',
        count: 4,
        radius: 130,
        burn: 0.08,
        every: 1,
        visual: { sprite: 'brazier_cold', color: 0x4a3e34 },
        lit: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 260, color: 0xffa050, intensity: 1, flicker: 0.35 },
      },
    ],
    decorations: [
      {
        id: 'wheat_tuft',
        terrain: ['wheat'],
        density: 110,
        visual: { sprite: 'wheat_tuft', color: 0xd8b860 },
        sway: 0.2,
      },
      {
        id: 'leaf_litter',
        terrain: ['fallen_leaves', 'stubble'],
        density: 60,
        visual: { sprite: 'leaf_litter', color: 0xb8602a },
      },
      {
        id: 'pebbles',
        terrain: ['stubble', 'threshing_floor'],
        density: 30,
        visual: { sprite: 'pebbles', color: 0x9a8a72 },
      },
    ],
  },
  ...hostRealm(
    {
      fodder: 'famished_shade',
      quick: 'famine_crow',
      ranged: 'priestess_of_demeter',
      heavy: 'famished_giant',
    },
    'erysichthon',
  ),
};

/** Offered only in the Hunger of Erysichthon (spec: seasonal-events / event items). */
const SICKLE_OF_DEMETER: WeaponDefinition = {
  id: 'sickle_of_demeter',
  name: 'Sickle of Demeter',
  description: 'The goddess’ sickle reaps a wide arc before you, and the harvest feeds you.',
  event: 'hunger_of_erysichthon',
  element: 'physical',
  behavior: 'sweep',
  base: {
    damage: 15,
    cooldown: 1.5,
    amount: 1,
    speed: 0,
    pierce: -1,
    size: 140,
    range: 140,
    arc: 2.2,
    duration: 0,
    knockback: 80,
    chains: 0,
    critChance: 0.05,
    homing: 0,
  },
  lifesteal: 0.04,
  levels: [
    { text: '+5 damage.', damage: 5 },
    { text: 'A wider reap.', arc: 0.6, size: 20, range: 20 },
    { text: '+1 reap.', amount: 1 },
    { text: '+6 damage, faster.', damage: 6, cooldown: -0.25 },
    { text: 'Wider still.', arc: 0.8, size: 25, range: 25 },
  ],
  visual: { sprite: 'sickle_of_demeter', color: 0xe0b050 },
};

const CORNUCOPIA: RelicDefinition = {
  id: 'cornucopia',
  name: 'Cornucopia',
  event: 'hunger_of_erysichthon',
  description: '+10% gold, +10 max health.',
  modifiers: [
    { stat: 'goldGain', flat: 0.1 },
    { stat: 'maxHealth', flat: 10 },
  ],
  visual: { sprite: 'cornucopia', color: 0xe0a040 },
};

export const ERYSICHTHON_PACK: EventPack = {
  event: HUNGER_OF_ERYSICHTHON,
  realm: GROVE_OF_DEMETER,
  boss: ERYSICHTHON,
  enemies: HUNGER_ENEMIES,
  weapons: [SICKLE_OF_DEMETER],
  relics: [CORNUCOPIA],
  rewards: eventShop(
    'hunger_of_erysichthon',
    {
      id: 'harvest_home',
      name: 'Harvest Home',
      description: '+5% gold and +5% XP in every run.',
      modifiers: [
        { stat: 'goldGain', flat: 0.05 },
        { stat: 'xpGain', flat: 0.05 },
      ],
      sprite: 'wheat_sheaf',
    },
    { id: 'horn_of_plenty', name: 'Horn of Plenty', item: CORNUCOPIA },
    { id: 'reaper', name: 'Reaper', item: SICKLE_OF_DEMETER },
  ),
  achievements: eventAchievements(
    'grove_of_demeter',
    {
      id: 'the_harvest_saved',
      name: 'The Harvest Saved',
      description: 'Defeat Erysichthon in the Grove of Demeter.',
      sprite: 'sickle_of_demeter',
    },
    {
      id: 'well_fed',
      name: 'Well Fed',
      description: 'Survive 10 minutes from the Grove of Demeter.',
      sprite: 'cornucopia',
    },
  ),
};
