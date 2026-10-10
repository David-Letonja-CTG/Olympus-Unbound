import { WorldCollision } from '../core/collision';
import { Rng } from '../core/rng';
import { SpatialHash } from '../core/spatial-hash';
import { Modifier } from '../core/stats';
import { ContentIndex } from '../data/content-index';
import { BalanceConfig, EnemyDefinition, GodDefinition, RealmDefinition } from '../data/types';
import { ArenaData } from '../maps/generate-arena';
import {
  BossRuntime,
  Enemy,
  Hazard,
  HostileProjectile,
  Pickup,
  PickupKind,
  Player,
  Projectile,
  SimEvent,
} from './types';

/** What a run is started with. */
export interface RunConfig {
  readonly runId: string;
  readonly godId: string;
  readonly realmId: string;
  readonly seed: number;
  /** Permanent-upgrade modifiers from the save (applied to every player). */
  readonly modifiers: readonly Modifier[];
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
export class RunState {
  readonly balance: BalanceConfig;
  readonly realm: RealmDefinition;
  readonly god: GodDefinition;
  readonly collision: WorldCollision;

  readonly spawnRng: Rng;
  readonly combatRng: Rng;
  readonly lootRng: Rng;
  readonly offerRng: Rng;

  time = 0;
  kills = 0;
  gold = 0;
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
  readonly enemyGrid = new SpatialHash<Enemy>(96);
  readonly events: SimEvent[] = [];

  private nextId = 1;

  constructor(
    readonly config: RunConfig,
    readonly index: ContentIndex,
    readonly arena: ArenaData,
  ) {
    this.balance = index.content.balance;
    this.realm = index.realm(config.realmId);
    this.god = index.god(config.godId);
    this.collision = new WorldCollision(arena.bounds, arena.obstacles);
    const rng = new Rng(`run:${config.seed}`);
    this.spawnRng = rng.fork('spawn');
    this.combatRng = rng.fork('combat');
    this.lootRng = rng.fork('loot');
    this.offerRng = rng.fork('offers');
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

  /** Health and damage multiplier for enemies spawned now (realm scaling, capped). */
  scaling(): { health: number; damage: number } {
    const minutes = this.time / 60;
    const s = this.realm.scaling;
    return {
      health: Math.min(s.max, 1 + s.healthPerMinute * minutes),
      damage: Math.min(s.max, 1 + s.damagePerMinute * minutes),
    };
  }

  /** Spawns an enemy unless the global cap is reached (bosses ignore the cap). */
  spawnEnemy(
    def: EnemyDefinition,
    x: number,
    y: number,
    options: { elite?: boolean; boss?: BossRuntime } = {},
  ): Enemy | undefined {
    if (!options.boss && this.enemies.length >= this.balance.caps.enemies) return undefined;
    const scale = options.boss ? { health: 1, damage: 1 } : this.scaling();
    const elite = options.elite ? this.realm.elite : undefined;
    const health = def.health * scale.health * (elite?.health ?? 1);
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
      damage: def.damage * scale.damage * (elite?.damage ?? 1),
      speed: def.speed,
      xp: def.xp * (elite?.xp ?? 1),
      gold: def.gold.amount + (elite?.gold ?? 0),
      elite: !!options.elite,
      boss: options.boss,
      status: emptyStatus(),
      attackTimer: 0.5,
      mode: 'move',
      modeTimer: 0,
      actionTimer: this.spawnRng.range(0.5, 2),
      dirX: 0,
      dirY: 0,
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
