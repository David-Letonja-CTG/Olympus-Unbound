import { angleDifference, direction, distance } from '../core/vector';
import { WeaponBehaviorId } from '../data/types';
import { hitEnemy } from '../combat/damage';
import { RunState } from '../sim/run-state';
import { Enemy, HitSource, Player, WeaponInstance } from '../sim/types';

export interface WeaponContext {
  readonly state: RunState;
  readonly player: Player;
  readonly weapon: WeaponInstance;
}

/**
 * A reusable way of attacking (D4). Weapons and abilities pick a behavior by ID and differ only in their numbers
 * and effects, so new weapons are data.
 */
export interface WeaponBehavior {
  /** Attacks once. Returns false when there was nothing to attack (the weapon retries soon). */
  fire(ctx: WeaponContext): boolean;
  /** Runs every step, before cooldowns (e.g. keeps orbs alive). */
  maintain?(ctx: WeaponContext): void;
  /** Always at work (orbs): there is no cooldown to show on the HUD. */
  readonly continuous?: boolean;
}

export function hitSource(player: Player, weapon: WeaponInstance): HitSource {
  return {
    weaponId: weapon.def.id,
    element: weapon.def.element,
    damage: weapon.stats.damage,
    critChance: weapon.stats.critChance,
    knockback: weapon.stats.knockback,
    effects: weapon.effects,
    lifesteal: weapon.def.lifesteal ?? 0,
    ownerId: player.id,
    ...(weapon.evolution
      ? { splash: { ...weapon.evolution.splash, color: weapon.evolution.visual.color } }
      : {}),
  };
}

function emitAttack(
  ctx: WeaponContext,
  x: number,
  y: number,
  radius: number,
  angle = 0,
  arc = 0,
  points?: number[],
): void {
  const { def } = ctx.weapon;
  ctx.state.emit({
    type: 'attack',
    behavior: def.behavior,
    weaponId: def.id,
    element: def.element,
    color: def.visual.color,
    x,
    y,
    radius,
    angle,
    arc,
    points,
  });
}

/** Fires `amount` projectiles at the nearest enemy (or the facing direction), fanned over `arc`. */
const projectile: WeaponBehavior = {
  fire(ctx) {
    const { state, player, weapon } = ctx;
    const s = weapon.stats;
    if (state.projectiles.length >= state.balance.caps.projectiles) return false;
    const target = state.nearestEnemy(player.x, player.y, s.range);
    const dir = target
      ? direction(player.x, player.y, target.x, target.y)
      : { x: player.facingX, y: player.facingY };
    const base = Math.atan2(dir.y, dir.x);
    const n = Math.max(1, Math.round(s.amount));
    const step = n > 1 ? s.arc / (n - 1) : 0;
    const source = hitSource(player, weapon);
    for (let i = 0; i < n; i++) {
      const angle = base + (i - (n - 1) / 2) * step;
      state.projectiles.push({
        id: state.id(),
        x: player.x,
        y: player.y,
        px: player.x,
        py: player.y,
        vx: Math.cos(angle) * s.speed,
        vy: Math.sin(angle) * s.speed,
        radius: s.size,
        source,
        pierce: Math.round(s.pierce),
        lifetime: s.duration,
        hits: new Map(),
        rehit: Infinity,
        homing: s.homing,
        sprite: weapon.def.visual.projectile ?? weapon.def.visual.sprite,
        dead: false,
      });
    }
    emitAttack(ctx, player.x, player.y, 0, base);
    return true;
  },
};

/** Strikes the nearest enemy, then jumps `chains` times to the nearest enemy not yet hit within `size`. */
const chain: WeaponBehavior = {
  fire(ctx) {
    const { state, player, weapon } = ctx;
    const s = weapon.stats;
    const hitThisAttack = new Set<number>();
    const source = hitSource(player, weapon);
    let fired = false;
    for (let bolt = 0; bolt < Math.max(1, Math.round(s.amount)); bolt++) {
      let current = state.nearestEnemy(player.x, player.y, s.range, hitThisAttack);
      if (!current) break;
      fired = true;
      const points = [player.x, player.y];
      for (let jump = 0; current && jump <= Math.round(s.chains); jump++) {
        const target: Enemy = current;
        hitThisAttack.add(target.id);
        points.push(target.x, target.y);
        hitEnemy(state, target, source, points[points.length - 4], points[points.length - 3]);
        current = state.nearestEnemy(target.x, target.y, s.size, hitThisAttack);
      }
      emitAttack(ctx, player.x, player.y, 0, 0, 0, points);
    }
    return fired;
  },
};

