import { Element, EnemyDefinition } from '../data/types';
import { Enemy, Hazard, HostileProjectile, Pickup, Player, Projectile, StatusState } from './types';

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
  readonly boss: { readonly x: number; readonly y: number; readonly dead: boolean } | undefined;
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
  >
> & {
  readonly def: Pick<EnemyDefinition, 'radius' | 'visual' | 'behavior'>;
  /** Present for the boss; only its presence is drawn. */
  readonly boss?: unknown;
  readonly status: Readonly<Pick<StatusState, 'stun' | 'burn' | 'shock' | 'slow'>>;
};

export type FrameProjectile = Readonly<
  Pick<Projectile, 'id' | 'x' | 'y' | 'px' | 'py' | 'vx' | 'vy' | 'sprite'>
> & { readonly orbit?: unknown; readonly source: { readonly element: Element } };

export type FrameHostile = Readonly<
  Pick<HostileProjectile, 'id' | 'x' | 'y' | 'px' | 'py' | 'vx' | 'vy' | 'sprite'>
>;

export type FramePickup = Readonly<Pick<Pickup, 'id' | 'kind' | 'value' | 'x' | 'y'>>;

export type FrameHazard = Readonly<
  Pick<Hazard, 'x' | 'y' | 'x2' | 'y2' | 'radius' | 'shape' | 'timer' | 'warn' | 'width'>
>;
