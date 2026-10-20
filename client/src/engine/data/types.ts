import { Modifier, StatBlock } from '../core/stats';
import { AssetManifest } from './assets';
import { CutsceneDefinition } from './cutscene';

export type * from './assets';
export type * from './cutscene';

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
  /** The gods this weapon belongs to; absent = common to every god (spec: run-progression / god arsenals). */
  readonly gods?: readonly string[];
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
      /** The projectile's sprite (default 'enemy_arrow'), e.g. a lampad's soul-fire. */
      readonly projectileSprite?: string;
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
    }
  /**
   * Marks `count` cones of `arc` radians and reach `radius` toward the target, alternating sides, `gap` seconds apart
   * (spec: boss-encounter / signature mechanics).
   */
  | {
      readonly type: 'sweep';
      readonly id: string;
      readonly windup: number;
      readonly radius: number;
      readonly arc: number;
      readonly damage: number;
      readonly count: number;
      readonly gap: number;
    }
  /** Marks a line from the attacker toward the target, then hits along it. */
  | {
      readonly type: 'lash';
      readonly id: string;
      readonly windup: number;
      readonly length: number;
      readonly width: number;
      readonly damage: number;
    }
  /**
   * Raises walls around the boss after a warning: pillars on each ring of `rings` (distances), in `segments` arcs with
   * `gapShare` of each ring left open; they stand `duration` seconds or until the next set rises.
   */
  | {
      readonly type: 'walls';
      readonly id: string;
      readonly windup: number;
      readonly duration: number;
      readonly damage: number;
      readonly rings: readonly number[];
      readonly segments: number;
      readonly gapShare: number;
    };

/** A head or tentacle of a boss (spec: boss-encounter / signature mechanics). */
export interface BossPartDefinition {
  readonly id: string;
  readonly name: string;
  readonly radius: number;
  /** Where it sits: around the boss (following it) or around the arena's centre. */
  readonly place: {
    readonly from: 'boss' | 'arena';
    readonly angle: number;
    readonly distance: number;
  };
  /** Its own rhythm: these attacks in turn, `pause` seconds apart, the first after `delay`. */
  readonly attacks: readonly BossAttack[];
  readonly pause: number;
  readonly delay: number;
  /** Damageable (a monster of its own); absent: it only attacks. */
  readonly health?: number;
  /** Ordered parts: only the lowest living order can be hurt. */
  readonly order?: number;
  /** Seconds after it falls before it grows back. */
  readonly regrow?: number;
  /** The stretch of arena it holds: damage per second and slow for gods inside. */
  readonly zone?: { readonly radius: number; readonly dps: number; readonly slow: number };
  /** It appears from this boss phase on (0: from the start). */
  readonly fromPhase?: number;
  readonly visual: Visual;
}

