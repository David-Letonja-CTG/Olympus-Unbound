import { damagePlayer } from '../combat/damage';
import { direction, distanceToSegmentSq } from '../core/vector';
import { BossAttack, BossDefinition, EnemyDefinition } from '../data/types';
import { RunState } from '../sim/run-state';
import { BossRuntime, Enemy, Hazard, Player } from '../sim/types';
import { initParts, updateParts } from './parts';
import { raiseWalls, startWalls } from './walls';

/** The enemy definition a boss uses for the shared parts of the enemy pipeline (damage, death, drops). */
export function bossAsEnemy(boss: BossDefinition): EnemyDefinition {
  return {
    id: boss.id,
    name: boss.name,
    health: boss.health,
    speed: boss.speed,
    damage: boss.contactDamage,
    radius: boss.radius,
    xp: boss.xp,
    gold: { chance: 1, amount: boss.gold },
    knockbackResist: 1,
    behavior: { type: 'chaser' },
    visual: boss.visual,
  };
}

/** Spawns the realm's boss in the boss arena, once (spec: boss-encounter / boss arrival). */
export function spawnBoss(state: RunState): Enemy | undefined {
  if (state.boss) return state.boss;
  const def = state.index.boss(state.realm.boss.id);
  const runtime: BossRuntime = {
    def,
    phase: 0,
    attackTimer: 3,
    attackIndex: 0,
    windup: 0,
    enraged: !!def.phases[0]?.enraged,
    exposed: 0,
    parts: new Map(),
  };
  const { x, y } = state.arena.bossArena;
  const boss = state.spawnEnemy(bossAsEnemy(def), x, y, { boss: runtime });
  state.boss = boss;
  if (boss) initParts(state, boss);
  state.emit({ type: 'bossSpawned', bossId: def.id, name: def.name });
  state.emit({
    type: 'announcement',
    text: `${def.name}, ${def.title}, has awoken!`,
    kind: 'boss',
  });
  return boss;
}

/** How long a boss pauses between attacks in its current phase (shorter while raging). */
export function pauseOf(boss: BossRuntime, base = boss.def.attackPause): number {
  return base * (boss.def.phases[boss.phase]?.pauseMultiplier ?? 1);
}

export function updateBoss(state: RunState, enemy: Enemy, target: Player, dt: number): void {
  const boss = enemy.boss as BossRuntime;
  const def = boss.def;

  // Phase changes, each announced once.
  const fraction = enemy.health / enemy.maxHealth;
  while (boss.phase + 1 < def.phases.length && fraction < def.phases[boss.phase + 1].below) {
    boss.phase++;
    boss.attackIndex = 0;
    boss.enraged = !!def.phases[boss.phase].enraged;
    state.emit({ type: 'announcement', text: def.phases[boss.phase].announcement, kind: 'boss' });
  }
  const phase = def.phases[boss.phase];
  updateParts(state, enemy, target, dt);

  // Dazed (a charge into a wall): it stands still and takes extra damage (spec: boss-encounter / bull rush).
  if ((enemy.dazed ?? 0) > 0) {
    enemy.dazed = Math.max(0, (enemy.dazed ?? 0) - dt);
    return;
  }

  if (boss.dash) {
    const dash = boss.dash;
    enemy.x += dash.dx * dash.speed * dt;
    enemy.y += dash.dy * dash.speed * dt;
    dash.time -= dt;
    if (!dash.hit) {
      for (const p of state.players) {
        const reach = enemy.radius + p.radius;
        if (p.alive && (p.x - enemy.x) ** 2 + (p.y - enemy.y) ** 2 <= reach * reach) {
          if (dodgeOrHit(state, p, dash.damage)) dash.hit = true;
        }
      }
    }
    // Into a wall: the charge stops and the boss is dazed.
    if (def.chargeStun && state.collision.touchesDynamic(enemy)) {
      boss.dash = undefined;
      enemy.dazed = def.chargeStun;
      boss.attackTimer = pauseOf(boss);
      state.emit({ type: 'announcement', text: `${def.name} is dazed!`, kind: 'boss' });
      return;
    }
    if (dash.time <= 0) {
      boss.dash = undefined;
      boss.attackTimer = pauseOf(boss);
    }
    return;
  }

  if (boss.current) {
    boss.windup -= dt;
    if (boss.windup <= 0) {
      const attack = boss.current;
      boss.current = undefined;
      boss.attackTimer = pauseOf(boss);
      if (attack.type === 'charge') {
        boss.dash = {
          dx: enemy.dirX,
          dy: enemy.dirY,
          time: attack.length / attack.speed,
          speed: attack.speed,
          damage: attack.damage * state.depthScale().bossDamage,
          hit: false,
        };
      }
    }
    return;
  }

  const dir = direction(enemy.x, enemy.y, target.x, target.y);
  const speed =
    enemy.speed *
    phase.speedMultiplier *
    (enemy.status.slow > 0 ? 1 - enemy.status.slowPotency * 0.5 : 1);
  enemy.x += dir.x * speed * dt;
  enemy.y += dir.y * speed * dt;
  enemy.facing = dir.x >= 0 ? 1 : -1;
  anchor(state, enemy, def);

  boss.attackTimer -= dt;
  if (boss.attackTimer > 0) return;
  const attack = phase.attacks[boss.attackIndex % phase.attacks.length];
  boss.attackIndex++;
  state.emit({ type: 'bossAttack', attack: attack.id, kind: attack.type });
  const busy = placeAttack(state, { x: enemy.x, y: enemy.y, id: enemy.id }, attack, target, enemy);
  if (attack.type === 'summon') {
    // No wind-up: the boss moves on to its next attack after a short pause.
    boss.attackTimer = 1;
    return;
  }
  boss.current = attack;
  boss.windup = busy;
}

