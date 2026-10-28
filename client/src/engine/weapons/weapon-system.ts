import { hitEnemy, damagePlayer } from '../combat/damage';
import { RunState } from '../sim/run-state';
import { Player } from '../sim/types';
import { WEAPON_BEHAVIORS } from './behaviors';

/** Seconds before a weapon that found no target tries again. */
const RETRY = 0.1;

/** Every weapon of every living player attacks on its own cooldown (spec: combat / automatic weapons). */
export function updateWeapons(state: RunState, dt: number): void {
  for (const player of state.players) {
    if (!player.alive) continue;
    for (const weapon of player.loadout.weapons) {
      const behavior = WEAPON_BEHAVIORS[weapon.def.behavior];
      const ctx = { state, player, weapon };
      behavior.maintain?.(ctx);
      weapon.timer -= dt;
      if (weapon.timer <= 0) weapon.timer = behavior.fire(ctx) ? weapon.stats.cooldown : RETRY;
    }
  }
}

/** Fires the god's ability when it is ready. Returns true when it fired. */
export function useAbility(state: RunState, player: Player): boolean {
  if (!player.alive || player.abilityTimer > 0) return false;
  const ability = player.ability;
  const fired = WEAPON_BEHAVIORS[ability.def.behavior].fire({ state, player, weapon: ability });
  if (fired) {
    player.abilityTimer = ability.stats.cooldown;
    player.casts = (player.casts + 1) & 255;
  }
  return fired;
}

export function updateProjectiles(state: RunState, dt: number): void {
  const { bounds } = state.arena;
  for (const p of state.projectiles) {
    if (p.dead) continue;
    p.px = p.x;
    p.py = p.y;

    if (p.orbit) {
      const owner = state.players.find((pl) => pl.id === p.orbit?.ownerId);
      if (!owner?.alive) {
        p.dead = true;
        continue;
      }
      p.orbit.angle += p.orbit.speed * dt;
      p.x = owner.x + Math.cos(p.orbit.angle) * p.orbit.radius;
      p.y = owner.y + Math.sin(p.orbit.angle) * p.orbit.radius;
      if (p.px === p.x && p.py === p.y) continue;
    } else {
      if (p.homing > 0) steer(state, p, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;
      if (
        p.lifetime <= 0 ||
        p.x < bounds.minX - 200 ||
        p.y < bounds.minY - 200 ||
        p.x > bounds.maxX + 200 ||
        p.y > bounds.maxY + 200
      ) {
        p.dead = true;
        continue;
      }
    }

    // Re-hit timers (orbs); linear projectiles store Infinity and never hit the same enemy twice.
    if (p.rehit !== Infinity) {
      for (const [id, t] of p.hits) {
        if (t - dt <= 0) p.hits.delete(id);
        else p.hits.set(id, t - dt);
      }
    }

    state.enemyGrid.query(p.x, p.y, p.radius, (enemy) => {
      if (enemy.dead || p.hits.has(enemy.id)) return;
      p.hits.set(enemy.id, p.rehit);
      hitEnemy(state, enemy, p.source, p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      if (p.pierce === 0) {
        p.dead = true;
        return false;
      }
      if (p.pierce > 0) p.pierce--;
      return;
    });
  }
}

/** Turns a projectile toward the nearest enemy it has not hit, at most `homing` radians per second. */
function steer(state: RunState, p: RunState['projectiles'][number], dt: number): void {
  const target = state.nearestEnemy(p.x, p.y, 320, new Set(p.hits.keys()));
  if (!target) return;
  const speed = Math.hypot(p.vx, p.vy);
  const current = Math.atan2(p.vy, p.vx);
  let diff = Math.atan2(target.y - p.y, target.x - p.x) - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
  p.vx = Math.cos(current + turn) * speed;
  p.vy = Math.sin(current + turn) * speed;
}

export function updateHostileProjectiles(state: RunState, dt: number): void {
  const { bounds } = state.arena;
  for (const p of state.hostileProjectiles) {
    if (p.dead) continue;
    p.px = p.x;
    p.py = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.lifetime -= dt;
    if (
      p.lifetime <= 0 ||
      p.x < bounds.minX ||
      p.y < bounds.minY ||
      p.x > bounds.maxX ||
      p.y > bounds.maxY
    ) {
      p.dead = true;
      continue;
    }
    if (state.collision.isBlocked(p.x, p.y, 2)) {
      p.dead = true;
      continue;
    }
    for (const player of state.players) {
      if (!player.alive) continue;
      const reach = player.radius + p.radius;
      if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= reach * reach) {
        damagePlayer(state, player, p.damage, p.x, p.y);
        p.dead = true;
        break;
      }
    }
  }
}
