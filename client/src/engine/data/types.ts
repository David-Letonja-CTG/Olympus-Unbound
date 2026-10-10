import { Modifier, StatBlock } from '../core/stats';

/**
 * Content schema (D4). Content lives in `src/content/` as typed data; the engine only knows these shapes.
 * Every definition has a stable `id` (snake_case) used in saves, specs and tests; `name` is display text.
 */

export type Element = 'lightning' | 'fire' | 'physical' | 'shadow';
export const ELEMENTS: readonly Element[] = ['lightning', 'fire', 'physical', 'shadow'];

/** A sprite key the Phaser layer knows how to draw, plus a colour for generic fallbacks and effects. */
export interface Visual {
  readonly sprite: string;
  readonly color: number;
  /** Sprite of the projectiles or orbs a weapon creates, when it differs from its icon. */
  readonly projectile?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Combat

export type StatusEffectId = 'burn' | 'shock' | 'stun' | 'slow';

/**
 * A status effect a hit may apply. `potency` means: burn — damage per second as a fraction of the hit's damage;
 * shock — extra damage taken (0.25 = +25%); slow — speed reduction (0.4 = −40%); stun — unused.
 */
export interface StatusApplication {
  readonly effect: StatusEffectId;
  readonly chance: number;
  readonly duration: number;
  readonly potency: number;
}

export type WeaponBehaviorId = 'projectile' | 'chain' | 'orbit' | 'nova' | 'sweep' | 'strike';

/**
 * Numbers a weapon behavior reads. Not every behavior uses every field:
 * - `amount` projectiles / orbs / strikes / sweeps / chain bolts
 * - `size` projectile or orb radius; area radius for nova, sweep reach and strike blasts
 * - `range` targeting range; `arc` sweep width or projectile spread (radians)
 * - `cooldown` seconds between attacks; for orbit, seconds before an orb may hit the same enemy again
 * - `duration` projectile lifetime
 * - `speed` projectile speed or orbit angular speed (rad/s); `pierce` −1 = unlimited
 */
export interface WeaponStats {
  readonly damage: number;
  readonly cooldown: number;
  readonly amount: number;
  readonly speed: number;
  readonly pierce: number;
  readonly size: number;
  readonly range: number;
  readonly arc: number;
  readonly duration: number;
  readonly knockback: number;
  readonly chains: number;
  readonly critChance: number;
  readonly homing: number;
}

export interface WeaponLevel extends Partial<WeaponStats> {
  /** Shown on the level-up card, e.g. "+1 projectile". */
  readonly text: string;
  /** Effects added at this level. */
  readonly effects?: readonly StatusApplication[];
}

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly element: Element;
  readonly behavior: WeaponBehaviorId;
  readonly base: WeaponStats;
  readonly effects?: readonly StatusApplication[];
  /** Deltas for levels 2, 3, …; the maximum level is `levels.length + 1`. */
  readonly levels: readonly WeaponLevel[];
  /** Fraction of damage dealt that heals the wielder. */
  readonly lifesteal?: number;
  readonly visual: Visual;
}

/** A god's active ability: a weapon behavior fired on demand. `base.cooldown` is the ability cooldown. */
export type AbilityDefinition = Omit<WeaponDefinition, 'levels'>;

export interface GodDefinition {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly baseStats: Partial<StatBlock>;
  readonly startingWeapon: string;
  readonly ability: AbilityDefinition;
  readonly passive: {
    readonly name: string;
    readonly description: string;
    readonly modifiers: readonly Modifier[];
  };
  /** Elements this god favours; offers of matching items are weighted up. */
  readonly affinities: readonly Element[];
  readonly visual: Visual;
}

// ---------------------------------------------------------------------------------------------------------------
// Items

export interface ArmourDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Modifiers gained at levels 1, 2, …; a level's total is the sum of all levels up to it. */
  readonly levels: readonly { readonly text: string; readonly modifiers: readonly Modifier[] }[];
  readonly visual: Visual;
}

export interface RelicDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly modifiers: readonly Modifier[];
  /** Weights the relic up for gods or builds with this element. */
  readonly element?: Element;
  readonly visual: Visual;
}

export interface SkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly maxLevel: number;
  /** Modifiers per level (stacked). */
  readonly modifiers: readonly Modifier[];
  /** Only offered when the player holds a weapon of this element. */
  readonly requiresElement?: Element;
  /** Only offered when the player holds a weapon with one of these behaviors. */
  readonly requiresBehavior?: readonly WeaponBehaviorId[];
  readonly visual: Visual;
}

