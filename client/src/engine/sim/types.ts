import type { RunVariant } from './run-state';
import { StatBlock } from '../core/stats';
import {
  BoonDefinition,
  CompanionDefinition,
  GodDefinition,
  ArmourDefinition,
  BossAttack,
  BossDefinition,
  BossPartDefinition,
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
  /** Fusion and ascension levels by ID (spec: run-progression / fusions, ascensions). */
  fusions: Map<string, number>;
  ascensions: Map<string, number>;
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
  /** Played by the machine at this difficulty (spec: bot-allies). */
  readonly bot?: 'easy' | 'normal' | 'hard';
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
  /** Seconds of Surge left (+30% damage after a perfect dodge, spec: boss-encounter / perfect dodge). */
  surge: number;
  /** This dash has already counted as a perfect dodge. */
  dodged: boolean;
  /** Timed blessings and the seconds each has left (spec: director-of-chaos / divine blessings). */
  boons: ActiveBoon[];
}

/** A blessing on a god: its modifiers count until `left` runs out. */
export interface ActiveBoon {
  readonly def: BoonDefinition;
  left: number;
}

/** What a marker in the world is (spec: director-of-chaos): a rift, an arrival mark, a shrine or an altar. */
export type SiteKind = 'rift' | 'arrival' | 'shrine' | 'altar';

/** A marker of an encounter in the world, drawn above the darkness with a pointer. */
export interface ChaosSite {
  readonly id: number;
  readonly kind: SiteKind;
  x: number;
  y: number;
  readonly radius: number;
  /** Seconds left, and in all (for its ring). */
  left: number;
  readonly total: number;
}

/** Where an encounter is in its life (spec: director-of-chaos / encounter lifecycle). */
export type EncounterPhase =
  'telegraph' | 'active' | 'resolving' | 'completed' | 'failed' | 'cancelled';

/** An animal fighting beside its god (spec: merchant / companions). */
export interface Companion {
  readonly id: number;
  readonly def: CompanionDefinition;
  readonly ownerId: number;
  x: number;
  y: number;
  px: number;
  py: number;
  radius: number;
  facingX: number;
  moving: boolean;
  /** Its attack, resolved against its god's stats when it fires. */
  weapon: WeaponInstance;
}

/** The Wandering Merchant while it is in the realm (spec: merchant / the merchant's visits). */
export interface Merchant {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Seconds until it leaves. */
  leavesIn: number;
  /** Players standing in its ring: the shop opens only on stepping in. */
  readonly inside: Set<number>;
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
  /** Shown red, with shorter pauses (a raging phase). */
  enraged: boolean;
  /** Seconds left of exposure (every damageable part down). */
  exposed: number;
  /** Each part's state, by part id. */
  readonly parts: Map<string, PartState>;
}

/** A boss part's rhythm and life (spec: boss-encounter / signature mechanics). */
export interface PartState {
  readonly def: BossPartDefinition;
  /** Where it is now (it follows the boss or holds its place in the arena). */
  x: number;
  y: number;
  /** Seconds until its next attack. */
  timer: number;
  attackIndex: number;
  /** Its monster while it lives (damageable parts only). */
  enemyId?: number;
  /** Seconds until it grows back; 0 while it lives. */
  regrowIn: number;
  active: boolean;
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
  /** The way it walks, turned toward what its behavior wants at a limited rate; (0, 0) before its first step. */
  headX: number;
  headY: number;
  hitFlash: number;
  facing: number;
  dead: boolean;
  /** A boss part's monster: its boss and part (spec: boss-encounter / signature mechanics). */
  part?: { readonly bossId: number; readonly partId: string };
  /** Shielded: takes no damage (an ordered part that is not next). */
  guarded?: boolean;
  /** The next part to cut, with its order number. */
  marked?: number;
  /** Seconds left dazed (a charge into a wall): takes extra damage. */
  dazed?: number;
  /** Whether it saw its target at its last sight test; unset until its first (spec: enemy-spawning / finding the way). */
  sight?: boolean;
  /** A hunter or champion of the Director's encounters: marked and pointed at (spec: director-of-chaos). */
  champion?: boolean;
}

/** A pillar of a shifting wall (spec: boss-encounter / asterion's shifting walls). */
export interface Wall {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Seconds it has stood (for its rising animation), and seconds left. */
  age: number;
  left: number;
}

/** A stretch of arena a part holds: damage over time and slow inside. */
export interface Zone {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly dps: number;
  readonly slow: number;
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
  /** Cones (sweeps) use `angle` and `arc`; walls are circles that raise a pillar when they resolve. */
  readonly shape: 'circle' | 'line' | 'cone';
  readonly angle?: number;
  readonly arc?: number;
  /** A wall's warning: it raises a pillar standing this long. */
  readonly wall?: number;
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
  /** Seconds since an instant blessing called it: it flies fast to the nearest god from anywhere (spec: run-progression). */
  calledFor?: number;
  dead: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Upgrades

export type UpgradeKind =
  | 'newWeapon'
  | 'weaponLevel'
  | 'armour'
  | 'armourLevel'
  | 'relic'
  | 'skill'
  | 'heal'
  | 'gold'
  /** An instant blessing, used at once (spec: run-progression / instant blessings). */
  | 'instant'
  /** A combined upgrade, and an upgrade without end (spec: run-progression / fusions, ascensions). */
  | 'fusion'
  | 'ascension'
  /** A merchant's ware, and leaving the shop (spec: merchant / the shop). */
  | 'ware'
  | 'leave';

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
  /** A ware's price in the run's gold. */
  readonly price?: number;
  /** What a ware applies to, e.g. the weapon a whetstone levels. */
  readonly target?: string;
  /** Locked fusions and inactive synergies this offer counts toward (spec: run-progression / level-up choice). */
  readonly parts?: readonly string[];
}

