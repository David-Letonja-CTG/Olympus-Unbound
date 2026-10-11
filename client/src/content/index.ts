import type { BalanceConfig, GameContent, PermanentUpgradeDefinition } from '../engine';
import { ASSETS } from './assets';
import { INTRO } from './cutscenes/intro';
import { BOSSES, ENEMIES } from './enemies';
import { GODS } from './gods';
import { ARMOUR, RELICS, SKILLS, SYNERGIES } from './items';
import { REALMS } from './realms';
import { WEAPONS } from './weapons';

export const BALANCE: BalanceConfig = {
  maxWeapons: 6,
  maxRelics: 4,
  offerCount: 3,
  xpCurve: { base: 5, perLevel: 4, growth: 0.3 },
  offerWeights: {
    newWeapon: 1,
    weaponLevel: 1.3,
    armour: 0.6,
    armourLevel: 0.8,
    relic: 0.6,
    skill: 0.9,
    affinity: 1.6,
  },
  fallback: { healFraction: 0.3, gold: 25 },
  player: { radius: 14, invulnerableAfterHit: 0.12, reviveInvulnerable: 2.5 },
  enemyAttackInterval: 1,
  caps: { enemies: 400, projectiles: 300, hostileProjectiles: 120, pickups: 400 },
  drops: { healChance: 0.006, healAmount: 30 },
};

export const PERMANENT_UPGRADES: readonly PermanentUpgradeDefinition[] = [
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+10 max health per level.',
    costs: [100, 200, 350, 550, 800],
    modifiers: [{ stat: 'maxHealth', flat: 10 }],
  },
  {
    id: 'might',
    name: 'Might',
    description: '+5% damage per level.',
    costs: [150, 300, 500, 750, 1050],
    modifiers: [{ stat: 'might', flat: 0.05 }],
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    description: '+4% movement speed per level.',
    costs: [120, 260, 450],
    modifiers: [{ stat: 'moveSpeed', percent: 0.04 }],
  },
  {
    id: 'greed',
    name: 'Greed',
    description: '+10% gold per level.',
    costs: [100, 220, 380],
    modifiers: [{ stat: 'goldGain', flat: 0.1 }],
  },
  {
    id: 'magnetism',
    name: 'Attraction',
    description: '+15% pickup range per level.',
    costs: [80, 180, 320],
    modifiers: [{ stat: 'magnet', percent: 0.15 }],
  },
  {
    id: 'resilience',
    name: 'Resilience',
    description: '+1 armour per level.',
    costs: [200, 450, 800],
    modifiers: [{ stat: 'armor', flat: 1 }],
  },
];

/** All game content (D4). Validated by `content.spec.ts`. */
export const CONTENT: GameContent = {
  gods: GODS,
  weapons: WEAPONS,
  armour: ARMOUR,
  relics: RELICS,
  skills: SKILLS,
  synergies: SYNERGIES,
  enemies: ENEMIES,
  bosses: BOSSES,
  realms: REALMS,
  permanentUpgrades: PERMANENT_UPGRADES,
  balance: BALANCE,
  assets: ASSETS,
  cutscenes: [INTRO],
};