export type SynergyRequirement =
  | { readonly type: 'weapon'; readonly id: string; readonly minLevel?: number }
  | { readonly type: 'armour'; readonly id: string; readonly minLevel?: number }
  | { readonly type: 'relic'; readonly id: string }
  | { readonly type: 'skill'; readonly id: string; readonly minLevel?: number }
  | { readonly type: 'element'; readonly element: Element; readonly count: number };

export interface SynergyDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requirements: readonly SynergyRequirement[];
  readonly modifiers: readonly Modifier[];
  readonly visual: Visual;
}

/** Bought with gold between runs; applies to every run. */
export interface PermanentUpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Gold cost of levels 1, 2, …; the maximum level is `costs.length`. */
  readonly costs: readonly number[];
  /** Modifiers per level (stacked). */
  readonly modifiers: readonly Modifier[];
}

// ---------------------------------------------------------------------------------------------------------------
// Enemies and bosses

export type EnemyBehavior =
  /** Walks straight at the nearest player; `jitter` adds a deterministic weave (0–1). */
  | { readonly type: 'chaser'; readonly jitter?: number }
  /** Keeps `preferredRange` and shoots at the player. */
  | {
      readonly type: 'ranged';
      readonly preferredRange: number;
      readonly cooldown: number;
      readonly projectileSpeed: number;
      readonly projectileDamage: number;
      readonly projectileRadius: number;
    }
  /** Approaches; within `triggerRange` stops, telegraphs for `windup`, then dashes. */
  | {
      readonly type: 'charger';
      readonly triggerRange: number;
      readonly windup: number;
      readonly dashSpeed: number;
      readonly dashDuration: number;
      readonly cooldown: number;
    }
  /** Keeps its distance and periodically calls `count` enemies of type `summon` around itself. */
  | {
      readonly type: 'summoner';
      readonly keepDistance: number;
      readonly cooldown: number;
      readonly summon: string;
      readonly count: number;
    };

export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  readonly speed: number;
  /** Contact damage per attack (one attack per `attackInterval`). */
  readonly damage: number;
  readonly radius: number;
  readonly xp: number;
  readonly gold: { readonly chance: number; readonly amount: number };
  /** 0 = full knockback, 1 = immovable. */
  readonly knockbackResist: number;
  readonly behavior: EnemyBehavior;
  readonly visual: Visual;
}

export type BossAttack =
  /** Marks a circle around the boss, then hits everything inside it. */
  | {
      readonly type: 'slam';
      readonly id: string;
      readonly windup: number;
      readonly radius: number;
      readonly damage: number;
    }
  /** Marks `count` circles at and around the player's position, then hits them. */
  | {
      readonly type: 'boulder';
      readonly id: string;
      readonly windup: number;
      readonly radius: number;
      readonly damage: number;
      readonly count: number;
      readonly spread: number;
    }
  /** Marks a line toward the player, then dashes along it. */
  | {
      readonly type: 'charge';
      readonly id: string;
      readonly windup: number;
      readonly length: number;
      readonly width: number;
      readonly damage: number;
      readonly speed: number;
    }
  /** Calls `count` enemies of type `enemy` around the boss. */
  | {
      readonly type: 'summon';
      readonly id: string;
      readonly enemy: string;
      readonly count: number;
    };

export interface BossPhase {
  /** The phase starts when health falls below this fraction (the first phase uses 1). */
  readonly below: number;
  readonly speedMultiplier: number;
  readonly attacks: readonly BossAttack[];
  readonly announcement: string;
}

export interface BossDefinition {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly health: number;
  readonly radius: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly xp: number;
  readonly gold: number;
  /** Seconds between attacks once one has resolved. */
  readonly attackPause: number;
  readonly phases: readonly BossPhase[];
  readonly visual: Visual;
}

// ---------------------------------------------------------------------------------------------------------------
// Realms

export interface TerrainType {
  readonly id: string;
  /** Base colour of the generated tile. */
  readonly color: number;
}

export interface ObstacleKind {
  readonly id: string;
  readonly radius: number;
  readonly visual: Visual;
}

export type PointOfInterestRule =
  /** Ruined temples: rings of `kind` obstacles around a plaza, some pieces missing. */
  | {
      readonly type: 'ring';
      readonly kind: string;
      readonly count: readonly [number, number];
      readonly radius: readonly [number, number];
      readonly pieces: number;
      readonly missingChance: number;
      readonly plazaTerrain: string;
    }
  /** Groves: clusters of `kind` obstacles. */
  | {
      readonly type: 'cluster';
      readonly kind: string;
      readonly count: readonly [number, number];
      readonly size: readonly [number, number];
      readonly spread: number;
    };

