import { damagePlayer } from '../combat/damage';
import { direction, distanceToSegmentSq } from '../core/vector';
import { BossAttack, BossDefinition, EnemyDefinition } from '../data/types';
import { RunState } from '../sim/run-state';
import { BossRuntime, Enemy, Player } from '../sim/types';

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
  const runtime: BossRuntime = { def, phase: 0, attackTimer: 3, attackIndex: 0, windup: 0 };
  const { x, y } = state.arena.bossArena;
  const boss = state.spawnEnemy(bossAsEnemy(def), x, y, { boss: runtime });
  state.boss = boss;
  state.emit({ type: 'bossSpawned', bossId: def.id, name: def.name });
  state.emit({
    type: 'announcement',
    text: `${def.name}, ${def.title}, has awoken!`,
    kind: 'boss',
  });
  return boss;
}

export function updateBoss(state: RunState, enemy: Enemy, target: Player, dt: number): void {
  const boss = enemy.boss as BossRuntime;
  const def = boss.def;

  // Phase changes, each announced once.
  const fraction = enemy.health / enemy.maxHealth;
  while (boss.phase + 1 < def.phases.length && fraction < def.phases[boss.phase + 1].below) {
    boss.phase++;
    boss.attackIndex = 0;
    state.emit({ type: 'announcement', text: def.phases[boss.phase].announcement, kind: 'boss' });
  }
  const phase = def.phases[boss.phase];

  if (boss.dash) {
    const dash = boss.dash;
    enemy.x += dash.dx * dash.speed * dt;
    enemy.y += dash.dy * dash.speed * dt;
    dash.time -= dt;
    if (!dash.hit) {
      for (const p of state.players) {
        const reach = enemy.radius + p.radius;
        if (p.alive && (p.x - enemy.x) ** 2 + (p.y - enemy.y) ** 2 <= reach * reach) {
          damagePlayer(state, p, dash.damage);
          dash.hit = true;
        }
      }
    }
    if (dash.time <= 0) {
      boss.dash = undefined;
      boss.attackTimer = def.attackPause;
    }
    return;
  }

  if (boss.current) {
    boss.windup -= dt;
    if (boss.windup <= 0) {
      const attack = boss.current;
      boss.current = undefined;
      boss.attackTimer = def.attackPause;
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

  boss.attackTimer -= dt;
  if (boss.attackTimer > 0) return;
  const attack = phase.attacks[boss.attackIndex % phase.attacks.length];
  boss.attackIndex++;
  startAttack(state, enemy, boss, attack, target);
}

function startAttack(
  state: RunState,
  enemy: Enemy,
  boss: BossRuntime,
  attack: BossAttack,
  target: Player,
): void {
  state.emit({ type: 'bossAttack', attack: attack.id, kind: attack.type });
  const base = { kind: attack.id, sourceId: enemy.id, x2: 0, y2: 0, width: 0 };
  switch (attack.type) {
    case 'slam':
      state.addHazard({
        ...base,
        shape: 'circle',
        x: enemy.x,
        y: enemy.y,
        radius: attack.radius,
        warn: attack.windup,
        damage: attack.damage * state.depthScale().bossDamage,
      });
      boss.current = attack;
      boss.windup = attack.windup;
      return;
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
          damage: attack.damage * state.depthScale().bossDamage,
        });
      }
      boss.current = attack;
      boss.windup = attack.windup * 0.5;
      return;
    case 'charge': {
      const dir = direction(enemy.x, enemy.y, target.x, target.y);
      enemy.dirX = dir.x;
      enemy.dirY = dir.y;
      // A warning only: the dash itself deals the damage.
      state.addHazard({
        ...base,
        shape: 'line',
        x: enemy.x,
        y: enemy.y,
        x2: enemy.x + dir.x * attack.length,
        y2: enemy.y + dir.y * attack.length,
        width: attack.width,
        radius: 0,
        warn: attack.windup,
        damage: 0,
      });
      boss.current = attack;
      boss.windup = attack.windup;
      return;
    }
    case 'summon': {
      const minion = state.index.enemy(attack.enemy);
      for (let i = 0; i < attack.count; i++) {
        const a = (i / attack.count) * Math.PI * 2;
        const x = enemy.x + Math.cos(a) * (enemy.radius + 40);
        const y = enemy.y + Math.sin(a) * (enemy.radius + 40);
        if (!state.collision.isBlocked(x, y, minion.radius)) state.spawnEnemy(minion, x, y);
      }
      // No wind-up: the boss moves on to its next attack after a short pause.
      boss.attackTimer = 1;
      return;
    }
  }
}

/** Counts down telegraphs; when one ends, every living player inside it is hit (spec: telegraphed attacks). */
export function updateHazards(state: RunState, dt: number): void {
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
      shape: h.shape,
      x2: h.x2,
      y2: h.y2,
      width: h.width,
    });
    if (h.damage <= 0) continue;
    for (const p of state.players) {
      if (!p.alive) continue;
      const inside =
        h.shape === 'circle'
          ? (p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= (h.radius + p.radius) ** 2
          : distanceToSegmentSq(p.x, p.y, h.x, h.y, h.x2, h.y2) <= (h.width / 2 + p.radius) ** 2;
      if (inside) damagePlayer(state, p, h.damage);
    }
  }
}
