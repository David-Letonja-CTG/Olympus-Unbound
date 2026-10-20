import { TwistDefinition } from '../engine';

/**
 * The Daily Trial's twists (spec: daily-trial / twists): one rule for the day's run, chosen by the date. Each has a
 * cost and a gift, so a day is different rather than only harder. Only gods' stats and enemy multipliers.
 */
export const TWISTS: readonly TwistDefinition[] = [
  {
    id: 'swift_foes',
    name: 'Swift Foes',
    description: 'Enemies move 30% faster. You gain 30% more experience.',
    rules: { enemies: { speed: 1.3 }, modifiers: [{ stat: 'xpGain', flat: 0.3 }] },
  },
  {
    id: 'glass_god',
    name: 'Glass God',
    description: 'You deal 50% more damage, but have 40% less health.',
    rules: {
      modifiers: [
        { stat: 'might', flat: 0.5 },
        { stat: 'maxHealth', percent: -0.4 },
      ],
    },
  },
  {
    id: 'golden_age',
    name: 'Golden Age',
    description: 'Gold is doubled. Enemies have 25% more health.',
    rules: { modifiers: [{ stat: 'goldGain', flat: 1 }], enemies: { health: 1.25 } },
  },
  {
    id: 'endless_swarm',
    name: 'Endless Swarm',
    description: '40% more enemies. You gain 50% more experience.',
    rules: { enemies: { spawnRate: 1.4 }, modifiers: [{ stat: 'xpGain', flat: 0.5 }] },
  },
  {
    id: 'iron_hides',
    name: 'Iron Hides',
    description: 'Enemies have 60% more health. Your weapons reach 25% further.',
    rules: { enemies: { health: 1.6 }, modifiers: [{ stat: 'area', flat: 0.25 }] },
  },
  {
    id: 'winged_sandals',
    name: 'Winged Sandals',
    description: 'You move 25% faster. Enemies hit 30% harder.',
    rules: { modifiers: [{ stat: 'moveSpeed', percent: 0.25 }], enemies: { damage: 1.3 } },
  },
  {
    id: 'haste_of_hermes',
    name: 'Haste of Hermes',
    description: 'Weapons and abilities recover 25% faster. Enemies have 40% more health.',
    rules: { modifiers: [{ stat: 'cooldown', flat: -0.25 }], enemies: { health: 1.4 } },
  },
  {
    id: 'blood_moon',
    name: 'Blood Moon',
    description: 'Every hit heals you a little. Enemies are 15% faster and hit 20% harder.',
    rules: {
      modifiers: [{ stat: 'lifesteal', flat: 0.03 }],
      enemies: { speed: 1.15, damage: 1.2 },
    },
  },
];