export interface UpgradeChoice {
  /** Increments with every choice; lets the UI ignore stale answers. */
  readonly id: number;
  /** The player who chooses (each player picks their own upgrade, spec: co-op). */
  readonly playerId: number;
  readonly source: 'level' | 'chest' | 'shop';
  /** The party's gold when a shop opens. */
  readonly gold?: number;
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
  /** The run's kind as its config said (quick, Daily Trial, challenge); absent for an ordinary run. */
  readonly variant?: RunVariant;
  readonly outcome: RunOutcome;
  readonly timeSeconds: number;
  readonly level: number;
  readonly kills: number;
  readonly gold: number;
  /** Realms whose boss the party defeated (spec: endless-run). */
  readonly realmsCleared: number;
  /** The realm the run ended in. */
  readonly realmReached: string;
  /** Gods in the party: 1 for a solo run (spec: glory / high scores). */
  readonly players: number;
  /** How many of them were bots (spec: bot-allies). */
  readonly bots: number;
  readonly loadout: LoadoutSummary;
}

/** `omen`: the Director of Chaos's warnings and outcomes (spec: hud / encounters on the hud). */
export type AnnouncementKind = 'elite' | 'boss' | 'synergy' | 'info' | 'omen';

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
  /** A dash through a boss attack as it lands (spec: boss-encounter / perfect dodge). */
  | { type: 'perfectDodge'; playerId: number; x: number; y: number }
  /** A boss part fell, or grew back. */
  | { type: 'partFell'; x: number; y: number }
  | { type: 'partGrew'; x: number; y: number }
  | { type: 'wallsRose'; x: number; y: number }
  | { type: 'merchantArrived'; x: number; y: number }
  | { type: 'merchantLeft' }
  | { type: 'purchase'; playerId: number; wareId: string; price: number }
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
  /** `choiceId`: which choice was answered; a later one of the same player may already be open (D16). */
  | { type: 'choiceResolved'; offer: UpgradeOffer; playerId: number; choiceId: number }
  | { type: 'synergy'; id: string; name: string }
  /** An instant blessing called `count` pickups to the god at `x`, `y` (spec: run-progression). */
  | { type: 'gathered'; x: number; y: number; count: number }
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
  /** An encounter changed phase (spec: director-of-chaos); `success` once it has ended. */
  | {
      type: 'encounter';
      id: string;
      phase: EncounterPhase;
      success?: boolean;
      x: number;
      y: number;
    }
  /** A hunter or champion left the battle alive. */
  | { type: 'escaped'; x: number; y: number }
  | { type: 'blessed'; playerId: number; boonId: string; x: number; y: number }
  | { type: 'realmEntered'; realmId: string; depth: number }
  | { type: 'runEnded'; result: RunResult };

/** Low-frequency summary of a run for the HUD (D7). */
export interface HudSnapshot {
  readonly time: number;
  /** Seconds in the current realm (spec: music / what drives the music). */
  readonly realmTime: number;
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
  /** Seconds of Surge left after a perfect dodge (spec: boss-encounter / perfect dodge). */
  readonly surge: number;
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
  /** This god's companions (spec: hud / the merchant on the hud). */
  readonly companions: readonly HudItem[];
  /** The merchant while it is in the realm. */
  readonly merchant?: { readonly leavesIn: number };
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
  /** The Director's encounters under way (spec: hud / encounters on the hud). */
  readonly encounters: readonly HudEncounter[];
  /** This god's blessings. */
  readonly boons: readonly HudBoon[];
  /** The build panel's view (spec: hud / the build panel). */
  readonly build: HudBuild;
}

/** One encounter as the HUD shows it. */
export interface HudEncounter {
  readonly uid: number;
  readonly id: string;
  readonly name: string;
  readonly phase: EncounterPhase;
  /** What the party must do; during the warning, what is coming. */
  readonly objective: string;
  /** Foes left, where that matters. */
  readonly left?: number;
  /** Seconds until its next turn (arrival, end, escape, fading). */
  readonly seconds?: number;
  /** A contract's terms. */
  readonly risk?: string;
  readonly reward?: string;
  readonly major: boolean;
}

export interface HudBoon {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sprite: string;
  readonly color: number;
  readonly left: number;
  readonly seconds: number;
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
  /** Played by the machine (spec: bot-allies). */
  readonly bot?: boolean;
  /** Played at this screen alongside its own god (spec: hud / local players on the HUD). */
  readonly local?: boolean;
  /** Stamina, 0–1. */
  readonly stamina: number;
  /** How far the ability has recharged, 0–1 (1: ready). */
  readonly ability: number;
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

/** A player's build for the build panel (spec: hud / the build panel). */
export interface HudBuild {
  readonly skills: readonly HudItem[];
  readonly fusions: readonly HudItem[];
  /** `maxLevel` 0: no top level. */
  readonly ascensions: readonly HudItem[];
  /** Every fusion and synergy this god can reach. */
  readonly tree: readonly HudCombo[];
}

/** One fusion or synergy in the tree, with what it still needs. */
export interface HudCombo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: 'fusion' | 'synergy';
  /** Synergies count as tier 1. */
  readonly tier: number;
  readonly level: number;
  readonly maxLevel: number;
  /** `ready`: every requirement met, so it may be offered (synergies activate on their own). */
  readonly state: 'locked' | 'ready' | 'active' | 'maxed';
  readonly sprite: string;
  readonly needs: readonly HudBuildNeed[];
}

export interface HudBuildNeed {
  readonly name: string;
  readonly sprite: string;
  readonly have: number;
  readonly need: number;
  readonly met: boolean;
}
