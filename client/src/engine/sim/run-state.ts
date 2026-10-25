import type { BotSkill } from './bots';
import { WorldFrame } from './world-frame';
import { WorldCollision } from '../core/collision';
import { Footing } from '../maps/footing';
import { CLEARANCE, NavField } from '../enemies/navigation';
import { Rng } from '../core/rng';
import { SpatialHash } from '../core/spatial-hash';
import { Modifier } from '../core/stats';
import { ContentIndex } from '../data/content-index';
import {
  BalanceConfig,
  EnemyDefinition,
  GodDefinition,
  RealmDefinition,
  RunRules,
} from '../data/types';

export type { RunRules } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import {
  BossRuntime,
  ChaosSite,
  Companion,
  Enemy,
  Hazard,
  HostileProjectile,
  Merchant,
  Pickup,
  PickupKind,
  Player,
  Projectile,
  SimEvent,
  Wall,
  Zone,
} from './types';

/** What a run is started with. */
/** One player of a run: their god, name and permanent upgrades (from their own save). */
export interface PartySeat {
  readonly godId: string;
  readonly name: string;
  readonly modifiers: readonly Modifier[];
  /** A god played by the machine, and how well (spec: bot-allies). */
  readonly bot?: { readonly skill: BotSkill };
}

export interface RunConfig {
  readonly runId: string;
  /** The first player's god (the only one in a solo run). */
  readonly godId: string;
  readonly realmId: string;
  readonly seed: number;
  /** Permanent-upgrade modifiers of the first player's save. */
  readonly modifiers: readonly Modifier[];
  /**
   * Everyone in the run, in slot order (D11). Absent: a solo run of `godId` with `modifiers`. Difficulty scales
   * with its size (spec: co-op / difficulty per player).
   */
  readonly party?: readonly PartySeat[];
  /**
   * Several players on one screen (spec: co-op / local co-op on one screen): the human seats come first, and a soft
   * edge keeps them within the shared camera's reach.
   */
  readonly sharedScreen?: boolean;
  /** How this run plays apart from the content (quick runs, a Daily Trial's twist). Deterministic data (D5). */
  readonly rules?: RunRules;
  /** What kind of run this is, for the application's records; the simulation only echoes it in the result. */
  readonly variant?: RunVariant;
  /** The seasonal event on when the run began: its items may be offered (spec: seasonal-events). */
  readonly eventId?: string;
  /** Event weapons and relics bought in the event shop: offered in every run (spec: seasonal-events / event shop). */
  readonly unlocked?: readonly string[];
}

/** A run's kind, echoed in its result: a quick run, a Daily Trial, or a challenge from a link. */
export type RunVariant =
  | { readonly kind: 'quick' }
  | { readonly kind: 'daily'; readonly date: string; readonly twistId: string }
  | { readonly kind: 'challenge'; readonly quick?: boolean; readonly twistId?: string };

/** The party of a run config: its seats, or the solo player. */
export function partyOf(config: RunConfig): readonly PartySeat[] {
  return config.party?.length
    ? config.party
    : [{ godId: config.godId, name: 'You', modifiers: config.modifiers }];
}

export function emptyStatus() {
  return {
    burn: 0,
    burnDps: 0,
    burnProgress: 0,
    shock: 0,
    shockPotency: 0,
    stun: 0,
    slow: 0,
    slowPotency: 0,
  };
}

/**
 * All mutable state of one run plus the helpers systems share: entity creation, spatial queries and the event
 * buffer. Systems are plain functions over this object; `RunSimulation` decides their order and the run phase.
 */
/** The open gate to the next realm (spec: endless-run / the gate). */
export interface Gate {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The realm it leads to. */
  readonly to: RealmDefinition;
  /** Seconds a living god has stood inside without leaving. */
  standing: number;
  /** Seconds until it takes the party anyway. */
  closesIn: number;
}

/** The fixed simulation step: 60 steps per simulated second (D5). */
export const STEP = 1 / 60;

export class RunState implements WorldFrame {
  /** Positions move one step between `px`/`py` and `x`/`y` (WorldFrame). */
  readonly span = STEP;
  readonly balance: BalanceConfig;
  /** The realm the party is in; replaced when it passes a gate (spec: endless-run). */
  realm: RealmDefinition;
  arena: ArenaData;
  collision: WorldCollision;
  /** The ground's speed and grip (spec: arena-generation / footing). */
  footing: Footing;
  /** The way to the gods around obstacles and walls (spec: enemy-spawning / finding the way). */
  nav: NavField;
  /** A boss's own field, with room for its body; made when a boss first walks. */
  bossNav?: NavField;
  readonly god: GodDefinition;
  readonly party: readonly PartySeat[];
  /** The realm clock's speed (spec: quick-runs / quick pace); 1 for a full run. */
  readonly pace: number;
  /** A twist's enemy multipliers (spec: daily-trial / twists); 1 each in an ordinary run. */
  readonly enemyRules: { health: number; damage: number; speed: number; spawnRate: number };
  /** Difficulty multipliers for the party's size (1 for a solo run). */
  readonly partyScale: {
    readonly enemyHealth: number;
    readonly spawnRate: number;
    readonly maxAlive: number;
    readonly bossHealth: number;
  };

