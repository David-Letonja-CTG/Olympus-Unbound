import { damagePlayer } from '../combat/damage';
import { speedMultiplier, tickStatus } from '../combat/status';
import { EnemyBehavior } from '../data/types';
import { updateBoss } from '../bosses/boss';
import { RunState } from '../sim/run-state';
import { Enemy, Player } from '../sim/types';
import { ENEMY_BEHAVIORS, Steering } from './behaviors';

/** Sideways share of the heading needed before an enemy turns to face it. */
const FACING_THRESHOLD = 0.35;

/** Knockback velocity loses this fraction per second (exponential decay). */
const KNOCKBACK_DECAY = 9;
/** At most this many neighbours push an enemy apart per step (keeps big hordes cheap). */
const SEPARATION_NEIGHBOURS = 4;
/** How fast an enemy turns toward a new heading (radians per second): an about-turn takes a quarter second. */
const TURN_RATE = 12;

function steer(state: RunState, enemy: Enemy, target: Player, dt: number): Steering {
  const behavior: EnemyBehavior = enemy.def.behavior;
  const update = ENEMY_BEHAVIORS[behavior.type] as (
    s: RunState,
    e: Enemy,
    b: EnemyBehavior,
    t: Player,
    dt: number,
  ) => Steering;
  return update(state, enemy, behavior, target, dt);
}

/**
 * Moves every enemy: status effects, behavior, knockback, separation, world collision and contact damage.
 * Rebuilds the enemy grid at the end, so weapons query current positions.
 */
export function updateEnemies(state: RunState, dt: number): void {
  const decay = Math.exp(-KNOCKBACK_DECAY * dt);
  const turnCos = Math.cos(TURN_RATE * dt);
  const turnSin = Math.sin(TURN_RATE * dt);
  state.nav.update(state.players);
  state.bossNav?.update(state.players);
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.px = enemy.x;
    enemy.py = enemy.y;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    if (enemy.attackTimer > 0) enemy.attackTimer -= dt;
    tickStatus(state, enemy, dt);
    if (enemy.dead) continue;

    const target = state.nearestPlayer(enemy.x, enemy.y);
    if (target) {
      if (enemy.boss) {
        updateBoss(state, enemy, target, dt);
      } else if (enemy.part) {
        // A boss's part sits where its boss places it (bosses/parts.ts).
      } else {
        const stunned = enemy.status.stun > 0;
        const s = stunned ? { x: 0, y: 0, speed: 0 } : steer(state, enemy, target, dt);
        // An eclipse hastens the monsters while it lasts (spec: director-of-chaos / eclipse of olympus).
        // The bog and the shallows slow monsters as they slow gods (spec: arena-generation / footing).
        const speed =
          enemy.speed *
          s.speed *
          speedMultiplier(enemy) *
          state.omen.enemySpeed *
          state.footing.speedAt(enemy.x, enemy.y);
        if (speed > 0) {
          // Walking turns smoothly; a charger's wind-up and dash keep their line (spec: enemy-spawning / finding the way).
          if (enemy.mode === 'move') turnToward(enemy, s.x, s.y, turnCos, turnSin);
          else {
            enemy.headX = s.x;
            enemy.headY = s.y;
          }
          enemy.x += enemy.headX * speed * dt;
          enemy.y += enemy.headY * speed * dt;
        }
        // Turn only on a clear sideways heading, so an enemy straight above or below its target does not flicker.
        if (Math.abs(s.x) > FACING_THRESHOLD) enemy.facing = s.x > 0 ? 1 : -1;
      }
    }
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.vx *= decay;
    enemy.vy *= decay;
  }

  separate(state);

  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    if (enemy.part) continue;
    state.collision.resolve(enemy);
    if (enemy.status.stun > 0 || enemy.attackTimer > 0) continue;
    for (const player of state.players) {
      if (!player.alive) continue;
      const reach = enemy.radius + player.radius;
      if ((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2 <= reach * reach) {
        damagePlayer(state, player, enemy.damage);
        enemy.attackTimer = state.balance.enemyAttackInterval;
        break;
      }
    }
  }

  state.rebuildEnemyGrid();
}

/** Pushes overlapping enemies apart so hordes spread out instead of stacking on one point. */
function separate(state: RunState): void {
  state.rebuildEnemyGrid();
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.boss || enemy.part) continue;
    let pushed = 0;
    state.enemyGrid.query(enemy.x, enemy.y, enemy.radius, (other) => {
      if (other === enemy || other.dead) return;
      const dx = enemy.x - other.x;
      const dy = enemy.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const overlap = enemy.radius + other.radius - dist;
      if (overlap <= 0) return;
      // The boss and its parts shove; regular enemies share the correction.
      const share = other.boss || other.part ? 1 : 0.5;
      if (dist > 1e-6) {
        enemy.x += (dx / dist) * overlap * share;
        enemy.y += (dy / dist) * overlap * share;
      } else {
        enemy.x += ((enemy.id % 3) - 1) * 0.5;
        enemy.y += ((enemy.id % 2) - 0.5) * 0.5;
      }
      if (++pushed >= SEPARATION_NEIGHBOURS) return false;
      return;
    });
  }
}

/**
 * Turns the enemy's heading toward the unit vector (x, y) by at most the angle whose cosine and sine are given:
 * no snapping between the straight way and the way round, or between closing in and backing off.
 */
function turnToward(enemy: Enemy, x: number, y: number, cos: number, sin: number): void {
  const hx = enemy.headX;
  const hy = enemy.headY;
  if ((hx === 0 && hy === 0) || hx * x + hy * y >= cos) {
    enemy.headX = x;
    enemy.headY = y;
    return;
  }
  // Toward the wanted side; a heading exactly reversed turns one fixed way (D5).
  const side = hx * y - hy * x >= 0 ? sin : -sin;
  enemy.headX = hx * cos - hy * side;
  enemy.headY = hx * side + hy * cos;
}