export interface MapGenConfig {
  readonly widthTiles: number;
  readonly heightTiles: number;
  readonly tileSize: number;
  /** Impassable cliff band around the edge, in tiles. */
  readonly borderTiles: number;
  readonly terrain: {
    readonly types: readonly TerrainType[];
    /** Noise feature size in tiles. */
    readonly noiseScale: number;
    /** Noise value thresholds, ascending; the first rule whose `below` exceeds the noise value wins. */
    readonly bands: readonly { readonly below: number; readonly terrain: string }[];
    readonly plaza: string;
    readonly border: string;
  };
  readonly spawnClearRadius: number;
  readonly bossArena: { readonly radius: number; readonly minDistanceFromSpawn: number };
  /** Minimum distance between the edges of two obstacles. */
  readonly minObstacleGap: number;
  readonly maxObstacles: number;
  readonly obstacles: readonly ObstacleKind[];
  readonly pointsOfInterest: readonly PointOfInterestRule[];
  /** Single obstacles scattered across the map; `density` = obstacles per 1000 tiles. */
  readonly scatter: readonly {
    readonly kind: string;
    readonly density: number;
    readonly terrain?: readonly string[];
  }[];
  /** Non-colliding decorations by terrain; `density` per 1000 tiles of that terrain. */
  readonly decorations: readonly {
    readonly id: string;
    readonly terrain: readonly string[];
    readonly density: number;
    readonly visual: Visual;
  }[];
}

export interface SpawnPhase {
  readonly from: number;
  /** Enemies per second. */
  readonly rate: number;
  readonly maxAlive: number;
  readonly enemies: readonly { readonly id: string; readonly weight: number }[];
  /** Packs of one type that arrive together. */
  readonly groups?: readonly {
    readonly id: string;
    readonly size: readonly [number, number];
    readonly every: number;
  }[];
}

export type SpawnEvent =
  | { readonly at: number; readonly type: 'horde'; readonly enemy: string; readonly count: number }
  | { readonly at: number; readonly type: 'elite'; readonly enemy: string };

export interface RealmDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly backgroundColor: number;
  readonly map: MapGenConfig;
  /** Ordered by `from`; the last phase whose `from` has passed is active. */
  readonly timeline: readonly SpawnPhase[];
  readonly events: readonly SpawnEvent[];
  /** Enemy health and damage grow linearly per minute up to `max` (e.g. 2.5 = ×2.5). */
  readonly scaling: {
    readonly healthPerMinute: number;
    readonly damagePerMinute: number;
    readonly max: number;
  };
  readonly elite: {
    readonly health: number;
    readonly damage: number;
    readonly size: number;
    readonly gold: number;
    readonly xp: number;
  };
  readonly boss: { readonly id: string; readonly at: number; readonly spawnRateMultiplier: number };
  readonly rewards: { readonly victoryGold: number };
}

// ---------------------------------------------------------------------------------------------------------------

export interface BalanceConfig {
  readonly maxWeapons: number;
  readonly maxRelics: number;
  readonly offerCount: number;
  /** XP to reach level L+1 from L: base + perLevel×(L−1) + growth×(L−1)². */
  readonly xpCurve: { readonly base: number; readonly perLevel: number; readonly growth: number };
  readonly offerWeights: {
    readonly newWeapon: number;
    readonly weaponLevel: number;
    readonly armour: number;
    readonly armourLevel: number;
    readonly relic: number;
    readonly skill: number;
    /** Multiplier for items matching the god's affinities or held weapons' elements. */
    readonly affinity: number;
  };
  readonly fallback: { readonly healFraction: number; readonly gold: number };
  readonly player: {
    readonly radius: number;
    readonly invulnerableAfterHit: number;
    readonly reviveInvulnerable: number;
  };
  readonly enemyAttackInterval: number;
  readonly caps: {
    readonly enemies: number;
    readonly projectiles: number;
    readonly hostileProjectiles: number;
    readonly pickups: number;
  };
  readonly drops: { readonly healChance: number; readonly healAmount: number };
}

export interface GameContent {
  readonly gods: readonly GodDefinition[];
  readonly weapons: readonly WeaponDefinition[];
  readonly armour: readonly ArmourDefinition[];
  readonly relics: readonly RelicDefinition[];
  readonly skills: readonly SkillDefinition[];
  readonly synergies: readonly SynergyDefinition[];
  readonly enemies: readonly EnemyDefinition[];
  readonly bosses: readonly BossDefinition[];
  readonly realms: readonly RealmDefinition[];
  readonly permanentUpgrades: readonly PermanentUpgradeDefinition[];
  readonly balance: BalanceConfig;
}
