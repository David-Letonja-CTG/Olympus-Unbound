import { direction, distance } from '../core/vector';
import { EnemyBehavior } from '../data/types';
import { RunState } from '../sim/run-state';
import { Enemy, Player } from '../sim/types';

/** How an enemy wants to move this step: a unit direction and a speed factor (0 = stand still). */
export interface Steering {
  x: number;
  y: number;
  speed: number;
}

type BehaviorUpdate<B extends EnemyBehavior> = (
  state: RunState,
  enemy: Enemy,
  behavior: B,
  target: Player,
  dt: number,
) => Steering;

type BehaviorTable = {
  [K in EnemyBehavior['type']]: BehaviorUpdate<Extract<EnemyBehavior, { type: K }>>;
};

/** Moves toward or away from the target to stay near `range`. */
function keepRange(enemy: Enemy, target: Player, range: number): Steering {
  const dist = distance(enemy.x, enemy.y, target.x, target.y);
  const dir = direction(enemy.x, enemy.y, target.x, target.y);
  if (dist < range * 0.8) return { x: -dir.x, y: -dir.y, speed: 1 };
  if (dist > range * 1.15) return { x: dir.x, y: dir.y, speed: 1 };
  // In the comfortable band: drift sideways so ranged enemies do not stand perfectly still.
  const side = enemy.id % 2 === 0 ? 1 : -1;
  return { x: -dir.y * side, y: dir.x * side, speed: 0.35 };
}

/**
 * Reusable enemy behaviors (spec: enemy-spawning). Fast, swarm and tank enemies are chasers with different
 * numbers; each behavior only decides movement and its own special action.
 */
export const ENEMY_BEHAVIORS: BehaviorTable = {
  chaser(state, enemy, behavior, target) {
    const dir = direction(enemy.x, enemy.y, target.x, target.y);
    const jitter = behavior.jitter ?? 0;
    if (jitter <= 0) return { x: dir.x, y: dir.y, speed: 1 };
    // Deterministic weave from time and id: no randomness needed per step.
    const weave = Math.sin(state.time * 4 + enemy.id * 1.7) * jitter;
    const x = dir.x - dir.y * weave;
    const y = dir.y + dir.x * weave;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length, speed: 1 };
  },

  ranged(state, enemy, behavior, target, dt) {
    enemy.actionTimer -= dt;
    const dist = distance(enemy.x, enemy.y, target.x, target.y);
    if (enemy.actionTimer <= 0 && dist < behavior.preferredRange * 1.5) {
      enemy.actionTimer = behavior.cooldown;
      const dir = direction(enemy.x, enemy.y, target.x, target.y);
      state.spawnHostileProjectile(
        enemy.x + dir.x * enemy.radius,
        enemy.y + dir.y * enemy.radius,
        dir.x * behavior.projectileSpeed,
        dir.y * behavior.projectileSpeed,
        behavior.projectileRadius,
        behavior.projectileDamage * state.scaling().damage,
        'enemy_arrow',
      );
      state.emit({ type: 'enemyShot', x: enemy.x, y: enemy.y });
    }
    return keepRange(enemy, target, behavior.preferredRange);
  },

  charger(state, enemy, behavior, target, dt) {
    enemy.actionTimer -= dt;
    enemy.modeTimer -= dt;
    switch (enemy.mode) {
      case 'windup':
        if (enemy.modeTimer <= 0) {
          enemy.mode = 'dash';
          enemy.modeTimer = behavior.dashDuration;
        }
        return { x: enemy.dirX, y: enemy.dirY, speed: 0 };
      case 'dash':
        if (enemy.modeTimer <= 0) {
          enemy.mode = 'recover';
          enemy.modeTimer = 0.5;
        }
        return { x: enemy.dirX, y: enemy.dirY, speed: behavior.dashSpeed / enemy.speed };
      case 'recover':
        if (enemy.modeTimer <= 0) {
          enemy.mode = 'move';
          enemy.actionTimer = behavior.cooldown;
        }
        return { x: 0, y: 0, speed: 0 };
      default: {
        const dir = direction(enemy.x, enemy.y, target.x, target.y);
        if (
          enemy.actionTimer <= 0 &&
          distance(enemy.x, enemy.y, target.x, target.y) < behavior.triggerRange
        ) {
          enemy.mode = 'windup';
          enemy.modeTimer = behavior.windup;
          enemy.dirX = dir.x;
          enemy.dirY = dir.y;
          state.emit({ type: 'enemyCharge', enemyId: enemy.id });
          return { x: dir.x, y: dir.y, speed: 0 };
        }
        return { x: dir.x, y: dir.y, speed: 1 };
      }
    }
  },

  summoner(state, enemy, behavior, target, dt) {
    enemy.actionTimer -= dt;
    if (enemy.actionTimer <= 0) {
      enemy.actionTimer = behavior.cooldown;
      const def = state.index.enemy(behavior.summon);
      for (let i = 0; i < behavior.count; i++) {
        const a = (i / behavior.count) * Math.PI * 2 + state.spawnRng.angle() * 0.2;
        const x = enemy.x + Math.cos(a) * (enemy.radius + 24);
        const y = enemy.y + Math.sin(a) * (enemy.radius + 24);
        if (!state.collision.isBlocked(x, y, def.radius)) state.spawnEnemy(def, x, y);
      }
    }
    return keepRange(enemy, target, behavior.keepDistance);
  },
};
