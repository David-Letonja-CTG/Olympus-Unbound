import { CompanionDefinition, Element, EnemyDefinition } from '../data/types';
import {
  ChaosSite,
  Companion,
  Enemy,
  Hazard,
  HostileProjectile,
  Pickup,
  Player,
  Projectile,
  StatusState,
  Wall,
  Zone,
} from './types';

/**
 * What the views draw of a run (D2): the run state itself in solo runs and on a room's host, a replica of the host's
 * world on a guest (D16). `RunState` satisfies it as it is; the views must not read anything else.
 */
export interface WorldFrame {
  readonly players: readonly FramePlayer[];
  readonly enemies: readonly FrameEnemy[];
  readonly projectiles: readonly FrameProjectile[];
  readonly hostileProjectiles: readonly FrameHostile[];
  readonly pickups: readonly FramePickup[];
  readonly hazards: readonly FrameHazard[];
  readonly companions: readonly FrameCompanion[];
  /** Shifting walls' pillars and the zones boss parts hold (spec: boss-encounter / signature mechanics). */
  readonly walls: readonly FrameWall[];
  readonly zones: readonly Zone[];
  /** The merchant while it is in the realm (spec: merchant). */
  readonly merchant:
    | { readonly x: number; readonly y: number; readonly radius: number; readonly leavesIn: number }
    | undefined;
  readonly boss: { readonly x: number; readonly y: number; readonly dead: boolean } | undefined;
  /** The open gate to the next realm; `standing` is the seconds a god has stood in it (spec: endless-run). */
  readonly gate:
    | { readonly x: number; readonly y: number; readonly radius: number; readonly standing: number }
    | undefined;
  /** Realms cleared. */
  readonly depth: number;
  /** The Director's markers: rifts, arrival marks, shrines and altars (spec: director-of-chaos). */
  readonly sites: readonly FrameSite[];
  /** How far an eclipse has dimmed the realm, 0–1. */
  readonly darkness: number;
  /** The arena's broken props, bit `i` for prop `i` (spec: arena-generation / breakable props). */
  readonly brokenProps: number;
  /** Fallen columns, lit braziers, dry springs (spec: arena-generation / map hazards, map helpers). */
  readonly features: number;
  /** Seconds between every entity's previous (`px`/`py`) and current position: one step, or a snapshot gap. */
  readonly span: number;
}

export type FramePlayer = Readonly<
  Pick<
    Player,
    | 'id'
    | 'x'
    | 'y'
    | 'px'
    | 'py'
    | 'radius'
    | 'alive'
    | 'facingX'
    | 'moving'
    | 'hurtFlash'
    | 'invulnerable'
    | 'revive'
    | 'left'
  >
> & { readonly god: { readonly visual: { readonly sprite: string } } };

export type FrameEnemy = Readonly<
  Pick<
    Enemy,
    | 'id'
    | 'x'
    | 'y'
    | 'px'
    | 'py'
    | 'radius'
    | 'facing'
    | 'dead'
    | 'hitFlash'
    | 'health'
    | 'maxHealth'
    | 'elite'
    | 'mode'
    | 'dirX'
    | 'dirY'
    | 'guarded'
    | 'marked'
    | 'dazed'
    | 'part'
    | 'champion'
  >
> & {
  readonly def: Pick<EnemyDefinition, 'radius' | 'visual' | 'behavior'>;
  /** Present for the boss: whether it rages, and the seconds it is still exposed. */
  readonly boss?: { readonly enraged?: boolean; readonly exposed?: number };
  readonly status: Readonly<Pick<StatusState, 'stun' | 'burn' | 'shock' | 'slow'>>;
};

export type FrameProjectile = Readonly<
  Pick<Projectile, 'id' | 'x' | 'y' | 'px' | 'py' | 'vx' | 'vy' | 'sprite'>
> & { readonly orbit?: unknown; readonly source: { readonly element: Element } };

export type FrameHostile = Readonly<
  Pick<HostileProjectile, 'id' | 'x' | 'y' | 'px' | 'py' | 'vx' | 'vy' | 'sprite'>
>;

export type FramePickup = Readonly<Pick<Pickup, 'id' | 'kind' | 'value' | 'x' | 'y'>>;

/** A companion as drawn: where it is and which way it faces (spec: merchant / companions). */
export type FrameCompanion = Readonly<
  Pick<Companion, 'id' | 'ownerId' | 'x' | 'y' | 'px' | 'py' | 'facingX' | 'moving'>
> & { readonly def: Pick<CompanionDefinition, 'id' | 'visual' | 'radius'> };

export type FrameHazard = Readonly<
  Pick<
    Hazard,
    | 'x'
    | 'y'
    | 'x2'
    | 'y2'
    | 'radius'
    | 'shape'
    | 'timer'
    | 'warn'
    | 'width'
    | 'angle'
    | 'arc'
    | 'wall'
  >
>;

export type FrameSite = Readonly<ChaosSite>;

export type FrameWall = Readonly<Pick<Wall, 'id' | 'x' | 'y' | 'radius' | 'age' | 'left'>>;
