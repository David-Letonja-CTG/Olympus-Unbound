import type {
  ArmourDefinition,
  InstantDefinition,
  RelicDefinition,
  SkillDefinition,
  SynergyDefinition,
} from '../engine';

export const ARMOUR: readonly ArmourDefinition[] = [
  {
    id: 'aegis_of_olympus',
    name: 'Aegis of Olympus',
    description: 'The shield-cloak of the gods turns blows aside.',
    levels: [
      {
        text: '+2 armour, +20 max health.',
        modifiers: [
          { stat: 'armor', flat: 2 },
          { stat: 'maxHealth', flat: 20 },
        ],
      },
      {
        text: '+1 armour, +20 max health.',
        modifiers: [
          { stat: 'armor', flat: 1 },
          { stat: 'maxHealth', flat: 20 },
        ],
      },
      { text: '+2 armour.', modifiers: [{ stat: 'armor', flat: 2 }] },
    ],
    visual: { sprite: 'aegis_of_olympus', color: 0xe8d38a },
  },
  {
    id: 'underworld_armour',
    name: 'Armour of the Underworld',
    description: 'Black plate that drinks the life of those you strike.',
    levels: [
      {
        text: '+2% lifesteal, +15% shadow damage.',
        modifiers: [
          { stat: 'lifesteal', flat: 0.02 },
          { stat: 'shadowDamage', flat: 0.15 },
        ],
      },
      { text: '+2% lifesteal.', modifiers: [{ stat: 'lifesteal', flat: 0.02 }] },
      {
        text: '+2% lifesteal, +20 max health.',
        modifiers: [
          { stat: 'lifesteal', flat: 0.02 },
          { stat: 'maxHealth', flat: 20 },
        ],
      },
    ],
    visual: { sprite: 'underworld_armour', color: 0x7d5ca8 },
  },
  {
    id: 'triton_shell',
    name: "Triton's Shell",
    description: 'Sea-born armour that slowly mends its wearer.',
    levels: [
      {
        text: '+30 max health, +0.5 health per second.',
        modifiers: [
          { stat: 'maxHealth', flat: 30 },
          { stat: 'regen', flat: 0.5 },
        ],
      },
      {
        text: '+0.5 health per second, +20% knockback.',
        modifiers: [
          { stat: 'regen', flat: 0.5 },
          { stat: 'knockback', percent: 0.2 },
        ],
      },
      {
        text: '+30 max health, +1 health per second.',
        modifiers: [
          { stat: 'maxHealth', flat: 30 },
          { stat: 'regen', flat: 1 },
        ],
      },
    ],
    visual: { sprite: 'triton_shell', color: 0x5fc6c0 },
  },
  {
    id: 'valkyrie_plate',
    name: "Valkyrie's Plate",
    description: 'Light, winged plate for warriors who never stand still.',
    levels: [
      {
        text: '+8% speed, attacks 5% faster.',
        modifiers: [
          { stat: 'moveSpeed', percent: 0.08 },
          { stat: 'cooldown', percent: -0.05 },
        ],
      },
      {
        text: '+1 armour, +5% speed.',
        modifiers: [
          { stat: 'armor', flat: 1 },
          { stat: 'moveSpeed', percent: 0.05 },
        ],
      },
      { text: 'Attacks 8% faster.', modifiers: [{ stat: 'cooldown', percent: -0.08 }] },
    ],
    visual: { sprite: 'valkyrie_plate', color: 0xc8d6e5 },
  },
];

export const RELICS: readonly RelicDefinition[] = [
  {
    id: 'zeus_eye',
    name: "Zeus's Eye",
    description: '+8% critical chance, +30% critical damage.',
    modifiers: [
      { stat: 'critChance', flat: 0.08 },
      { stat: 'critMultiplier', flat: 0.3 },
    ],
    element: 'lightning',
    visual: { sprite: 'zeus_eye', color: 0xfff27a },
  },
  {
    id: 'soul_lantern',
    name: 'Soul Lantern',
    description: '+40% pickup range, +15% XP.',
    modifiers: [
      { stat: 'magnet', percent: 0.4 },
      { stat: 'xpGain', flat: 0.15 },
    ],
    element: 'shadow',
    visual: { sprite: 'soul_lantern', color: 0x9be8c0 },
  },
  {
    id: 'golden_fleece',
    name: 'Golden Fleece',
    description: '+25 max health, +1 health per second.',
    modifiers: [
      { stat: 'maxHealth', flat: 25 },
      { stat: 'regen', flat: 1 },
    ],
    visual: { sprite: 'golden_fleece', color: 0xffcf40 },
  },
  {
    id: 'trident_fragment',
    name: 'Trident Fragment',
    description: '+1 projectile for every weapon, +10% projectile speed.',
    modifiers: [
      { stat: 'projectiles', flat: 1 },
      { stat: 'projectileSpeed', flat: 0.1 },
    ],
    visual: { sprite: 'trident_fragment', color: 0x6fd3ff },
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Once per run, rise again with half your health when you would fall.',
    modifiers: [{ stat: 'revivals', flat: 1 }],
    element: 'fire',
    visual: { sprite: 'phoenix_feather', color: 0xff8a3d },
  },
  {
    id: 'eye_of_horus',
    name: 'Eye of Horus',
    description: '+15% area, +20% effect duration, +10% gold.',
    modifiers: [
      { stat: 'area', flat: 0.15 },
      { stat: 'duration', flat: 0.2 },
      { stat: 'goldGain', flat: 0.1 },
    ],
    visual: { sprite: 'eye_of_horus', color: 0x4fb3e8 },
  },
];