export interface BossPhase {
  /** The phase starts when health falls below this fraction (the first phase uses 1). */
  readonly below: number;
  readonly speedMultiplier: number;
  readonly attacks: readonly BossAttack[];
  readonly announcement: string;
  /** Rage: shown red; with `pauseMultiplier`, shorter pauses for the boss and its parts. */
  readonly enraged?: boolean;
  readonly pauseMultiplier?: number;
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
  readonly parts?: readonly BossPartDefinition[];
  /** Damage the boss takes while a damageable part lives (0.1 = a tenth). */
  readonly guard?: number;
  /** When every damageable part is down: exposed for `seconds`, taking `damageTaken` × damage; then they grow back. */
  readonly exposed?: { readonly seconds: number; readonly damageTaken: number };
  /** A charge that runs into a wall stops, and the boss is dazed this many seconds. */
  readonly chargeStun?: number;
  /** The boss stays within this distance of its arena's centre. */
  readonly anchored?: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Realms

export interface TerrainType {
  readonly id: string;
  /** Base colour of the generated tile. */
  readonly color: number;
}

/** A light an obstacle gives off (braziers, altars); drawn by the light map (D13). */
export interface LightSource {
  readonly radius: number;
  readonly color: number;
  /** 0–1. */
  readonly intensity: number;
  /** Flicker amount 0–1. */
  readonly flicker?: number;
}

export interface ObstacleKind {
  readonly id: string;
  readonly radius: number;
  readonly visual: Visual;
  readonly light?: LightSource;
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
  /** Light-bearing obstacles (braziers) evenly around the edge of every plaza, `offset` beyond its rim. */
  | {
      readonly type: 'plazaLights';
      readonly kind: string;
      readonly count: number;
      readonly offset: number;
    }
  /** Groves: clusters of `kind` obstacles. */
  | {
      readonly type: 'cluster';
      readonly kind: string;
      readonly count: readonly [number, number];
      readonly size: readonly [number, number];
      readonly spread: number;
    }
  /**
   * A temple landmark: a rectangular stylobate (`size` width × depth) with a colonnade of `column` obstacles
   * every `spacing` along its edge (some `fallen` — another kind — or missing), an `altar` at its centre and a
   * `light` obstacle on each side of the altar.
   */
  | {
      readonly type: 'temple';
      readonly column: string;
      readonly fallen: string;
      readonly altar: string;
      readonly light: string;
      readonly size: readonly [number, number];
      readonly spacing: number;
      readonly fallenChance: number;
      readonly missingChance: number;
    }
  /** Ruined walls: straight lines of `kind` blocks, `spacing` apart, some missing (breaches). */
  | {
      readonly type: 'walls';
      readonly kind: string;
      readonly count: readonly [number, number];
      readonly length: readonly [number, number];
      readonly spacing: number;
      readonly missingChance: number;
    }
  /**
   * A labyrinth over the whole map: square cells `cellPieces` blocks of `kind` wide (`spacing` apart, close enough
   * that the walls stop players and enemies) carved into a maze with every cell reachable, a share `loops` of the
   * inner walls knocked down, single blocks missing (`missingChance`, breaches).
   */
  | {
      readonly type: 'maze';
      readonly kind: string;
      readonly spacing: number;
      readonly cellPieces: number;
      readonly loops: number;
      readonly missingChance: number;
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
  /**
   * Roads from the spawn plaza to every ruin, the temple and the boss arena: open ground (no obstacles), drawn
   * as worn dirt. `wander` is how far a road strays sideways from the straight line.
   */
  readonly roads?: {
    readonly width: number;
    readonly wander: number;
    /** A thread of this colour drawn along the road to the boss arena (Ariadne's thread in the Labyrinth). */
    readonly thread?: number;
  };
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
  /** Night lighting and air (D13): ambient light colour (brightness ≥ 30%), fog and floating particle colours. */
  readonly atmosphere: {
    readonly ambient: number;
    readonly fog: number;
    readonly particles: number;
    /** A moon over the realm on its loading screen (default true; the Underworld has no sky). */
    readonly moon?: boolean;
  };
  readonly map: MapGenConfig;
  /** Lore lines and tips for the loading screen. */
  readonly tips?: readonly string[];
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
  /** Gold added to the run's gold when the realm's boss falls (spec: boss-encounter / defeating the boss). */
  readonly rewards: { readonly bossGold: number };
}

// ---------------------------------------------------------------------------------------------------------------

export interface StaminaBalance {
  readonly max: number;
  /** Stamina per second once `regenDelay` seconds have passed without spending any. */
  readonly regen: number;
  readonly regenDelay: number;
  readonly sprintMultiplier: number;
  /** Stamina per second while sprinting. */
  readonly sprintDrain: number;
  readonly dashCost: number;
  readonly dashDuration: number;
  /** Units per second while dashing. */
  readonly dashSpeed: number;
  /** Seconds after a dash ends before the next may start. */
  readonly dashRecovery: number;
  /** Extra invulnerability after the dash, so a hit landing as it ends still misses. */
  readonly dashGrace: number;
}

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
  /** Each player beyond the first adds these fractions (spec: co-op / difficulty per player). */
  readonly coop: {
    readonly enemyHealthPerPlayer: number;
    readonly spawnRatePerPlayer: number;
    readonly maxAlivePerPlayer: number;
    readonly bossHealthPerPlayer: number;
  };
  /** Each realm cleared adds these fractions (spec: endless-run / difficulty by depth). */
  readonly endless: {
    readonly enemyHealthPerRealm: number;
    readonly enemyDamagePerRealm: number;
    readonly spawnRatePerRealm: number;
    readonly maxAlivePerRealm: number;
    readonly bossHealthPerRealm: number;
    readonly bossDamagePerRealm: number;
  };
  /** Sprinting and dashing (spec: player-control / stamina, sprint and dash). */
  readonly stamina: StaminaBalance;
  /** A dash through a boss attack as it lands: Surge seconds and extra damage (spec: boss-encounter / perfect dodge). */
  readonly perfectDodge: { readonly surge: number; readonly damage: number };
  /** The Wandering Merchant (spec: merchant). */
  readonly merchant: MerchantBalance;
  /** Reviving a fallen ally (spec: co-op / reviving allies). */
  readonly revive: {
    /** How close a living ally must stand to the spirit. */
    readonly radius: number;
    /** Seconds of standing by it to revive. */
    readonly seconds: number;
    /** Fraction of maximum health the god returns with. */
    readonly health: number;
    readonly invulnerable: number;
  };
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
  /** External art (D12); empty means everything is code-drawn. */
  readonly assets: AssetManifest;
  readonly cutscenes: readonly CutsceneDefinition[];
  /** Goals that pay gold once (spec: glory / achievements). */
  readonly achievements: readonly AchievementDefinition[];
  /** The pool today's three quests are chosen from (spec: glory / daily quests). */
  readonly dailyQuests: readonly QuestDefinition[];
  /** What the Wandering Merchant sells (spec: merchant / wares). */
  readonly wares: readonly WareDefinition[];
  readonly companions: readonly CompanionDefinition[];
  /** A Daily Trial's rule for the day (spec: daily-trial / twists). */
  readonly twists: readonly TwistDefinition[];
}

// ---------------------------------------------------------------------------------------------------------------
// Run rules (spec: quick-runs, daily-trial)

/** Rules a run plays by on top of the content; deterministic data (D5). */
export interface RunRules {
  /** How fast each realm's clock runs against the run's: 2 brings phases, events and the boss in half the time. */
  readonly pace?: number;
  /** Stat modifiers for every god of the party, bots included. */
  readonly modifiers?: readonly Modifier[];
  /** Multipliers on every enemy (bosses included) and on the spawn rate. */
  readonly enemies?: {
    readonly health?: number;
    readonly damage?: number;
    readonly speed?: number;
    readonly spawnRate?: number;
  };
}

/** A Daily Trial's twist: a named rule for one run (spec: daily-trial / twists). */
export interface TwistDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Gods' modifiers and enemy multipliers only; the pace stays the realm's own. */
  readonly rules: Omit<RunRules, 'pace'>;
}

