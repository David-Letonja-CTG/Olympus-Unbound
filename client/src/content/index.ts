import type { BalanceConfig, GameContent, PermanentUpgradeDefinition } from '../engine';
import { ACHIEVEMENTS, DAILY_QUESTS } from './achievements';
import { ASSETS } from './assets';
import { BOONS, DIRECTOR, ENCOUNTERS } from './chaos';
import { COMPANIONS, MERCHANT, WARES } from './merchant';
import { TWISTS } from './daily';
import { INTRO } from './cutscenes/intro';
import { BOSSES } from './bosses';
import { ENEMIES } from './enemies';
import { GODS } from './gods';
import { ARMOUR, ASCENSIONS, FUSIONS, INSTANTS, RELICS, SKILLS, SYNERGIES } from './items';
import { REALMS } from './realms';
import { EVOLUTIONS, WEAPONS } from './weapons';

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
    fusion: 3,
    evolution: 3.5,
    ascension: 1,
    affinity: 1.6,
  },
  fallback: { healFraction: 0.3, gold: 25 },
  player: { radius: 14, invulnerableAfterHit: 0.12, reviveInvulnerable: 2.5 },
  enemyAttackInterval: 1,
  caps: { enemies: 400, projectiles: 300, hostileProjectiles: 120, pickups: 400 },
  drops: { healChance: 0.006, healAmount: 30 },
  // Co-op: each extra player adds 65% enemy health, half again the spawn rate and room, 90% boss health.
  coop: {
    enemyHealthPerPlayer: 0.65,
    spawnRatePerPlayer: 0.5,
    maxAlivePerPlayer: 0.5,
    bossHealthPerPlayer: 0.9,
  },
  // Every realm cleared (spec: endless-run / difficulty by depth); tuned with autopilot runs (docs/content.md).
  // Enemies ×3 health and ×1.5 damage, bosses ×2.4 and ×1.5, compounding; +25% spawns and
  // room; the spawn timeline starts 120 s further in (at most 180 s). The owner found realm 2 far too easy (2026-10-23).
  endless: {
    enemyHealthGrowth: 3,
    enemyDamageGrowth: 1.5,
    bossHealthGrowth: 2.4,
    bossDamageGrowth: 1.5,
    spawnRatePerRealm: 0.25,
    maxAlivePerRealm: 0.25,
    headStartPerRealm: 120,
    maxHeadStart: 180,
  },
  revive: { radius: 70, seconds: 3, health: 0.5, invulnerable: 2 },
  stamina: {
    max: 100,
    regen: 32,
    regenDelay: 0.7,
    sprintMultiplier: 1.55,
    sprintDrain: 30,
    dashCost: 35,
    dashDuration: 0.18,
    dashSpeed: 830,
    dashRecovery: 0.35,
    dashGrace: 0.05,
  },
  merchant: MERCHANT,
  director: DIRECTOR,
  perfectDodge: { surge: 3, damage: 0.3 },
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
  instants: INSTANTS,
  fusions: FUSIONS,
  ascensions: ASCENSIONS,
  evolutions: EVOLUTIONS,
  enemies: ENEMIES,
  bosses: BOSSES,
  realms: REALMS,
  permanentUpgrades: PERMANENT_UPGRADES,
  balance: BALANCE,
  assets: ASSETS,
  cutscenes: [INTRO],
  achievements: ACHIEVEMENTS,
  dailyQuests: DAILY_QUESTS,
  wares: WARES,
  companions: COMPANIONS,
  twists: TWISTS,
  encounters: ENCOUNTERS,
  boons: BOONS,
};
