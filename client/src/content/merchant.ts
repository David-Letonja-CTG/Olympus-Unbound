import type { CompanionDefinition, MerchantBalance, WareDefinition, WeaponStats } from '../engine';

/** The Wandering Merchant's visits (spec: merchant / the merchant's visits). */
export const MERCHANT: MerchantBalance = {
  arrivals: [150, 330],
  stays: 75,
  radius: 60,
  distance: 340,
  priceGrowth: 0.5,
  maxCompanions: 3,
};

const ATTACK: WeaponStats = {
  damage: 10,
  cooldown: 1,
  amount: 1,
  speed: 0,
  pierce: 0,
  size: 50,
  range: 0,
  arc: 0,
  duration: 0,
  knockback: 0,
  chains: 0,
  critChance: 0,
  homing: 0,
};

/**
 * Companions (spec: merchant / companions): existing rendered sheets (D15), tinted warm so they read as allies; each
 * attacks with a weapon definition through the weapon behaviors and the one damage pipeline.
 */
export const COMPANIONS: readonly CompanionDefinition[] = [
  {
    id: 'eagle_of_zeus',
    name: 'Eagle of Zeus',
    description: 'Dives onto foes and blasts them with lightning, shocking them.',
    visual: { sprite: 'stymphalian_bird', color: 0xffe066, tint: 0xfff0b0, scale: 0.75 },
    icon: 'ware_eagle',
    radius: 12,
    speed: 330,
    hunt: 420,
    reach: 24,
    attack: {
      id: 'eagle_dive',
      name: 'Eagle Dive',
      description: 'A lightning blast where the eagle strikes.',
      element: 'lightning',
      behavior: 'nova',
      base: { ...ATTACK, damage: 18, cooldown: 1.1, size: 60, knockback: 60 },
      effects: [{ effect: 'shock', chance: 0.6, duration: 2, potency: 0.2 }],
      visual: { sprite: 'ware_eagle', color: 0xfff27a },
    },
  },
  {
    id: 'hound_of_the_underworld',
    name: 'Hound of the Underworld',
    description: 'Runs foes down and bites in a burning arc.',
    visual: { sprite: 'orthrus', color: 0xff8a3d, tint: 0xffc890, scale: 0.7 },
    icon: 'ware_hound',
    radius: 14,
    speed: 270,
    hunt: 380,
    reach: 30,
    attack: {
      id: 'hound_bite',
      name: 'Hound Bite',
      description: 'A burning bite in a wide arc.',
      element: 'fire',
      behavior: 'sweep',
      base: { ...ATTACK, damage: 22, cooldown: 1, size: 70, range: 90, arc: 1.8, knockback: 120 },
      effects: [{ effect: 'burn', chance: 1, duration: 2.5, potency: 0.35 }],
      visual: { sprite: 'ware_hound', color: 0xff8a3d },
    },
  },
  {
    id: 'temple_serpent',
    name: 'Temple Serpent',
    description: 'Keeps its distance and spits venom that slows; slowly heals its god.',
    visual: { sprite: 'swamp_serpent', color: 0x9be88a, tint: 0xd8ffc0, scale: 0.7 },
    icon: 'ware_serpent',
    radius: 12,
    speed: 200,
    hunt: 360,
    reach: 220,
    heal: 1.5,
    attack: {
      id: 'serpent_venom',
      name: 'Serpent Venom',
      description: 'A venomous spit that slows.',
      element: 'physical',
      behavior: 'projectile',
      base: {
        ...ATTACK,
        damage: 13,
        cooldown: 1.2,
        speed: 460,
        size: 9,
        range: 340,
        duration: 1.1,
        homing: 2,
      },
      effects: [{ effect: 'slow', chance: 1, duration: 2, potency: 0.35 }],
      visual: { sprite: 'ware_serpent', color: 0x9be88a, projectile: 'venom_spit' },
    },
  },
];

/** What the merchant sells (spec: merchant / wares). A new ware of a known kind is data only. */
export const WARES: readonly WareDefinition[] = [
  {
    id: 'eagle_of_zeus',
    name: 'Eagle of Zeus',
    description: 'A companion: dives onto foes with lightning.',
    price: 150,
    effect: { type: 'companion', companion: 'eagle_of_zeus' },
    visual: { sprite: 'ware_eagle', color: 0xffe066 },
  },
  {
    id: 'hound_of_the_underworld',
    name: 'Hound of the Underworld',
    description: 'A companion: runs foes down with burning bites.',
    price: 170,
    effect: { type: 'companion', companion: 'hound_of_the_underworld' },
    visual: { sprite: 'ware_hound', color: 0xff8a3d },
  },
  {
    id: 'temple_serpent',
    name: 'Temple Serpent',
    description: 'A companion: slowing venom from afar, and it heals you slowly.',
    price: 190,
    effect: { type: 'companion', companion: 'temple_serpent' },
    visual: { sprite: 'ware_serpent', color: 0x9be88a },
  },
  {
    id: 'whetstone',
    name: 'Whetstone',
    description: 'One more level for a weapon.',
    price: 120,
    effect: { type: 'weaponLevel' },
    visual: { sprite: 'ware_whetstone', color: 0xc9d4e0 },
  },
  {
    id: 'ambrosia_flask',
    name: 'Ambrosia',
    description: 'Heals 40% of your health.',
    price: 60,
    effect: { type: 'heal', fraction: 0.4 },
    visual: { sprite: 'ambrosia', color: 0xff7a9a },
  },
];