/** Keeps `amount` orbs circling the player; each orb hits an enemy at most once per `cooldown`. */
const orbit: WeaponBehavior = {
  continuous: true,
  fire() {
    return true;
  },
  maintain(ctx) {
    const { state, player, weapon } = ctx;
    const s = weapon.stats;
    const wanted = Math.max(1, Math.round(s.amount));
    const mine = state.projectiles.filter(
      (p) => !p.dead && p.orbit?.ownerId === player.id && p.orbit.weaponId === weapon.def.id,
    );
    const outdated =
      mine.length !== wanted ||
      mine.some((p) => p.radius !== s.size || p.orbit?.radius !== s.range);
    if (!outdated) {
      for (const p of mine) {
        p.source = hitSource(player, weapon);
        p.rehit = s.cooldown;
        if (p.orbit) p.orbit.speed = s.speed;
      }
      return;
    }
    for (const p of mine) p.dead = true;
    const start = mine[0]?.orbit?.angle ?? 0;
    for (let i = 0; i < wanted; i++) {
      const angle = start + (i / wanted) * Math.PI * 2;
      const x = player.x + Math.cos(angle) * s.range;
      const y = player.y + Math.sin(angle) * s.range;
      state.projectiles.push({
        id: state.id(),
        x,
        y,
        px: x,
        py: y,
        vx: 0,
        vy: 0,
        radius: s.size,
        source: hitSource(player, weapon),
        pierce: -1,
        lifetime: Infinity,
        hits: new Map(),
        rehit: s.cooldown,
        homing: 0,
        sprite: weapon.def.visual.projectile ?? weapon.def.visual.sprite,
        orbit: {
          ownerId: player.id,
          angle,
          radius: s.range,
          speed: s.speed,
          weaponId: weapon.def.id,
        },
        dead: false,
      });
    }
  },
};

/** Damages every enemy within `size` around the player; only fires when an enemy is in reach. */
const nova: WeaponBehavior = {
  fire(ctx) {
    const { state, player, weapon } = ctx;
    const targets = state.enemiesInRadius(player.x, player.y, weapon.stats.size);
    if (targets.length === 0) return false;
    const source = hitSource(player, weapon);
    for (const e of targets) hitEnemy(state, e, source, player.x, player.y);
    emitAttack(ctx, player.x, player.y, weapon.stats.size);
    return true;
  },
};

/** Swings an arc of width `arc` and reach `size` toward the nearest enemy; extra swings alternate sides. */
const sweep: WeaponBehavior = {
  fire(ctx) {
    const { state, player, weapon } = ctx;
    const s = weapon.stats;
    const target = state.nearestEnemy(player.x, player.y, Math.max(s.range, s.size));
    if (!target) return false;
    const source = hitSource(player, weapon);
    const base = Math.atan2(target.y - player.y, target.x - player.x);
    const swings = Math.max(1, Math.round(s.amount));
    for (let i = 0; i < swings; i++) {
      const angle = base + i * Math.PI + (i > 1 ? (i - 1) * 0.5 : 0);
      for (const e of state.enemiesInRadius(player.x, player.y, s.size)) {
        const toEnemy = Math.atan2(e.y - player.y, e.x - player.x);
        const inside = distance(player.x, player.y, e.x, e.y) <= e.radius + 4;
        if (inside || Math.abs(angleDifference(toEnemy, angle)) <= s.arc / 2)
          hitEnemy(state, e, source, player.x, player.y);
      }
      emitAttack(ctx, player.x, player.y, s.size, angle, s.arc);
    }
    return true;
  },
};

/** Calls down `amount` blasts of radius `size` on random enemies within `range`. */
const strike: WeaponBehavior = {
  fire(ctx) {
    const { state, player, weapon } = ctx;
    const s = weapon.stats;
    const candidates = state.enemiesInRadius(player.x, player.y, s.range);
    if (candidates.length === 0) return false;
    const source = hitSource(player, weapon);
    const n = Math.min(candidates.length, Math.max(1, Math.round(s.amount)));
    // Partial Fisher–Yates with the combat stream: n distinct random targets.
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(state.combatRng.next() * (candidates.length - i));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      const target = candidates[i];
      const { x, y } = target;
      for (const e of state.enemiesInRadius(x, y, s.size)) hitEnemy(state, e, source, x, y);
      emitAttack(ctx, x, y, s.size);
    }
    return true;
  },
};

export const WEAPON_BEHAVIORS: Record<WeaponBehaviorId, WeaponBehavior> = {
  projectile,
  chain,
  orbit,
  nova,
  sweep,
  strike,
};
