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
  /** Offered only in runs of this seasonal event (spec: seasonal-events / event items). */
  readonly event?: string;
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
  /** Offered only in runs of this seasonal event (spec: seasonal-events / event items). */
  readonly event?: string;
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

/** A fusion's requirements: a synergy's, or another fusion at a level (spec: run-progression / fusions). */
export type FusionRequirement =
  SynergyRequirement | { readonly type: 'fusion'; readonly id: string; readonly minLevel?: number };

/**
 * A combined upgrade, offered once every requirement is met. Tier II and III need fusions of the tier below; the
 * tiers form the tree the build panel shows (spec: run-progression / fusions).
 */
export interface FusionDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tier: 1 | 2 | 3;
  readonly maxLevel: number;
  readonly requirements: readonly FusionRequirement[];
  /** Modifiers per level (stacked). */
  readonly modifiers: readonly Modifier[];
  readonly visual: Visual;
}

/**
 * A weapon's one transformation, at its top level with every requirement met (spec: run-progression / weapon
 * evolutions): one more step of numbers and a splash on hit (spec: combat / splash on hit).
 */
export interface EvolutionDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** The weapon that evolves; it keeps its identity for fusions and synergies. */
  readonly weapon: string;
  readonly requirements: readonly FusionRequirement[];
  /** Applied like one more level. */
  readonly upgrade: WeaponLevel;
  /** Every hit also strikes the foes within `radius` of its target for `fraction` of the weapon's damage. */
  readonly splash: { readonly radius: number; readonly fraction: number };
  readonly visual: Visual;
}

/** An upgrade without a top level, filling the offers once few others remain (spec: run-progression / ascensions). */
export interface AscensionDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Modifiers per level (stacked). */
  readonly modifiers: readonly Modifier[];
  readonly visual: Visual;
}

/** What taking an instant blessing does; each type is one rule in `progression/instants.ts` (`INSTANT_RULES`). */
export type InstantEffect = GatherEffect;

/** Calls every pickup of these kinds in the realm to the gods. */
export interface GatherEffect {
  readonly type: 'gather';
  readonly kinds: readonly ('xp' | 'gold')[];
}

/**
 * A level-up offer applied once, at once, that takes no slot and may be offered again (spec: run-progression /
 * instant blessings).
 */
export interface InstantDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: InstantEffect;
  /** Offer weight, against `offerWeights`. */
  readonly weight: number;
  /** A `gather` is only offered with at least this many such pickups beyond every god's magnet. */
  readonly minLying?: number;
  readonly visual: Visual;
}

/**
 * A seasonal event (spec: seasonal-events): on every year between `from` and `to` (month-day, inclusive, may
 * wrap the new year) on the player's device, unless switched on or off on the admin page.
 */
export interface EventDefinition {
  readonly id: string;
  readonly name: string;
  /** One line for the menu banner. */
  readonly tagline: string;
  readonly window: { readonly from: string; readonly to: string };
  /** The event's colour in menus. */
  readonly accent: number;
  /**
   * Its currency, dropped only in its runs (spec: seasonal-events / event currency): by `chance` per kill, and
   * `elite` and `boss` tokens for those.
   */
  readonly currency: {
    readonly name: string;
    readonly chance: number;
    readonly elite: number;
    readonly boss: number;
  };
}

