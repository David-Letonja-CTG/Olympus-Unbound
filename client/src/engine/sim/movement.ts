import { Body } from '../core/collision';
import { clampLength } from '../core/vector';
import { StaminaBalance } from '../data/types';
import { PlayerInput } from './types';

/** Stick input shorter than this is ignored (spec: player-control / movement input). */
export const DEAD_ZONE = 0.2;

/** Normalises raw input: dead zone, and diagonal movement no faster than straight movement. */
export function normaliseMove(input: PlayerInput): { x: number; y: number } {
  const length = Math.hypot(input.moveX, input.moveY);
  if (length < DEAD_ZONE) return { x: 0, y: 0 };
  return clampLength(input.moveX, input.moveY, 1);
}

/** What moves like a god: the host's players and a guest's own prediction (D16). */
export interface Mover extends Body {
  facingX: number;
  facingY: number;
  moving: boolean;
  stamina: number;
  /** Seconds since stamina was last spent; it refills after `regenDelay`. */
  staminaRest: number;
  /** Seconds of the current dash left; 0 when not dashing. */
  dashTime: number;
  /** Seconds until the next dash may start. */
  dashCooldown: number;
  dashX: number;
  dashY: number;
  /** The walk's velocity last step: on low grip it carries on (spec: arena-generation / footing). */
  driftX: number;
  driftY: number;
}

/**
 * One step of walking, sprinting and dashing (spec: player-control / stamina, sprint and dash). Returns true when a
 * dash started this step. `world` keeps the mover out of obstacles, dashing included. `grip` below 1 (ice) eases the walk
 * toward the stick instead of following it at once (spec: arena-generation / footing).
 */
export function stepMovement(
  m: Mover,
  input: PlayerInput,
  moveSpeed: number,
  rules: StaminaBalance,
  world: { resolve(body: Body): void },
  dt: number,
  grip = 1,
): boolean {
  const move = normaliseMove(input);
  const length = Math.hypot(move.x, move.y);
  let spent = false;
  let dashed = false;
  if (m.dashCooldown > 0) m.dashCooldown = Math.max(0, m.dashCooldown - dt);

  if (input.dash && m.dashTime <= 0 && m.dashCooldown <= 0 && m.stamina >= rules.dashCost) {
    // Along the stick, or the way the god faces when standing still.
    m.dashX = length > 0 ? move.x / length : m.facingX;
    m.dashY = length > 0 ? move.y / length : m.facingY;
    m.dashTime = rules.dashDuration;
    m.dashCooldown = rules.dashDuration + rules.dashRecovery;
    m.stamina -= rules.dashCost;
    spent = dashed = true;
  }

  if (m.dashTime > 0) {
    const t = Math.min(dt, m.dashTime);
    m.dashTime = Math.max(0, m.dashTime - dt);
    m.moving = true;
    m.facingX = m.dashX;
    m.facingY = m.dashY;
    m.x += m.dashX * rules.dashSpeed * t;
    m.y += m.dashY * rules.dashSpeed * t;
    world.resolve(m);
    // Out of a dash, the god walks on along it.
    m.driftX = m.dashX * moveSpeed;
    m.driftY = m.dashY * moveSpeed;
  } else {
    let vx = 0;
    let vy = 0;
    if (length > 0) {
      let speed = moveSpeed;
      // Running on, even when spent, keeps stamina from refilling: let go of sprint to catch breath.
      if (input.sprint) {
        if (m.stamina > 0) speed *= rules.sprintMultiplier;
        m.stamina = Math.max(0, m.stamina - rules.sprintDrain * dt);
        spent = true;
      }
      m.facingX = move.x / length;
      m.facingY = move.y / length;
      vx = move.x * speed;
      vy = move.y * speed;
    }
    if (grip < 1) {
      const k = 1 - (1 - grip) ** (dt * 60);
      vx = m.driftX + (vx - m.driftX) * k;
      vy = m.driftY + (vy - m.driftY) * k;
      if (vx * vx + vy * vy < 1) vx = vy = 0;
    }
    m.moving = vx !== 0 || vy !== 0;
    if (m.moving) {
      const x = m.x;
      const y = m.y;
      m.x += vx * dt;
      m.y += vy * dt;
      world.resolve(m);
      // What the walk really did: a wall stops a slide.
      m.driftX = (m.x - x) / dt;
      m.driftY = (m.y - y) / dt;
    } else m.driftX = m.driftY = 0;
  }

  if (spent) m.staminaRest = 0;
  else {
    m.staminaRest += dt;
    if (m.staminaRest >= rules.regenDelay)
      m.stamina = Math.min(rules.max, m.stamina + rules.regen * dt);
  }
  return dashed;
}