export const SKILLS: readonly SkillDefinition[] = [
  {
    id: 'might',
    name: 'Might',
    description: '+10% damage.',
    maxLevel: 5,
    modifiers: [{ stat: 'might', flat: 0.1 }],
    visual: { sprite: 'skill_might', color: 0xff6b6b },
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    description: '+8% movement speed.',
    maxLevel: 3,
    modifiers: [{ stat: 'moveSpeed', percent: 0.08 }],
    visual: { sprite: 'skill_swiftness', color: 0x7ee0a1 },
  },
  {
    id: 'haste',
    name: 'Haste',
    description: 'All weapons attack 7% faster.',
    maxLevel: 4,
    modifiers: [{ stat: 'cooldown', percent: -0.07 }],
    visual: { sprite: 'skill_haste', color: 0x7fc8ff },
  },
  {
    id: 'multishot',
    name: 'Multishot',
    description: '+1 projectile, orb, bolt, strike or swing.',
    maxLevel: 2,
    modifiers: [{ stat: 'projectiles', flat: 1 }],
    requiresBehavior: ['projectile', 'orbit', 'chain', 'strike', 'sweep'],
    visual: { sprite: 'skill_multishot', color: 0xffd36b },
  },
  {
    id: 'reach',
    name: 'Reach',
    description: '+10% area.',
    maxLevel: 4,
    modifiers: [{ stat: 'area', flat: 0.1 }],
    visual: { sprite: 'skill_reach', color: 0xc59bff },
  },
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+20 max health.',
    maxLevel: 4,
    modifiers: [{ stat: 'maxHealth', flat: 20 }],
    visual: { sprite: 'skill_vitality', color: 0xff8fa3 },
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    description: '+1 armour.',
    maxLevel: 3,
    modifiers: [{ stat: 'armor', flat: 1 }],
    visual: { sprite: 'skill_bulwark', color: 0xb8c4d0 },
  },
  {
    id: 'magnetism',
    name: 'Magnetism',
    description: '+30% pickup range.',
    maxLevel: 3,
    modifiers: [{ stat: 'magnet', percent: 0.3 }],
    visual: { sprite: 'skill_magnetism', color: 0x8fe8ff },
  },
  {
    id: 'wisdom',
    name: 'Wisdom of Athena',
    description: '+10% XP.',
    maxLevel: 3,
    modifiers: [{ stat: 'xpGain', flat: 0.1 }],
    visual: { sprite: 'skill_wisdom', color: 0x9ad0ff },
  },
  {
    id: 'precision',
    name: 'Precision',
    description: '+5% critical chance.',
    maxLevel: 3,
    modifiers: [{ stat: 'critChance', flat: 0.05 }],
    visual: { sprite: 'skill_precision', color: 0xffe066 },
  },
  {
    id: 'persistence',
    name: 'Lingering Power',
    description: '+15% duration of effects and projectiles.',
    maxLevel: 3,
    modifiers: [{ stat: 'duration', flat: 0.15 }],
    visual: { sprite: 'skill_persistence', color: 0xa8e6cf },
  },
  {
    id: 'storm_caller',
    name: 'Storm Caller',
    description: '+15% lightning damage.',
    maxLevel: 4,
    modifiers: [{ stat: 'lightningDamage', flat: 0.15 }],
    requiresElement: 'lightning',
    visual: { sprite: 'skill_storm', color: 0xfff27a },
  },
  {
    id: 'forked_lightning',
    name: 'Forked Lightning',
    description: '+1 chain jump.',
    maxLevel: 2,
    modifiers: [{ stat: 'chains', flat: 1 }],
    requiresBehavior: ['chain'],
    visual: { sprite: 'skill_fork', color: 0xc9f0ff },
  },
  {
    id: 'fury_of_flames',
    name: 'Fury of Flames',
    description: '+20% fire damage.',
    maxLevel: 4,
    modifiers: [{ stat: 'fireDamage', flat: 0.2 }],
    requiresElement: 'fire',
    visual: { sprite: 'skill_fire', color: 0xff7a2e },
  },
  {
    id: 'titans_strength',
    name: "Titan's Strength",
    description: '+15% physical damage.',
    maxLevel: 3,
    modifiers: [{ stat: 'physicalDamage', flat: 0.15 }],
    requiresElement: 'physical',
    visual: { sprite: 'skill_strength', color: 0xd9b27c },
  },
  {
    id: 'shadow_pact',
    name: 'Shadow Pact',
    description: '+20% shadow damage.',
    maxLevel: 3,
    modifiers: [{ stat: 'shadowDamage', flat: 0.2 }],
    requiresElement: 'shadow',
    visual: { sprite: 'skill_shadow', color: 0xb68cff },
  },
];

