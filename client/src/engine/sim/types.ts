import { StatBlock } from '../core/stats';
import {
  GodDefinition,
  ArmourDefinition,
  BossAttack,
  BossDefinition,
  Element,
  EnemyDefinition,
  RelicDefinition,
  StatusApplication,
  SynergyDefinition,
  WeaponBehaviorId,
  WeaponDefinition,
  WeaponStats,
} from '../data/types';

/** One player's intent for one step, independent of the device it came from. */
export interface PlayerInput {
  /** Movement in [-1, 1] per axis; the length is clamped to 1. */
  moveX: number;
  moveY: number;
  /** True while the ability button is held. */
  ability: boolean;
  /** True while the sprint button is held (spec: player-control / stamina, sprint and dash). */
  sprint?: boolean;
  /** True if the dash button was held or tapped during the step. */
  dash?: boolean;
}

export const NO_INPUT: PlayerInput = {
  moveX: 0,
  moveY: 0,
  ability: false,
  sprint: false,
  dash: false,
};

// ---------------------------------------------------------------------------------------------------------------
// Entities. Positions are world units; `px`/`py` are the previous step's positions (for render interpolation).

export interface WeaponInstance {
  readonly def: WeaponDefinition;
  level: number;
  /** Effective stats after levels and player stats. */
  stats: WeaponStats;
  effects: StatusApplication[];
  timer: number;
  /** Behavior-owned scratch state (e.g. which side a sweep swings next). */
  state: { swing?: number; orbs?: number[] };
  damageDealt: number;
}

export interface Loadout {
  weapons: WeaponInstance[];
  armour?: { def: ArmourDefinition; level: number };
  relics: RelicDefinition[];
  skills: Map<string, number>;
  synergies: SynergyDefinition[];
}

export interface Player {
  readonly id: number;
  readonly slot: number;
  /** This player's god and name (co-op: each player has their own, D11). */
  readonly god: GodDefinition;
  readonly name: string;
  x: number;
  y: number;
  px: number;
  py: number;
  radius: number;
  health: number;
  stats: StatBlock;
  facingX: number;
  facingY: number;
  moving: boolean;
  /** Seconds of invulnerability left. */
  invulnerable: number;
  hurtFlash: number;
  alive: boolean;
  /** Left a room's run (spec: rooms / leaving); never revived. */
  left?: boolean;
  /** A fallen god's revival progress, 0–1 (spec: co-op / reviving allies). */
  revive: number;
  revivalsUsed: number;
  abilityTimer: number;
  ability: WeaponInstance;
  loadout: Loadout;
  /** Stamina for sprinting and dashing (spec: player-control / stamina, sprint and dash). */
  stamina: number;
  staminaRest: number;
  dashTime: number;
  dashCooldown: number;
  dashX: number;
  dashY: number;
}

export interface StatusState {
  burn: number;
  burnDps: number;
  /** Burn time accumulated toward the next tick. */
  burnProgress: number;
  shock: number;
  shockPotency: number;
  stun: number;
  slow: number;
  slowPotency: number;
}

export interface BossRuntime {
  readonly def: BossDefinition;
  phase: number;
  /** Seconds until the next attack starts. */
  attackTimer: number;
  attackIndex: number;
  /** The attack currently winding up, if any. */
  current?: BossAttack;
  windup: number;
  /** Dashing along a line (charge attack). */
  dash?: { dx: number; dy: number; time: number; speed: number; damage: number; hit: boolean };
}

export interface Enemy {
  readonly id: number;
  readonly def: EnemyDefinition;
  x: number;
  y: number;
  px: number;
  py: number;
  /** Knockback velocity, decays every step. */
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  xp: number;
  gold: number;
  elite: boolean;
  boss?: BossRuntime;
  status: StatusState;
  /** Seconds until this enemy may deal contact damage again. */
  attackTimer: number;
  /** Behavior scratch state. */
  mode: 'move' | 'windup' | 'dash' | 'recover';
  modeTimer: number;
  actionTimer: number;
  dirX: number;
  dirY: number;
  hitFlash: number;
  facing: number;
  dead: boolean;
}