  readonly spawnRng: Rng;
  readonly combatRng: Rng;
  readonly lootRng: Rng;
  readonly offerRng: Rng;
  /** Where the merchant appears (spec: merchant): its own stream, so it never shifts spawns or loot (D5). */
  readonly merchantRng: Rng;
  /** The Director of Chaos's decisions and places (spec: director-of-chaos): its own stream (D5). */
  readonly chaosRng: Rng;
  /** What broken props drop (spec: arena-generation / breakable props): its own stream (D5). */
  readonly propRng: Rng;
  /** The arena's broken props, bit `i` for prop `i` (WorldFrame; the snapshot carries it as 32 bits). */
  brokenProps = 0;

  /** The run's clock (HUD, results). */
  time = 0;
  /** Seconds in the current realm: its timeline, events, boss time and scaling count from here. */
  realmTime = 0;
  /** Realms cleared so far (spec: endless-run / difficulty by depth). */
  depth = 0;
  /** The gate to the next realm, open once the realm's boss has fallen. */
  gate: Gate | undefined;
  kills = 0;
  /** Elites slain in the run, and health the gods have lost: what the Director observes (spec: director-of-chaos). */
  eliteKills = 0;
  damageTaken = 0;
  gold = 0;
  /** The event's currency collected this run (spec: seasonal-events / event currency). */
  tokens = 0;
  level = 1;
  xp = 0;
  pendingLevels = 0;
  pendingChests = 0;
  bossDefeated = false;
  boss: Enemy | undefined;
  /** Half the visible world size; enemies spawn outside it. */
  view = { halfWidth: 720, halfHeight: 420 };
  godMode = false;

  readonly players: Player[] = [];
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly hostileProjectiles: HostileProjectile[] = [];
  readonly hazards: Hazard[] = [];
  readonly pickups: Pickup[] = [];
  readonly companions: Companion[] = [];
  /** Shifting walls' pillars and the zones boss parts hold (spec: boss-encounter / signature mechanics). */
  readonly walls: Wall[] = [];
  readonly zones: Zone[] = [];
  /** The Wandering Merchant while it is in the realm (spec: merchant). */
  merchant: Merchant | undefined;
  /** Players who stepped into the merchant's ring and wait for their shop, in order. */
  readonly shopQueue: number[] = [];
  /**
   * The realm's temporary modifiers while an encounter holds them (spec: director-of-chaos / eclipse): monsters' walking
   * speed and the spawn rate (rules), and how dark it is (drawn only). 1, 1, 0 otherwise.
   */
  readonly omen = { enemySpeed: 1, spawnRate: 1, darkness: 0 };
  /** The Director's markers in the world: rifts, arrival marks, shrines, altars. */
  readonly sites: ChaosSite[] = [];
  readonly enemyGrid = new SpatialHash<Enemy>(96);
  readonly events: SimEvent[] = [];

  private nextId = 1;

  constructor(
    readonly config: RunConfig,
    readonly index: ContentIndex,
    arena: ArenaData,
  ) {
    this.balance = index.content.balance;
    this.realm = index.realm(config.realmId);
    this.arena = arena;
    // The run's own modifiers go to every seat (spec: quick-runs / quick pace).
    const extra = config.rules?.modifiers ?? [];
    this.party = partyOf(config).map((seat) =>
      extra.length ? { ...seat, modifiers: [...seat.modifiers, ...extra] } : seat,
    );
    this.pace = config.rules?.pace ?? 1;
    const enemies = config.rules?.enemies;
    this.enemyRules = {
      health: enemies?.health ?? 1,
      damage: enemies?.damage ?? 1,
      speed: enemies?.speed ?? 1,
      spawnRate: enemies?.spawnRate ?? 1,
    };
    this.god = index.god(this.party[0].godId);
    // More players, more and tougher enemies (spec: co-op / difficulty per player).
    const others = this.party.length - 1;
    const coop = this.balance.coop;
    this.partyScale = {
      enemyHealth: 1 + coop.enemyHealthPerPlayer * others,
      spawnRate: 1 + coop.spawnRatePerPlayer * others,
      maxAlive: 1 + coop.maxAlivePerPlayer * others,
      bossHealth: 1 + coop.bossHealthPerPlayer * others,
    };
    this.collision = new WorldCollision(arena.bounds, arena.obstacles);
    this.nav = new NavField(this.collision);
    this.footing = new Footing(arena, this.realm.map);
    const rng = new Rng(`run:${config.seed}`);
    this.spawnRng = rng.fork('spawn');
    this.combatRng = rng.fork('combat');
    this.lootRng = rng.fork('loot');
    this.offerRng = rng.fork('offers');
    this.merchantRng = rng.fork('merchant');
    this.chaosRng = rng.fork('chaos');
    this.propRng = rng.fork('props');
  }