/** What an event's shop sells for its currency (spec: seasonal-events / event shop). */
export interface EventRewardDefinition {
  readonly id: string;
  readonly event: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly effect:
    | { readonly type: 'modifiers'; readonly modifiers: readonly Modifier[] }
    /** The event's weapon or relic may be offered in every run, all year. */
    | { readonly type: 'unlock'; readonly item: string };
  readonly sprite: string;
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
  /**
   * Marks a wide pull ring and a maw round the boss: during the wind-up gods in the ring are drawn toward the boss at
   * `pullSpeed`, then the maw strikes (spec: boss-encounter / devour).
   */
  | {
      readonly type: 'devour';
      readonly id: string;
      readonly windup: number;
      readonly pullRadius: number;
      readonly pullSpeed: number;
      readonly radius: number;
      readonly damage: number;
    }
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

/** A procedural pattern painted into a terrain's ground once, when the realm loads (spec: visual-atmosphere). */
export type TerrainTexture =
  'slabs' | 'cobbles' | 'cracks' | 'ripples' | 'ash' | 'mud' | 'grass' | 'earth' | 'moss';

export interface TerrainType {
  readonly id: string;
  /** Base colour of the generated tile. */
  readonly color: number;
  /** Its pattern: `size` world units per stone, ripple or plate; `strength` 0–1 (default 1). */
  readonly texture?: {
    readonly kind: TerrainTexture;
    readonly size?: number;
    readonly strength?: number;
  };
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

/** A jar, urn, basket or crate a god breaks by walking into it (spec: arena-generation / breakable props). */
export interface PropKind {
  readonly id: string;
  readonly radius: number;
  /** `color` is the shards'. */
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
  /**
   * The realm's landmark (spec: arena-generation / landmarks): one great `kind` obstacle on its own site, apart
   * from the spawn, the boss arena, the roads and the other sites; `ground` is stamped round it.
   */
  | {
      readonly type: 'landmark';
      readonly kind: string;
      readonly ground?: string;
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
  /** `clusters` small clusters (1–3) of breakable props of these kinds (spec: arena-generation / breakable props). */
  readonly props?: { readonly kinds: readonly PropKind[]; readonly clusters: number };
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
  /** A seasonal event's realm: chosen only while its event is on, and outside the chain (spec: seasonal-events). */
  readonly event?: string;
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
    /** A fusion whose requirements are met: high, the build has earned it. */
    readonly fusion: number;
    /** A weapon's evolution, ready: the biggest moment of a build. */
    readonly evolution: number;
    /** An ascension filling a short pool. */
    readonly ascension: number;
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
  /** What a broken prop drops (spec: arena-generation / breakable props). */
  readonly props: {
    readonly goldChance: number;
    readonly gold: number;
    readonly xpChance: number;
    readonly xp: number;
    readonly healChance: number;
    readonly healAmount: number;
  };
  /** Each player beyond the first adds these fractions (spec: co-op / difficulty per player). */
  readonly coop: {
    readonly enemyHealthPerPlayer: number;
    readonly spawnRatePerPlayer: number;
    readonly maxAlivePerPlayer: number;
    readonly bossHealthPerPlayer: number;
  };
  /**
   * Each realm cleared multiplies health and damage by these growths (compounding) and adds these fractions of spawn
   * rate and room; later realms start their spawn phases further in (spec: endless-run / difficulty by depth).
   */
  readonly endless: {
    /** At least every realm's `scaling.max`, so a new realm never starts weaker than the last ended. */
    readonly enemyHealthGrowth: number;
    readonly enemyDamageGrowth: number;
    readonly bossHealthGrowth: number;
    readonly bossDamageGrowth: number;
    readonly spawnRatePerRealm: number;
    readonly maxAlivePerRealm: number;
    /** Seconds into its spawn timeline a realm starts, per realm cleared, up to `maxHeadStart`. */
    readonly headStartPerRealm: number;
    readonly maxHeadStart: number;
  };
  /** Sprinting and dashing (spec: player-control / stamina, sprint and dash). */
  readonly stamina: StaminaBalance;
  /** A dash through a boss attack as it lands: Surge seconds and extra damage (spec: boss-encounter / perfect dodge). */
  readonly perfectDodge: { readonly surge: number; readonly damage: number };
  /** The Wandering Merchant (spec: merchant). */
  readonly merchant: MerchantBalance;
  /** The Director of Chaos (spec: director-of-chaos). */
  readonly director: DirectorBalance;
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
  /** Level-up offers used at once (spec: run-progression / instant blessings). */
  readonly instants: readonly InstantDefinition[];
  /** Combined upgrades and upgrades without end (spec: run-progression / fusions, ascensions). */
  readonly fusions: readonly FusionDefinition[];
  readonly ascensions: readonly AscensionDefinition[];
  /** Seasonal events and what belongs to them (spec: seasonal-events). */
  readonly events: readonly EventDefinition[];
  readonly eventRewards: readonly EventRewardDefinition[];
  /** One per weapon at most (spec: run-progression / weapon evolutions). */
  readonly evolutions: readonly EvolutionDefinition[];
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
  /** What the Director of Chaos may start, and the blessings it grants (spec: director-of-chaos). */
  readonly encounters: readonly EncounterDefinition[];
  readonly boons: readonly BoonDefinition[];
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
  /** The Director of Chaos starts encounters (default true); off for debugging and regression runs. */
  readonly director?: boolean;
}

/** A Daily Trial's twist: a named rule for one run (spec: daily-trial / twists). */
export interface TwistDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Gods' modifiers and enemy multipliers only; the pace stays the realm's own. */
  readonly rules: Omit<RunRules, 'pace' | 'director'>;
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
  | 'kills'
  | 'timeSeconds'
  | 'level'
  | 'realmsCleared'
  | 'gold'
  | 'synergies'
  /** Fusions held at the end of a run, and the highest tier among them (spec: glory / achievements). */
  | 'fusions'
  | 'fusionTier'
  | 'runs';

export interface Goal {
  readonly measure: GoalMeasure;
  readonly target: number;
  /** One run's value, or added up (over every run for achievements, over the day for quests). */
  readonly over: 'run' | 'total';
  /** Only runs as this god count. */
  readonly god?: string;
  /** Only runs that started in this realm count (spec: seasonal-events / event achievements). */
  readonly realm?: string;
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

// ---------------------------------------------------------------------------------------------------------------
// The Director of Chaos (spec: director-of-chaos)

/** A timed blessing: stat modifiers for some seconds of the run (spec: director-of-chaos / divine blessings). */
export interface BoonDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly seconds: number;
  readonly modifiers: readonly Modifier[];
  /** A defensive boon, weighted up while the party struggles. */
  readonly relief?: boolean;
  readonly visual: Visual;
}

/** What an encounter's ending gives the party; gold grows with the realms cleared. */
export interface EncounterReward {
  readonly gold?: number;
  /** A treasure chest where the encounter ended. */
  readonly chest?: boolean;
  /** A boon for every living god. */
  readonly boon?: string;
  /** Healing for every living god, as a fraction of maximum health. */
  readonly heal?: number;
}

/** Changes to the run's realm state, clamped to its ranges (spec: director-of-chaos / realm state). */
export interface RealmStateChange {
  readonly corruption?: number;
  readonly grudge?: number;
}

/** One way an encounter can end: announced, rewarded and remembered once. */
export interface EncounterOutcome {
  /** Completed (true) or failed (false). */
  readonly success: boolean;
  readonly text: string;
  readonly reward?: EncounterReward;
  readonly changes?: RealmStateChange;
}

/**
 * How an encounter plays: one reusable rule per type in `chaos/behaviors.ts` (`ENCOUNTER_BEHAVIORS`). Enemy ids are
 * optional: without them the realm's own kinds are used (its current spawn phase, its elites), so every realm keeps
 * its identity.
 */
export type EncounterBehavior =
  /** A rift, then stages of invaders; the last stage may bring an elite. Ends: `repelled`, `overrun`. */
  | {
      readonly type: 'invasion';
      readonly stages: readonly { readonly count: number; readonly enemy?: string }[];
      readonly elite: boolean;
      /** Seconds before the next stage comes even if the last one still fights. */
      readonly stageGap: number;
      /** Seconds to repel it. */
      readonly timeLimit: number;
      /** Most invaders in one stage after scaling by the party and depth. */
      readonly maxCount: number;
    }
  /** Darkness, faster and more frequent monsters, then a champion. Ends: `broken` (champion slain), `endured`. */
  | {
      readonly type: 'eclipse';
      readonly seconds: number;
      readonly enemySpeed: number;
      readonly spawnRate: number;
      /** 0–1: how far the light dims toward night (drawn only). */
      readonly darkness: number;
      /** The champion is marked `warn` seconds before it arrives `at` seconds into the eclipse, with `health` × an elite's. */
      readonly champion: { readonly at: number; readonly warn: number; readonly health: number };
    }
  /** One hunter of the realm's elites that pursues the gods. Ends: `slain`, `escaped`. */
  | {
      readonly type: 'hunt';
      readonly health: number;
      readonly speed: number;
      /** Seconds after it arrives before it escapes. */
      readonly escapeAfter: number;
      /** Telegraphed attacks in turn, through the boss attack rules (slam, boulder, lash). */
      readonly attacks: readonly BossAttack[];
      readonly pause: number;
      /** Its title by the party's most damaging element, e.g. "Stormbreaker". */
      readonly titles: Readonly<Record<Element, string>>;
    }
  /** A shrine that blesses the party when a god steps in. Ends: `received`, `faded`. */
  | {
      readonly type: 'shrine';
      readonly boons: readonly string[];
      readonly seconds: number;
      readonly radius: number;
      /** How far from a god it rises (further when the gods stand still). */
      readonly distance: number;
    }
  /**
   * An altar offering an encounter with a bonus; stepping in accepts it for the party, letting it fade declines it.
   * Ends: `accepted`, `declined`.
   */
  | {
      readonly type: 'contract';
      readonly offers: string;
      readonly seconds: number;
      readonly radius: number;
      readonly distance: number;
      /** What the offered encounter risks, in words for the HUD. */
      readonly risk: string;
      /** Added to the offered encounter's successful ending. */
      readonly bonus: EncounterReward;
    };

/** The endings each behavior can reach; an encounter's `outcomes` must define every one (content validation). */
export const ENCOUNTER_ENDINGS: Readonly<Record<EncounterBehavior['type'], readonly string[]>> = {
  invasion: ['repelled', 'overrun'],
  eclipse: ['broken', 'endured'],
  hunt: ['slain', 'escaped'],
  shrine: ['received', 'faded'],
  contract: ['accepted', 'declined'],
};

/** Tags the adaptive rules read (spec: director-of-chaos / adaptive rules). */
export type EncounterTag = 'relief' | 'durable' | 'movement';

export interface EncounterDefinition {
  readonly id: string;
  readonly name: string;
  /** What the party must do, for the HUD. */
  readonly objective: string;
  /** Announced when its warning starts. */
  readonly announce: string;
  readonly behavior: EncounterBehavior;
  /** A big threat: one at a time, with a longer gap after it, never under high pressure. */
  readonly major: boolean;
  /** Seconds of warning before it can hurt anyone. */
  readonly telegraph: number;
  readonly weight: number;
  /** Seconds after it ends before it may be chosen again. */
  readonly cooldown: number;
  /** At most this many times in one realm. */
  readonly perRealm: number;
  /** The earliest realm time it may start. */
  readonly from: number;
  readonly minDepth?: number;
  /** Only in these realms; absent: every realm. */
  readonly realms?: readonly string[];
  /** Only while the pressure is within this band. */
  readonly pressure?: { readonly min?: number; readonly max?: number };
  /** What the realm state must be. */
  readonly requires?: {
    readonly corruption?: number;
    readonly maxCorruption?: number;
    readonly grudge?: number;
    /** Elites slain in the run. */
    readonly elitesSlain?: number;
  };
  readonly tags?: readonly EncounterTag[];
  /** Started only by a contract, never chosen on its own. */
  readonly offered?: boolean;
  /** Its endings by key; each behavior names the keys it ends with. */
  readonly outcomes: Readonly<Record<string, EncounterOutcome>>;
}

/** The Director's pacing, pressure model and adaptive rules (spec: director-of-chaos). */
export interface DirectorBalance {
  /** Seconds between observations, and between decisions. */
  readonly observe: number;
  readonly think: number;
  /** Realm seconds before the first encounter. */
  readonly firstAt: number;
  /** Seconds after any encounter ends, and after a major one, before the next may start. */
  readonly gap: number;
  readonly majorGap: number;
  /** Seconds of quiet after the gap over which the chance to start grows to 1. */
  readonly ramp: number;
  readonly maxActive: number;
  /** A resolving encounter's seconds (its outcome shown, its pieces cleared). */
  readonly resolve: number;
  readonly pressure: {
    readonly weights: {
      readonly threat: number;
      readonly damage: number;
      readonly health: number;
      readonly boss: number;
      readonly encounters: number;
    };
    /** Threats within this distance of a living god count. */
    readonly radius: number;
    /** Weighted threats that make the threat factor 1 (a monster 1, an elite 5, the boss 12, a hazard 3). */
    readonly threatScale: number;
    /** Damage per second, as a share of the party's maximum health, that makes the damage factor 1. */
    readonly damageScale: number;
    /** Seconds over which recent damage fades by half. */
    readonly damageHalfLife: number;
    /** Above `high` the pressure is high; majors start only at or below `major`, others at or below `minor`. */
    readonly high: number;
    readonly major: number;
    readonly minor: number;
    /** Seconds of high pressure that open a recovery window, and its length. */
    readonly recoveryAfter: number;
    readonly recovery: number;
  };
  readonly adapt: {
    /** At most one adaptive nudge per this many seconds. */
    readonly every: number;
    /** The weight multiplier an adaptive rule gives. */
    readonly boost: number;
    /** Kills per second over `killWindow` seconds that mark a dominant party. */
    readonly fastKills: number;
    readonly killWindow: number;
    /** Every living god within `stillRadius` of where it was `stillSeconds` ago: the party stands still. */
    readonly stillSeconds: number;
    readonly stillRadius: number;
    /** Average health share below which the party struggles. */
    readonly lowHealth: number;
    /** Pressure below which a fast-killing party counts as dominant. */
    readonly calm: number;
  };
  /** Weight multiplier for the encounter chosen last. */
  readonly novelty: number;
  /** Decisions and outcomes kept for the debug report. */
  readonly memory: number;
  /** Corruption added on entering each deeper realm. */
  readonly corruptionPerRealm: number;
  readonly maxCorruption: number;
  readonly maxGrudge: number;
  /** Gold rewards × (1 + goldPerRealm × realms cleared). */
  readonly goldPerRealm: number;
}
