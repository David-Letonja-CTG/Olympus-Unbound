import { Rng } from '../core/rng';
import { StatBlock } from '../core/stats';
import { direction } from '../core/vector';
import { Element, StatusApplication } from '../data/types';
import { RunState } from '../sim/run-state';
import { Enemy, HitSource, Player } from '../sim/types';
import { applyStatus, damageTakenMultiplier } from './status';

const ELEMENT_STAT = {
  lightning: 'lightningDamage',
  fire: 'fireDamage',
  physical: 'physicalDamage',
  shadow: 'shadowDamage',
} as const satisfies Record<Element, keyof StatBlock>;

export interface HitResult {
  readonly amount: number;
  readonly crit: boolean;
}

/**
 * The one damage rule (spec: combat / one damage pipeline):
 * weapon damage × might × element bonus × (critical multiplier if critical) × target damage-taken multiplier.
 */
export function resolveHit(
  source: HitSource,
  attacker: StatBlock,
  damageTaken: number,
  rng: Rng,
): HitResult {
  const crit = rng.chance(source.critChance + attacker.critChance);
  const amount =
    source.damage *
    attacker.might *
    attacker[ELEMENT_STAT[source.element]] *
    (crit ? attacker.critMultiplier : 1) *
    damageTaken;
  return { amount, crit };
}

/**
 * Applies a hit to an enemy: damage, the hit event, lifesteal, knockback away from (fromX, fromY), status
 * effects, and death. Returns the damage dealt (0 if the enemy was already dead).
 */
export function hitEnemy(
  state: RunState,
  enemy: Enemy,
  source: HitSource,
  fromX: number,
  fromY: number,
): number {
  if (enemy.dead) return 0;
  const attacker = state.players.find((p) => p.id === source.ownerId);
  const stats = attacker?.stats ?? state.players[0].stats;
  const hit = resolveHit(source, stats, damageTakenMultiplier(enemy), state.combatRng);
  // Surge after a perfect dodge (spec: boss-encounter / perfect dodge).
  const surge = attacker && attacker.surge > 0 ? 1 + state.balance.perfectDodge.damage : 1;
  const amount = hit.amount * surge;
  const crit = hit.crit;
  dealDamage(state, enemy, amount, crit, source.element);

  if (attacker) {
    const weapon = attacker.loadout.weapons.find((w) => w.def.id === source.weaponId);
    if (weapon) weapon.damageDealt += amount;
    const lifesteal = stats.lifesteal + source.lifesteal;
    if (lifesteal > 0 && attacker.alive) heal(state, attacker, amount * lifesteal);
  }

  if (source.knockback > 0 && !enemy.boss) {
    const resist = Math.min(1, enemy.def.knockbackResist + (enemy.elite ? 0.5 : 0));
    const dir = direction(fromX, fromY, enemy.x, enemy.y);
    const push = source.knockback * stats.knockback * (1 - resist);
    enemy.vx += dir.x * push;
    enemy.vy += dir.y * push;
  }
  if (!enemy.dead) applyEffects(state, enemy, source.effects, amount, stats.duration);
  return amount;
}

function applyEffects(
  state: RunState,
  enemy: Enemy,
  effects: readonly StatusApplication[],
  hitDamage: number,
  durationScale: number,
): void {
  for (const effect of effects) {
    if (state.combatRng.chance(effect.chance)) applyStatus(enemy, effect, hitDamage, durationScale);
  }
}

/** Removes health and handles death; used by hits and damage over time. */
export function dealDamage(
  state: RunState,
  enemy: Enemy,
  amount: number,
  crit: boolean,
  element: Element,
): void {
  if (enemy.dead) return;
  enemy.health -= amount;
  enemy.hitFlash = 0.1;
  state.emit({
    type: 'hit',
    x: enemy.x,
    y: enemy.y - enemy.radius,
    amount,
    crit,
    element,
    enemyId: enemy.id,
  });
  if (enemy.health <= 0) killEnemy(state, enemy);
}

/** An enemy dies exactly once: one kill, its drops, and (for the boss) victory. */
export function killEnemy(state: RunState, enemy: Enemy): void {
  if (enemy.dead) return;
  enemy.dead = true;
  enemy.health = 0;
  state.kills++;
  state.emit({
    type: 'kill',
    x: enemy.x,
    y: enemy.y,
    enemyId: enemy.id,
    defId: enemy.def.id,
    elite: enemy.elite,
    boss: !!enemy.boss,
    color: enemy.def.visual.color,
  });

  const loot = state.lootRng;
  if (enemy.xp > 0) state.spawnPickup('xp', enemy.x, enemy.y, enemy.xp);
  if (enemy.boss || enemy.elite || loot.chance(enemy.def.gold.chance)) {
    state.spawnPickup('gold', enemy.x + loot.range(-8, 8), enemy.y + loot.range(-8, 8), enemy.gold);
  }
  if (enemy.elite) state.spawnPickup('chest', enemy.x, enemy.y + 10, 1);
  else if (!enemy.boss && loot.chance(state.balance.drops.healChance)) {
    state.spawnPickup('heal', enemy.x + 6, enemy.y, state.balance.drops.healAmount);
  }
  if (enemy.boss) {
    state.bossDefeated = true;
    state.emit({ type: 'announcement', text: `${enemy.boss.def.name} has fallen!`, kind: 'boss' });
  }
}

export function heal(state: RunState, player: Player, amount: number): void {
  const before = player.health;
  player.health = Math.min(player.stats.maxHealth, player.health + amount);
  if (player.health > before + 0.5)
    state.emit({ type: 'playerHealed', playerId: player.id, amount: player.health - before });
}

/**
 * Damages a player: damage minus armour (at least 1), brief invulnerability, then death or revival
 * (spec: combat / player damage and death).
 */
export function damagePlayer(state: RunState, player: Player, damage: number): void {
  if (!player.alive || player.invulnerable > 0 || state.godMode) return;
  const amount = Math.max(1, damage - player.stats.armor);
  player.health -= amount;
  player.hurtFlash = 0.25;
  player.invulnerable = state.balance.player.invulnerableAfterHit;
  state.emit({ type: 'playerHurt', playerId: player.id, amount, x: player.x, y: player.y });
  if (player.health > 0) return;

  if (player.revivalsUsed < Math.floor(player.stats.revivals)) {
    player.revivalsUsed++;
    player.health = player.stats.maxHealth / 2;
    player.invulnerable = state.balance.player.reviveInvulnerable;
    state.emit({ type: 'playerRevived', playerId: player.id, x: player.x, y: player.y });
    state.emit({ type: 'announcement', text: 'Reborn from the ashes!', kind: 'info' });
    // Room to breathe: nearby enemies are thrown back.
    for (const e of state.enemiesInRadius(player.x, player.y, 260)) {
      if (e.boss) continue;
      const dir = direction(player.x, player.y, e.x, e.y);
      e.vx += dir.x * 900;
      e.vy += dir.y * 900;
    }
    return;
  }
  player.health = 0;
  player.alive = false;
}