  /** How dark an encounter makes the realm, 0–1 (WorldFrame). */
  get darkness(): number {
    return this.omen.darkness;
  }

  id(): number {
    return this.nextId++;
  }

  emit(event: SimEvent): void {
    this.events.push(event);
  }

  // -------------------------------------------------------------------------------------------------------------
  // Queries (dead entities are skipped)

  alivePlayers(): Player[] {
    return this.players.filter((p) => p.alive);
  }

  /**
   * The flow field for `enemy` (spec: enemy-spawning / finding the way). A boss gets one with more room around
   * obstacles, so it is not led through gaps its body cannot pass.
   */
  navFor(enemy: Enemy): NavField {
    if (!enemy.boss) return this.nav;
    const clearance = Math.max(CLEARANCE, Math.round(enemy.radius * 0.6));
    if (this.bossNav?.clearance !== clearance) {
      this.bossNav = new NavField(this.collision, clearance);
      this.bossNav.update(this.players);
    }
    return this.bossNav;
  }

  nearestPlayer(x: number, y: number): Player | undefined {
    let best: Player | undefined;
    let bestD = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  /** Centre of the living players (the camera's focus), or the last player position. */
  focus(): { x: number; y: number } {
    const alive = this.alivePlayers();
    const list = alive.length > 0 ? alive : this.players;
    let x = 0;
    let y = 0;
    for (const p of list) {
      x += p.x;
      y += p.y;
    }
    return { x: x / list.length, y: y / list.length };
  }

  nearestEnemy(
    x: number,
    y: number,
    range: number,
    exclude?: ReadonlySet<number>,
  ): Enemy | undefined {
    let best: Enemy | undefined;
    let bestD = Infinity;
    this.enemyGrid.query(x, y, range, (e) => {
      if (e.dead || exclude?.has(e.id)) return;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }

  enemiesInRadius(x: number, y: number, radius: number): Enemy[] {
    const result: Enemy[] = [];
    this.enemyGrid.query(x, y, radius, (e) => {
      if (!e.dead) result.push(e);
    });
    return result;
  }

  rebuildEnemyGrid(): void {
    this.enemyGrid.clear();
    for (const e of this.enemies) if (!e.dead) this.enemyGrid.insert(e);
  }

  // -------------------------------------------------------------------------------------------------------------
  // Creation

  /** Health and damage multiplier for enemies spawned now: the realm's own scaling (capped) times depth. */
  scaling(): { health: number; damage: number } {
    const minutes = this.realmTime / 60;
    const s = this.realm.scaling;
    const depth = this.depthScale();
    return {
      health: Math.min(s.max, 1 + s.healthPerMinute * minutes) * depth.enemyHealth,
      damage: Math.min(s.max, 1 + s.damagePerMinute * minutes) * depth.enemyDamage,
    };
  }

  /** How much harder every realm cleared makes the next (spec: endless-run / difficulty by depth). */
  depthScale(): {
    enemyHealth: number;
    enemyDamage: number;
    spawnRate: number;
    maxAlive: number;
    bossHealth: number;
    bossDamage: number;
  } {
    const e = this.balance.endless;
    const d = this.depth;
    return {
      enemyHealth: e.enemyHealthGrowth ** d,
      enemyDamage: e.enemyDamageGrowth ** d,
      spawnRate: 1 + e.spawnRatePerRealm * d,
      maxAlive: 1 + e.maxAlivePerRealm * d,
      bossHealth: e.bossHealthGrowth ** d,
      bossDamage: e.bossDamageGrowth ** d,
    };
  }

  /** Seconds into its spawn timeline the current realm reads its phases (spec: endless-run / difficulty by depth). */
  headStart(): number {
    const e = this.balance.endless;
    return Math.min(e.maxHeadStart, e.headStartPerRealm * this.depth);
  }

  /** Swaps in the next realm and its arena; the simulation clears and places everything (spec: endless-run). */
  enterRealm(realm: RealmDefinition, arena: ArenaData): void {
    this.realm = realm;
    this.arena = arena;
    this.collision = new WorldCollision(arena.bounds, arena.obstacles);
    this.nav = new NavField(this.collision);
    this.footing = new Footing(arena, realm.map);
    this.bossNav = undefined;
    this.realmTime = 0;
    this.boss = undefined;
    this.bossDefeated = false;
    this.gate = undefined;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.hostileProjectiles.length = 0;
    this.hazards.length = 0;
    this.pickups.length = 0;
    this.enemyGrid.clear();
    // The merchant stays in its realm; companions follow their gods (placed with the party).
    this.merchant = undefined;
    this.shopQueue.length = 0;
    this.walls.length = 0;
    this.zones.length = 0;
    // The Director cancels its encounters before travel; nothing of theirs may reach the next realm.
    this.sites.length = 0;
    this.omen.enemySpeed = 1;
    this.omen.spawnRate = 1;
    this.omen.darkness = 0;
    this.brokenProps = 0;
  }

  /** Spawns an enemy unless the global cap is reached (bosses ignore the cap). */
  spawnEnemy(
    def: EnemyDefinition,
    x: number,
    y: number,
    options: {
      elite?: boolean;
      boss?: BossRuntime;
      /** A boss part's monster: scaled like its boss, never held back by the cap. */
      part?: { bossId: number; partId: string };
    } = {},
  ): Enemy | undefined {
    const bossLike = !!options.boss || !!options.part;
    if (!bossLike && this.enemies.length >= this.balance.caps.enemies) return undefined;
    const scale = bossLike
      ? { health: this.depthScale().bossHealth, damage: this.depthScale().bossDamage }
      : this.scaling();
    const elite = options.elite ? this.realm.elite : undefined;
    const party = bossLike ? this.partyScale.bossHealth : this.partyScale.enemyHealth;
    const health =
      def.health * scale.health * (elite?.health ?? 1) * party * this.enemyRules.health;
    const enemy: Enemy = {
      id: this.id(),
      def,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      radius: def.radius * (elite?.size ?? 1),
      health,
      maxHealth: health,
      damage: def.damage * scale.damage * (elite?.damage ?? 1) * this.enemyRules.damage,
      speed: def.speed * this.enemyRules.speed,
      xp: def.xp * (elite?.xp ?? 1),
      gold: def.gold.amount + (elite?.gold ?? 0),
      elite: !!options.elite,
      boss: options.boss,
      part: options.part,
      status: emptyStatus(),
      attackTimer: 0.5,
      mode: 'move',
      modeTimer: 0,
      actionTimer: this.spawnRng.range(0.5, 2),
      dirX: 0,
      dirY: 0,
      headX: 0,
      headY: 0,
      hitFlash: 0,
      facing: 1,
      dead: false,
    };
    this.enemies.push(enemy);
    this.enemyGrid.insert(enemy);
    return enemy;
  }

  spawnHostileProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    damage: number,
    sprite: string,
  ): void {
    if (this.hostileProjectiles.length >= this.balance.caps.hostileProjectiles) return;
    this.hostileProjectiles.push({
      id: this.id(),
      x,
      y,
      px: x,
      py: y,
      vx,
      vy,
      radius,
      damage,
      lifetime: 4,
      sprite,
      dead: false,
    });
  }

  addHazard(hazard: Omit<Hazard, 'id' | 'dead' | 'timer'>): void {
    this.hazards.push({ ...hazard, id: this.id(), timer: hazard.warn, dead: false });
  }

  /**
   * Drops a pickup. XP and gold beyond the pickup cap merge into the nearest pickup of the same kind, so nothing
   * is lost (spec: enemy-spawning / entity caps).
   */
  spawnPickup(kind: PickupKind, x: number, y: number, value: number): void {
    if ((kind === 'xp' || kind === 'gold') && this.pickups.length >= this.balance.caps.pickups) {
      let target: Pickup | undefined;
      let bestD = Infinity;
      for (const p of this.pickups) {
        if (p.dead || p.kind !== kind) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          target = p;
        }
      }
      if (target) {
        target.value += value;
        return;
      }
    }
    this.pickups.push({ id: this.id(), kind, x, y, value, attracted: false, dead: false });
  }

  /** XP to go from `level` to `level + 1`. */
  xpToNext(level = this.level): number {
    const c = this.balance.xpCurve;
    return Math.round(c.base + c.perLevel * (level - 1) + c.growth * (level - 1) ** 2);
  }

  addXp(amount: number): void {
    this.xp += amount;
    let need = this.xpToNext();
    while (this.xp >= need) {
      this.xp -= need;
      this.level++;
      this.pendingLevels++;
      this.emit({ type: 'levelUp', level: this.level });
      need = this.xpToNext();
    }
  }
}
