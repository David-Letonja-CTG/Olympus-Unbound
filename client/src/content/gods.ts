import type { GodDefinition } from '../engine';

export const GODS: readonly GodDefinition[] = [
  {
    id: 'zeus',
    name: 'Zeus',
    title: 'King of the Sky',
    description:
      'The thunderer strikes first and strikes often. Lightning leaps from his hands, criticals come easily, and his wrath can blanket the battlefield.',
    baseStats: { maxHealth: 120, moveSpeed: 210, critChance: 0.08 },
    startingWeapon: 'thunder_spear',
    ability: {
      id: 'wrath_of_olympus',
      name: 'Wrath of Olympus',
      description: 'Calls down lightning on up to eight nearby foes, stunning them.',
      element: 'lightning',
      behavior: 'strike',
      base: {
        damage: 60,
        cooldown: 25,
        amount: 8,
        speed: 0,
        pierce: 0,
        size: 70,
        range: 560,
        arc: 0,
        duration: 0,
        knockback: 200,
        chains: 0,
        critChance: 0.1,
        homing: 0,
      },
      effects: [
        { effect: 'stun', chance: 1, duration: 1.2, potency: 0 },
        { effect: 'shock', chance: 1, duration: 3, potency: 0.3 },
      ],
      visual: { sprite: 'wrath_of_olympus', color: 0xfff6a8 },
    },
    passive: {
      name: 'Thunderborn',
      description: '+10% lightning damage and +5% critical chance.',
      modifiers: [
        { stat: 'lightningDamage', flat: 0.1 },
        { stat: 'critChance', flat: 0.05 },
      ],
    },
    affinities: ['lightning'],
    visual: { sprite: 'zeus', color: 0xffe066 },
  },
  {
    id: 'hades',
    name: 'Hades',
    title: 'Lord of the Underworld',
    description:
      'The lord of the dead wades into the horde. His bident and his gates drain the life of everything they touch, and every shadow feeds him.',
    baseStats: { maxHealth: 150, moveSpeed: 190, armor: 2 },
    startingWeapon: 'bident',
    ability: {
      id: 'gates_of_tartarus',
      name: 'Gates of Tartarus',
      description:
        'Opens the abyss around him: every nearby foe is struck, held fast and slowed, and he drinks their life.',
      element: 'shadow',
      behavior: 'nova',
      base: {
        damage: 70,
        cooldown: 24,
        amount: 1,
        speed: 0,
        pierce: 0,
        size: 300,
        range: 300,
        arc: 0,
        duration: 0,
        knockback: 120,
        chains: 0,
        critChance: 0.05,
        homing: 0,
      },
      effects: [
        { effect: 'stun', chance: 1, duration: 0.8, potency: 0 },
        { effect: 'slow', chance: 1, duration: 3, potency: 0.5 },
      ],
      lifesteal: 0.05,
      visual: { sprite: 'gates_of_tartarus', color: 0x7fe0c8 },
    },
    passive: {
      name: 'Lord of the Dead',
      description: '+15% shadow damage; heals for 1.5% of all damage dealt.',
      modifiers: [
        { stat: 'shadowDamage', flat: 0.15 },
        { stat: 'lifesteal', flat: 0.015 },
      ],
    },
    affinities: ['shadow', 'fire'],
    visual: { sprite: 'hades', color: 0x7fe0c8 },
  },
];