// ---------------------------------------------------------------------------------------------------------------
// The merchant (spec: merchant)

/** What buying a ware does; each type is one reusable rule in `sim/merchant.ts` (`WARE_EFFECTS`). */
export type WareEffect =
  | { readonly type: 'companion'; readonly companion: string }
  /** One more level for a weapon; offered once per held weapon below its maximum. */
  | { readonly type: 'weaponLevel' }
  /** Heals this fraction of maximum health; offered while hurt. */
  | { readonly type: 'heal'; readonly fraction: number };

export interface WareDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** In the run's gold, before growth per realm cleared. */
  readonly price: number;
  readonly effect: WareEffect;
  readonly visual: Visual;
}

export interface CompanionDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** An existing rendered sheet (D15), tinted and scaled to read as an ally. */
  readonly visual: Visual & { readonly tint: number; readonly scale: number };
  /** Its code-drawn icon for the HUD and the shop. */
  readonly icon: string;
  readonly radius: number;
  readonly speed: number;
  /** Hunts enemies within this distance of its god. */
  readonly hunt: number;
  /** Stops this far from its target to attack: small for biters, large for shooters. */
  readonly reach: number;
  /** Fired through the weapon behaviors (not `orbit`); `base.cooldown` is its attack interval. */
  readonly attack: AbilityDefinition;
  /** Health per second it gives its god. */
  readonly heal?: number;
}

export interface MerchantBalance {
  /** Realm times (seconds) the merchant arrives at. */
  readonly arrivals: readonly number[];
  /** Seconds it stays. */
  readonly stays: number;
  /** Radius of its ring; stepping in opens the shop. */
  readonly radius: number;
  /** How far from a god it appears. */
  readonly distance: number;
  /** Prices × (1 + priceGrowth × realms cleared). */
  readonly priceGrowth: number;
  readonly maxCompanions: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Glory (spec: glory). Measured on finished runs by the application; the simulation never reads these.

export type GoalMeasure =
  'kills' | 'timeSeconds' | 'level' | 'realmsCleared' | 'gold' | 'synergies' | 'runs';

export interface Goal {
  readonly measure: GoalMeasure;
  readonly target: number;
  /** One run's value, or added up (over every run for achievements, over the day for quests). */
  readonly over: 'run' | 'total';
  /** Only runs as this god count. */
  readonly god?: string;
  readonly mode?: 'solo' | 'coop';
  /** Achievements only: met once every god has met it. */
  readonly everyGod?: boolean;
}

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly goal: Goal;
  readonly gold: number;
  readonly sprite: string;
}

export interface QuestDefinition {
  readonly id: string;
  readonly description: string;
  readonly goal: Goal;
  readonly gold: number;
}