/** What a hit is made of; resolved into damage by the one damage pipeline. */
export interface HitSource {
  readonly weaponId: string;
  readonly element: Element;
  readonly damage: number;
  readonly critChance: number;
  readonly knockback: number;
  readonly effects: readonly StatusApplication[];
  readonly lifesteal: number;
  readonly ownerId: number;
}

export interface Projectile {
  readonly id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  radius: number;
  source: HitSource;
  /** Remaining enemies it may pass through after the current hit; −1 = unlimited. */
  pierce: number;
  lifetime: number;
  /** Enemy id → seconds until it may be hit again (Infinity = never). */
  hits: Map<number, number>;
  rehit: number;
  homing: number;
  sprite: string;
  orbit?: { ownerId: number; angle: number; radius: number; speed: number; weaponId: string };
  dead: boolean;
}

export interface HostileProjectile {
  readonly id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  lifetime: number;
  sprite: string;
  dead: boolean;
}

/** A telegraphed area that deals damage when its warning ends. */
export interface Hazard {
  readonly id: number;
  readonly kind: string;
  readonly shape: 'circle' | 'line';
  x: number;
  y: number;
  readonly radius: number;
  readonly x2: number;
  readonly y2: number;
  readonly width: number;
  readonly warn: number;
  timer: number;
  readonly damage: number;
  readonly sourceId: number;
  dead: boolean;
}

export type PickupKind = 'xp' | 'gold' | 'heal' | 'chest';

