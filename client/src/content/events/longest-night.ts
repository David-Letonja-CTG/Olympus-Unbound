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
 * The Longest Night (the winter solstice, Christmas and the New Year; spec: seasonal-events / the longest night):
 * Nyx, older than the gods, walks a snowbound wood under her stars, and her twin sons Sleep and Death guard her.
 */
const LONGEST_NIGHT: EventDefinition = {
  id: 'longest_night',
  name: 'The Longest Night',
  tagline: 'Nyx spreads her veil over the longest night of the year. Light the lamps.',
  window: { from: '12-15', to: '01-05' },
  accent: 0x8aa8ff,
  // Star shards: what falls when Nyx's stars go out.
  currency: { name: 'Star shards', sprite: 'star_shard', chance: 0.02, elite: 3, boss: 15 },
};

const NYX_ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'oneiros',
    name: 'Oneiros',
    health: 30,
    speed: 76,
    damage: 7,
    radius: 14,
    xp: 1,
    gold: { chance: 0.1, amount: 2 },
    knockbackResist: 0,
    behavior: { type: 'chaser', jitter: 0.45 },
    visual: { sprite: 'oneiros', color: 0xa0b0ff },
  },
  {
    id: 'nightmare',
    name: 'Nightmare',
    health: 44,
    speed: 128,
    damage: 9,
    radius: 15,
    xp: 3,
    gold: { chance: 0.15, amount: 3 },
    knockbackResist: 0.1,
    behavior: { type: 'chaser', jitter: 0.6 },
    visual: { sprite: 'nightmare', color: 0x6a6ad0 },
  },
  {
    id: 'star_bearer',
    name: 'Star-Bearer',
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
      projectileSprite: 'night_star',
    },
    visual: { sprite: 'star_bearer', color: 0xb0c8ff },
  },
  {
    id: 'wolf_of_night',
    name: 'Wolf of Night',
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
    visual: { sprite: 'wolf_of_night', color: 0x3a4470 },
  },
];

/**
 * Nyx, Night herself (spec: seasonal-events / the longest night). Her twin sons guard her: while Hypnos or Thanatos
 * lives she takes a third of the damage. Sleep slows the gods near him; Death lashes. Fallen, they return.
 */
const NYX: BossDefinition = {
  id: 'nyx',
  name: 'Nyx',
  title: 'Night, Mother of Sleep and Death',
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
      announcement: 'Nyx rises, and the stars come out!',
      attacks: [
        boulders('falling_stars', 1.2, 70, 28, 5, 240),
        summon('call_the_dreams', 'oneiros', 6),
        sweep('veil_of_night', 0.9, 230, 1.1, 26, 3, 0.45),
      ],
    },
    {
      below: 0.5,
      speedMultiplier: 1.25,
      enraged: true,
      pauseMultiplier: 0.7,
      announcement: 'Nyx draws her veil over the world!',
      attacks: [
        walls('the_long_night', 1.3, 9, 26, [200, 320], 4, 0.25),
        boulders('falling_stars', 1.1, 70, 30, 7, 280),
        summon('call_the_nightmares', 'nightmare', 4),
        sweep('veil_of_night', 0.8, 250, 1.2, 28, 4, 0.4),
      ],
    },
  ],
  parts: [
    {
      id: 'hypnos',
      name: 'Hypnos, Sleep',
      radius: 18,
      place: { from: 'boss', angle: -Math.PI / 2, distance: 96 },
      attacks: [lash('poppy_lash', 1, 260, 50, 18)],
      pause: 5,
      delay: 2,
      health: 1700,
      regrow: 20,
      // Sleep: gods near him walk slower (the zone does no damage).
      zone: { radius: 150, dps: 0, slow: 0.35 },
      visual: { sprite: 'hypnos', color: 0xc8d0ff },
    },
    {
      id: 'thanatos',
      name: 'Thanatos, Death',
      radius: 18,
      place: { from: 'boss', angle: Math.PI / 2, distance: 96 },
      attacks: [lash('deaths_sweep', 0.8, 340, 60, 26)],
      pause: 3.6,
      delay: 1.2,
      health: 1700,
      regrow: 20,
      visual: { sprite: 'thanatos', color: 0x2a2a3a },
    },
  ],
  visual: { sprite: 'nyx', color: 0x6a6ad8 },
};