export const SYNERGIES: readonly SynergyDefinition[] = [
  {
    id: 'storm',
    name: 'Storm',
    description: "Two lightning weapons and Zeus's Eye: +25% lightning damage, +1 chain jump.",
    requirements: [
      { type: 'element', element: 'lightning', count: 2 },
      { type: 'relic', id: 'zeus_eye' },
    ],
    modifiers: [
      { stat: 'lightningDamage', flat: 0.25 },
      { stat: 'chains', flat: 1 },
    ],
    visual: { sprite: 'synergy_storm', color: 0xfff27a },
  },
  {
    id: 'tempest',
    name: 'Tempest',
    description: 'Thunder Spear and Trident: projectiles fly 25% faster and pierce one more foe.',
    requirements: [
      { type: 'weapon', id: 'thunder_spear' },
      { type: 'weapon', id: 'trident' },
    ],
    modifiers: [
      { stat: 'projectileSpeed', flat: 0.25 },
      { stat: 'pierce', flat: 1 },
    ],
    visual: { sprite: 'synergy_tempest', color: 0x6fd3ff },
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description:
      'Flaming Sword (level 3) and Fury of Flames (level 2): +30% fire damage, +10% area.',
    requirements: [
      { type: 'weapon', id: 'flaming_sword', minLevel: 3 },
      { type: 'skill', id: 'fury_of_flames', minLevel: 2 },
    ],
    modifiers: [
      { stat: 'fireDamage', flat: 0.3 },
      { stat: 'area', flat: 0.1 },
    ],
    visual: { sprite: 'synergy_inferno', color: 0xff7a2e },
  },
  {
    id: 'soul_reaper',
    name: 'Soul Reaper',
    description: 'Soul Scythe and Soul Lantern: +4% lifesteal, +25% shadow damage.',
    requirements: [
      { type: 'weapon', id: 'soul_scythe' },
      { type: 'relic', id: 'soul_lantern' },
    ],
    modifiers: [
      { stat: 'lifesteal', flat: 0.04 },
      { stat: 'shadowDamage', flat: 0.25 },
    ],
    visual: { sprite: 'synergy_reaper', color: 0xb68cff },
  },
  {
    id: 'divine_bulwark',
    name: 'Divine Bulwark',
    description: 'Aegis of Olympus (level 3) and Bulwark: +3 armour, +40 max health.',
    requirements: [
      { type: 'armour', id: 'aegis_of_olympus', minLevel: 3 },
      { type: 'skill', id: 'bulwark' },
    ],
    modifiers: [
      { stat: 'armor', flat: 3 },
      { stat: 'maxHealth', flat: 40 },
    ],
    visual: { sprite: 'synergy_bulwark', color: 0xe8d38a },
  },
  {
    id: 'wrath_of_the_sky',
    name: 'Wrath of the Sky',
    description:
      'Thunderbolt and Lightning Orb at level 3: attacks 10% faster, +40% critical damage.',
    requirements: [
      { type: 'weapon', id: 'thunderbolt', minLevel: 3 },
      { type: 'weapon', id: 'lightning_orb', minLevel: 3 },
    ],
    modifiers: [
      { stat: 'cooldown', percent: -0.1 },
      { stat: 'critMultiplier', flat: 0.4 },
    ],
    visual: { sprite: 'synergy_sky', color: 0xc9f0ff },
  },
  {
    id: 'earthshaker',
    name: 'Earthshaker',
    description: "War Hammer (level 3) and Titan's Strength (level 2): +20% area, +50% knockback.",
    requirements: [
      { type: 'weapon', id: 'war_hammer', minLevel: 3 },
      { type: 'skill', id: 'titans_strength', minLevel: 2 },
    ],
    modifiers: [
      { stat: 'area', flat: 0.2 },
      { stat: 'knockback', percent: 0.5 },
    ],
    visual: { sprite: 'synergy_earth', color: 0xd9b27c },
  },
];

/** Offers used at once, again whenever they are worth it (spec: run-progression / instant blessings). */
export const INSTANTS: readonly InstantDefinition[] = [
  {
    id: 'call_of_hermes',
    name: 'Call of Hermes',
    description: 'Every experience gem in the realm flies to you.',
    effect: { type: 'gather', kinds: ['xp'] },
    weight: 1.4,
    minLying: 40,
    visual: { sprite: 'blessing_hermes', color: 0x7fe8d0 },
  },
];