export interface Pickup {
  readonly id: number;
  readonly kind: PickupKind;
  x: number;
  y: number;
  value: number;
  attracted: boolean;
  dead: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Upgrades

export type UpgradeKind =
  'newWeapon' | 'weaponLevel' | 'armour' | 'armourLevel' | 'relic' | 'skill' | 'heal' | 'gold';

export interface UpgradeOffer {
  readonly kind: UpgradeKind;
  /** Item ID; empty for heal and gold. */
  readonly itemId: string;
  readonly name: string;
  readonly description: string;
  /** Level after taking the offer (1 for new items). */
  readonly level: number;
  readonly maxLevel: number;
  readonly element?: Element;
  readonly sprite: string;
  readonly color: number;
}

export interface UpgradeChoice {
  /** Increments with every choice; lets the UI ignore stale answers. */
  readonly id: number;
  /** The player who chooses (each player picks their own upgrade, spec: co-op). */
  readonly playerId: number;
  readonly source: 'level' | 'chest';
  readonly level: number;
  readonly offers: readonly UpgradeOffer[];
}

// ---------------------------------------------------------------------------------------------------------------
// Run phases, results and events

export type RunPhase = 'playing' | 'choosing' | 'paused' | 'ended';
/** Runs go on realm after realm until every god has fallen (spec: run-outcome / run endings). */
export type RunOutcome = 'defeat' | 'abandoned';

export interface LoadoutSummary {
  readonly weapons: readonly {
    readonly id: string;
    readonly level: number;
    readonly damage: number;
  }[];
  readonly armour?: { readonly id: string; readonly level: number };
  readonly relics: readonly string[];
  readonly skills: readonly { readonly id: string; readonly level: number }[];
  readonly synergies: readonly string[];
}

export interface RunResult {
  readonly runId: string;
  readonly godId: string;
  readonly realmId: string;
  readonly seed: number;
  readonly outcome: RunOutcome;
  readonly timeSeconds: number;
  readonly level: number;
  readonly kills: number;
  readonly gold: number;
  /** Realms whose boss the party defeated (spec: endless-run). */
  readonly realmsCleared: number;
  /** The realm the run ended in. */
  readonly realmReached: string;
  readonly loadout: LoadoutSummary;
}

export type AnnouncementKind = 'elite' | 'boss' | 'synergy' | 'info';

export type SimEvent =
  | {
      type: 'hit';
      x: number;
      y: number;
      amount: number;
      crit: boolean;
      element: Element;
      enemyId: number;
    }
  | {
      type: 'kill';
      x: number;
      y: number;
      enemyId: number;
      defId: string;
      elite: boolean;
      boss: boolean;
      color: number;
    }
  | { type: 'playerHurt'; playerId: number; amount: number; x: number; y: number }
  | { type: 'playerHealed'; playerId: number; amount: number }
  | { type: 'playerRevived'; playerId: number; x: number; y: number }
  | { type: 'dash'; playerId: number; x: number; y: number; dx: number; dy: number }
  | { type: 'pickup'; kind: PickupKind; x: number; y: number; value: number }
  | {
      type: 'attack';
      behavior: WeaponBehaviorId;
      weaponId: string;
      element: Element;
      color: number;
      x: number;
      y: number;
      radius: number;
      angle: number;
      arc: number;
      points?: readonly number[];
    }
  | { type: 'enemyShot'; x: number; y: number }
  | { type: 'enemyCharge'; enemyId: number }
  | { type: 'levelUp'; level: number }
  | { type: 'choice'; choice: UpgradeChoice }
  | { type: 'choiceResolved'; offer: UpgradeOffer; playerId: number }
  | { type: 'synergy'; id: string; name: string }
  | { type: 'announcement'; text: string; kind: AnnouncementKind }
  | { type: 'bossSpawned'; bossId: string; name: string }
  | { type: 'bossAttack'; attack: string; kind: BossAttack['type'] }
  | {
      type: 'hazardResolved';
      x: number;
      y: number;
      radius: number;
      shape: 'circle' | 'line';
      x2: number;
      y2: number;
      width: number;
    }
  | { type: 'gateOpened'; to: string; x: number; y: number }
  | { type: 'realmEntered'; realmId: string; depth: number }
  | { type: 'runEnded'; result: RunResult };

/** Low-frequency summary of a run for the HUD (D7). */
export interface HudSnapshot {
  readonly time: number;
  readonly phase: RunPhase;
  readonly health: number;
  readonly maxHealth: number;
  readonly level: number;
  readonly xp: number;
  readonly xpToNext: number;
  readonly gold: number;
  readonly kills: number;
  readonly ability: {
    readonly name: string;
    readonly sprite: string;
    readonly cooldown: number;
    readonly remaining: number;
  };
  /** Stamina and the dash's state (spec: hud / cooldowns and stamina). */
  readonly stamina: {
    readonly value: number;
    readonly max: number;
    readonly dashCost: number;
    /** Seconds until a dash may start again, and the whole recovery. */
    readonly dashRemaining: number;
    readonly dashCooldown: number;
  };
  readonly weapons: readonly HudItem[];
  readonly armour?: HudItem;
  readonly relics: readonly HudItem[];
  readonly synergies: readonly {
    readonly id: string;
    readonly name: string;
    readonly description: string;
  }[];
  readonly boss?: {
    readonly name: string;
    readonly title: string;
    readonly health: number;
    readonly maxHealth: number;
  };
  readonly enemies: number;
  /** Players the open round of choices still waits for, besides this one (spec: rooms / choices). */
  readonly waitingFor: readonly string[];
  /** The current realm and its number in the run, from 1 (spec: hud / realm and gate). */
  readonly realm: { readonly name: string; readonly number: number };
  /** The open gate: where it leads and the seconds until it takes the party. */
  readonly gate?: { readonly to: string; readonly closesIn: number };
  /** Every god still in the run, in seat order (spec: hud / party health). */
  readonly party: readonly HudPartyMember[];
}

export interface HudPartyMember {
  readonly id: number;
  readonly seat: number;
  readonly name: string;
  readonly god: string;
  readonly sprite: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly alive: boolean;
  /** How far a fallen god's revive has come, 0–1. */
  readonly revive: number;
  /** This screen's own god. */
  readonly self: boolean;
}

export interface HudItem {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly sprite: string;
  readonly color: number;
  /** A weapon's cooldown and the seconds of it left (spec: hud / cooldowns and stamina). */
  readonly cooldown?: number;
  readonly remaining?: number;
}