/** The Starlit Wood: a snowbound pine wood on the longest night, lamps in the trees and Nyx's cave in the hill. */
const STARLIT_WOOD: RealmDefinition = {
  id: 'starlit_wood',
  name: 'The Starlit Wood',
  event: 'longest_night',
  description:
    'A snowbound pine wood on the longest night of the year. Lamps hang in the trees, and Nyx walks under her stars.',
  backgroundColor: 0x0a0e1c,
  tips: [
    'Nyx’s sons guard her: while Sleep or Death lives she takes a third of the damage. Bring them down first.',
    'Stay away from Hypnos: Sleep slows every god near him.',
    'Her sons return after a while. Strike her while they are gone.',
    'Below half her strength Nyx draws her veil: stone rings rise round her with four ways out.',
    'The Star-Bearers throw star-fire from afar. Close in on them.',
    'The Wolves of Night stop before they spring. When they stop, move.',
    'The Longest Night lasts until January 5. Its items appear only while it lasts.',
  ],
  // A cold blue night of snow under the stars, warmed by lamps in the pines.
  atmosphere: {
    ambient: 0x6a78a8,
    fog: 0x9aa8c8,
    particles: 0xfff0c0,
    ambience: {
      weather: { kind: 'snow', rate: 9, color: 0xf0f4ff, wind: 14 },
      smoke: 0x8a90a8,
      wildlife: { kind: 'bird', sprite: 'crow', count: 5 },
    },
  },
  map: {
    ...MAP_FRAME,
    terrain: {
      types: [
        { id: 'snow', color: 0xb4bccc, texture: { kind: 'ash', strength: 0.35 } },
        { id: 'trodden_snow', color: 0x98a0b2, texture: { kind: 'earth', strength: 0.4 } },
        // A frozen pond: it slides underfoot (spec: arena-generation / footing).
        {
          id: 'frozen_pond',
          color: 0x8aa0c0,
          texture: { kind: 'cracks', strength: 0.6 },
          footing: { grip: 0.35 },
        },
        { id: 'frosted_flagstones', color: 0x9098a8, texture: { kind: 'slabs' } },
        { id: 'void', color: 0x05060c },
      ],
      noiseScale: 9,
      bands: [
        { below: 0.18, terrain: 'frozen_pond' },
        { below: 0.62, terrain: 'snow' },
        { below: 1.01, terrain: 'trodden_snow' },
      ],
      plaza: 'frosted_flagstones',
      border: 'void',
    },
    obstacles: [
      {
        id: 'landmark',
        radius: 70,
        visual: { sprite: 'cave_of_nyx', color: 0x4a5070 },
        light: { radius: 240, color: 0x9ab0ff, intensity: 0.85, flicker: 0.15 },
      },
      { id: 'pine', radius: 18, visual: { sprite: 'snowy_pine', color: 0x1e3a2e }, sway: 0.025 },
      { id: 'column', radius: 16, visual: { sprite: 'column', color: 0xd8dce4 } },
      { id: 'broken_column', radius: 18, visual: { sprite: 'broken_column', color: 0xc8ccd4 } },
      { id: 'statue', radius: 22, visual: { sprite: 'statue', color: 0xc8ccd8 } },
      { id: 'altar', radius: 26, visual: { sprite: 'altar', color: 0xb8bcc8 } },
      { id: 'wall', radius: 20, visual: { sprite: 'ruined_wall', color: 0x9aa0ae } },
      { id: 'rock', radius: 18, visual: { sprite: 'rock', color: 0x7a8090 } },
      {
        id: 'lamp',
        radius: 12,
        visual: { sprite: 'star_lantern', color: 0xffd27a },
        // Gentler than other realms' fires: the snow throws the light back.
        light: { radius: 170, color: 0xffc070, intensity: 0.55, flicker: 0.3 },
      },
    ],
    pointsOfInterest: [
      { type: 'landmark', kind: 'landmark', ground: 'frosted_flagstones' },
      {
        type: 'ring',
        kind: 'statue',
        count: [3, 5],
        radius: [120, 170],
        pieces: 8,
        missingChance: 0.3,
        plazaTerrain: 'frosted_flagstones',
      },
      {
        type: 'temple',
        column: 'column',
        fallen: 'broken_column',
        altar: 'altar',
        light: 'lamp',
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
      { type: 'cluster', kind: 'pine', count: [8, 12], size: [3, 6], spread: 90 },
      { type: 'cluster', kind: 'lamp', count: [3, 5], size: [1, 2], spread: 70 },
      { type: 'plazaLights', kind: 'lamp', count: 6, offset: 18 },
    ],
    scatter: [
      { kind: 'pine', density: 18, terrain: ['snow', 'trodden_snow'] },
      { kind: 'rock', density: 2.5 },
      { kind: 'statue', density: 0.4 },
    ],
    // Offerings wrapped for the solstice: a god breaks them open (spec: arena-generation / breakable props).
    props: {
      kinds: [
        { id: 'offering_red', radius: 13, visual: { sprite: 'prop_gift', color: 0xc8343a } },
        { id: 'frost_urn', radius: 14, visual: { sprite: 'prop_urn_frost', color: 0xa8c0e0 } },
      ],
      clusters: 12,
    },
    features: [
      {
        type: 'brazier',
        count: 4,
        radius: 130,
        burn: 0.08,
        every: 1,
        visual: { sprite: 'brazier_cold', color: 0x4a4e5a },
        lit: { sprite: 'brazier', color: 0xff8a3d },
        light: { radius: 260, color: 0xffb060, intensity: 1, flicker: 0.35 },
      },
    ],
    decorations: [
      {
        id: 'snow_drift',
        terrain: ['snow', 'trodden_snow'],
        density: 70,
        visual: { sprite: 'snow_drift', color: 0xf0f4ff },
      },
      {
        id: 'holly',
        terrain: ['snow'],
        density: 30,
        visual: { sprite: 'holly', color: 0x2e5a34 },
      },
      {
        id: 'ice_shards',
        terrain: ['frozen_pond', 'frosted_flagstones'],
        density: 40,
        visual: { sprite: 'ice_shards', color: 0xc8e0ff },
      },
    ],
  },
  ...hostRealm(
    { fodder: 'oneiros', quick: 'nightmare', ranged: 'star_bearer', heavy: 'wolf_of_night' },
    'nyx',
  ),
};

/** Offered only on the Longest Night (spec: seasonal-events / event items). */
const STARS_OF_NYX: WeaponDefinition = {
  id: 'stars_of_nyx',
  name: 'Stars of Nyx',
  description: 'Cold stars circle you, and what they touch grows slow.',
  event: 'longest_night',
  element: 'shadow',
  behavior: 'orbit',
  base: {
    damage: 9,
    cooldown: 0.6,
    amount: 2,
    speed: 2.4,
    pierce: -1,
    size: 12,
    range: 120,
    arc: 0,
    duration: 1.2,
    knockback: 40,
    chains: 0,
    critChance: 0,
    homing: 0,
  },
  effects: [{ effect: 'slow', chance: 0.4, duration: 1.5, potency: 0.35 }],
  levels: [
    { text: '+4 damage.', damage: 4 },
    { text: '+1 star.', amount: 1 },
    { text: 'A wider circle.', range: 22, size: 2 },
    { text: '+5 damage.', damage: 5 },
    { text: '+1 star, faster.', amount: 1, speed: 0.7 },
  ],
  visual: { sprite: 'stars_of_nyx', color: 0xb0c0ff, projectile: 'night_star' },
};

const VEIL_OF_NYX: RelicDefinition = {
  id: 'veil_of_nyx',
  name: 'Veil of Nyx',
  event: 'longest_night',
  description: '+20% shadow damage, +8% move speed.',
  modifiers: [
    { stat: 'shadowDamage', flat: 0.2 },
    { stat: 'moveSpeed', percent: 0.08 },
  ],
  element: 'shadow',
  visual: { sprite: 'veil_of_nyx', color: 0x8a8aff },
};

export const NYX_PACK: EventPack = {
  event: LONGEST_NIGHT,
  realm: STARLIT_WOOD,
  boss: NYX,
  enemies: NYX_ENEMIES,
  weapons: [STARS_OF_NYX],
  relics: [VEIL_OF_NYX],
  rewards: eventShop(
    'longest_night',
    {
      id: 'starlight',
      name: 'Starlight',
      description: '+5% area in every run.',
      modifiers: [{ stat: 'area', flat: 0.05 }],
      sprite: 'star_shard',
    },
    { id: 'veilkeeper', name: 'Veilkeeper', item: VEIL_OF_NYX },
    { id: 'stargazer', name: 'Stargazer', item: STARS_OF_NYX },
  ),
  achievements: eventAchievements(
    'starlit_wood',
    {
      id: 'mother_of_night',
      name: 'Mother of Night',
      description: 'Defeat Nyx in the Starlit Wood.',
      sprite: 'veil_of_nyx',
    },
    {
      id: 'dawn_bringer',
      name: 'Bringer of Dawn',
      description: 'Survive 10 minutes from the Starlit Wood.',
      sprite: 'stars_of_nyx',
    },
  ),
};