/** An anchored boss (Scylla) stays near its arena's centre. */
function anchor(state: RunState, enemy: Enemy, def: BossDefinition): void {
  if (!def.anchored) return;
  const c = state.arena.bossArena;
  const dx = enemy.x - c.x;
  const dy = enemy.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d <= def.anchored) return;
  enemy.x = c.x + (dx / d) * def.anchored;
  enemy.y = c.y + (dy / d) * def.anchored;
}

/** Where an attack comes from: the boss, or one of its parts. */
export interface AttackOrigin {
  readonly x: number;
  readonly y: number;
  readonly id: number;
}

/**
 * Marks an attack's warnings from `from` toward `target` (spec: boss-encounter / telegraphed attacks) and returns how
 * long its attacker is busy with it. A charge also points `charger` along its line; a summon calls its monsters now.
 */
export function placeAttack(
  state: RunState,
  from: AttackOrigin,
  attack: BossAttack,
  target: Player,
  charger?: Enemy,
): number {
  const damage = 'damage' in attack ? attack.damage * state.depthScale().bossDamage : 0;
  const base = { kind: attack.id, sourceId: from.id, x2: 0, y2: 0, width: 0 };
  const toward = direction(from.x, from.y, target.x, target.y);
  switch (attack.type) {
    case 'slam':
      state.addHazard({
        ...base,
        shape: 'circle',
        x: from.x,
        y: from.y,
        radius: attack.radius,
        warn: attack.windup,
        damage,
      });
      return attack.windup;
    case 'boulder':
      for (let i = 0; i < attack.count; i++) {
        const a = state.spawnRng.angle();
        const d = i === 0 ? 0 : state.spawnRng.range(attack.radius, attack.spread);
        state.addHazard({
          ...base,
          shape: 'circle',
          x: target.x + Math.cos(a) * d,
          y: target.y + Math.sin(a) * d,
          radius: attack.radius,
          warn: attack.windup + i * 0.15,
          damage,
        });
      }
      return attack.windup * 0.5;
    case 'charge': {
      if (charger) {
        charger.dirX = toward.x;
        charger.dirY = toward.y;
      }
      // A warning only: the dash itself deals the damage.
      state.addHazard({
        ...base,
        shape: 'line',
        x: from.x,
        y: from.y,
        x2: from.x + toward.x * attack.length,
        y2: from.y + toward.y * attack.length,
        width: attack.width,
        radius: 0,
        warn: attack.windup,
        damage: 0,
      });
      return attack.windup;
    }
    case 'summon': {
      const minion = state.index.enemy(attack.enemy);
      for (let i = 0; i < attack.count; i++) {
        const a = (i / attack.count) * Math.PI * 2;
        const x = from.x + Math.cos(a) * 80;
        const y = from.y + Math.sin(a) * 80;
        if (!state.collision.isBlocked(x, y, minion.radius)) state.spawnEnemy(minion, x, y);
      }
      return 0;
    }
    case 'sweep': {
      // Cones toward the target, alternating sides, one after another.
      const center = Math.atan2(toward.y, toward.x);
      for (let i = 0; i < attack.count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        state.addHazard({
          ...base,
          shape: 'cone',
          x: from.x,
          y: from.y,
          radius: attack.radius,
          angle: center + (attack.count > 1 ? side * attack.arc * 0.25 : 0),
          arc: attack.arc,
          warn: attack.windup + i * attack.gap,
          damage,
        });
      }
      return attack.windup + (attack.count - 1) * attack.gap;
    }
    case 'lash':
      state.addHazard({
        ...base,
        shape: 'line',
        x: from.x,
        y: from.y,
        x2: from.x + toward.x * attack.length,
        y2: from.y + toward.y * attack.length,
        width: attack.width,
        radius: 0,
        warn: attack.windup,
        damage,
      });
      return attack.windup;
    case 'walls':
      startWalls(state, from, attack, damage);
      return attack.windup;
  }
}

