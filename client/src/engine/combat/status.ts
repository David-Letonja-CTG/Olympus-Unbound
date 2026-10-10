import { StatusApplication, StatusEffectId } from '../data/types';
import { RunState } from '../sim/run-state';
import { Enemy, StatusState } from '../sim/types';
import { dealDamage } from './damage';

/** Burn deals its damage in ticks of this length. */
export const BURN_TICK = 0.5;

interface StatusRule {
  /** Applies or refreshes the effect; never stacks endlessly (spec: combat / status effects). */
  apply(status: StatusState, effect: StatusApplication, hitDamage: number, duration: number): void;
}

const RULES: Record<StatusEffectId, StatusRule> = {
  burn: {
    apply(s, effect, hitDamage, duration) {
      s.burnDps = Math.max(s.burn > 0 ? s.burnDps : 0, hitDamage * effect.potency);
      s.burn = Math.max(s.burn, duration);
    },
  },
  shock: {
    apply(s, effect, _hit, duration) {
      s.shockPotency = Math.max(s.shock > 0 ? s.shockPotency : 0, effect.potency);
      s.shock = Math.max(s.shock, duration);
    },
  },
  stun: {
    apply(s, _effect, _hit, duration) {
      s.stun = Math.max(s.stun, duration);
    },
  },
  slow: {
    apply(s, effect, _hit, duration) {
      s.slowPotency = Math.max(s.slow > 0 ? s.slowPotency : 0, effect.potency);
      s.slow = Math.max(s.slow, duration);
    },
  },
};

export function applyStatus(
  enemy: Enemy,
  effect: StatusApplication,
  hitDamage: number,
  durationScale = 1,
): void {
  // Bosses shrug off most of a stun.
  const duration =
    effect.duration * durationScale * (enemy.boss && effect.effect === 'stun' ? 0.2 : 1);
  RULES[effect.effect].apply(enemy.status, effect, hitDamage, duration);
}

/** Extra damage the enemy takes from shock. */
export function damageTakenMultiplier(enemy: Enemy): number {
  return 1 + (enemy.status.shock > 0 ? enemy.status.shockPotency : 0);
}

/** Speed factor from slow (and 0 while stunned). */
export function speedMultiplier(enemy: Enemy): number {
  if (enemy.status.stun > 0) return 0;
  return enemy.status.slow > 0 ? 1 - enemy.status.slowPotency : 1;
}

/** Counts down effect timers and deals burn damage in whole ticks. */
export function tickStatus(state: RunState, enemy: Enemy, dt: number): void {
  const s = enemy.status;
  if (s.burn > 0) {
    const active = Math.min(dt, s.burn);
    s.burn -= dt;
    s.burnProgress += active;
    while (s.burnProgress >= BURN_TICK - 1e-6 && !enemy.dead) {
      s.burnProgress -= BURN_TICK;
      dealDamage(state, enemy, s.burnDps * BURN_TICK, false, 'fire');
    }
    if (s.burn <= 0) {
      s.burn = 0;
      s.burnProgress = 0;
    }
  }
  if (s.shock > 0) s.shock = Math.max(0, s.shock - dt);
  if (s.stun > 0) s.stun = Math.max(0, s.stun - dt);
  if (s.slow > 0) s.slow = Math.max(0, s.slow - dt);
}