/**
 * A boss hit meets a god: a god whose dash is running dodges it perfectly (spec: boss-encounter / perfect dodge),
 * anyone else takes the damage. Returns true when the god was hit.
 */
export function dodgeOrHit(state: RunState, p: Player, damage: number): boolean {
  const rules = state.balance.stamina;
  // In the dash, or the grace right after it.
  if (p.dashCooldown > rules.dashRecovery - rules.dashGrace) {
    perfectDodge(state, p);
    return false;
  }
  damagePlayer(state, p, damage);
  return true;
}

function perfectDodge(state: RunState, p: Player): void {
  if (p.dodged) return;
  p.dodged = true;
  const rules = state.balance.perfectDodge;
  p.stamina = Math.min(state.balance.stamina.max, p.stamina + state.balance.stamina.dashCost);
  p.surge = rules.surge;
  state.emit({ type: 'perfectDodge', playerId: p.id, x: p.x, y: p.y });
}

function inside(h: Hazard, p: Player): boolean {
  if (h.shape === 'circle')
    return (p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= (h.radius + p.radius) ** 2;
  if (h.shape === 'line')
    return distanceToSegmentSq(p.x, p.y, h.x, h.y, h.x2, h.y2) <= (h.width / 2 + p.radius) ** 2;
  // A cone: within reach and within half the arc of its direction.
  const dx = p.x - h.x;
  const dy = p.y - h.y;
  const d = Math.hypot(dx, dy);
  if (d > h.radius + p.radius) return false;
  if (d < p.radius) return true;
  let diff = Math.atan2(dy, dx) - (h.angle ?? 0);
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return Math.abs(diff) <= (h.arc ?? 0) / 2 + Math.asin(Math.min(1, p.radius / d));
}

/** Counts down telegraphs; when one ends, every living player inside it is hit (spec: telegraphed attacks). */
export function updateHazards(state: RunState, dt: number): void {
  let rose = false;
  for (const h of state.hazards) {
    if (h.dead) continue;
    h.timer -= dt;
    if (h.timer > 0) continue;
    h.dead = true;
    state.emit({
      type: 'hazardResolved',
      x: h.x,
      y: h.y,
      radius: h.radius,
      shape: h.shape === 'cone' ? 'circle' : h.shape,
      x2: h.x2,
      y2: h.y2,
      width: h.width,
    });
    if (h.wall !== undefined) {
      raiseWalls(state, h);
      rose = true;
    }
    if (h.damage <= 0) continue;
    for (const p of state.players) if (p.alive && inside(h, p)) dodgeOrHit(state, p, h.damage);
  }
  if (rose) {
    state.emit({ type: 'wallsRose', x: state.boss?.x ?? 0, y: state.boss?.y ?? 0 });
    // Gods and monsters where a wall rose are thrown aside.
    for (const p of state.players) if (p.alive) state.collision.resolve(p);
    for (const e of state.enemies) if (!e.dead && !e.part) state.collision.resolve(e);
  }
}
