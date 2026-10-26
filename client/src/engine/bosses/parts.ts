import { damagePlayer } from '../combat/damage';
import { bossPartAsEnemy } from '../data/content-index';
import { RunState } from '../sim/run-state';
import { BossRuntime, Enemy, PartState, Player } from '../sim/types';
import { pauseOf, placeAttack } from './boss';

/** Zone damage is dealt in ticks of this many seconds. */
const ZONE_TICK = 0.5;
/** A part's attack reaches at most this far toward its target. */
const PART_REACH = 700;

/** The boss's parts, waiting for their phase (spec: boss-encounter / signature mechanics). */
export function initParts(state: RunState, boss: Enemy): void {
  const rt = boss.boss as BossRuntime;
  for (const def of rt.def.parts ?? [])
    rt.parts.set(def.id, {
      def,
      x: boss.x,
      y: boss.y,
      timer: def.delay,
      attackIndex: 0,
      regrowIn: 0,
      active: false,
    });
  placeParts(state, boss);
  updateParts(state, boss, undefined, 0);
}

function placeParts(state: RunState, boss: Enemy): void {
  const rt = boss.boss as BossRuntime;
  const arena = state.arena.bossArena;
  for (const part of rt.parts.values()) {
    const { from, angle, distance } = part.def.place;
    if (from === 'arena') {
      part.x = arena.x + Math.cos(angle) * distance;
      part.y = arena.y + Math.sin(angle) * distance;
    } else {
      // Around the boss, turned with the way it faces.
      const a = boss.facing >= 0 ? angle : Math.PI - angle;
      part.x = boss.x + Math.cos(a) * distance;
      part.y = boss.y + Math.sin(a) * distance;
    }
  }
}

function damageable(part: PartState): boolean {
  return part.def.health !== undefined;
}

function grow(state: RunState, boss: Enemy, part: PartState): void {
  part.active = true;
  part.regrowIn = 0;
  part.timer = part.def.delay;
  if (!damageable(part)) return;
  const def = bossPartAsEnemy((boss.boss as BossRuntime).def, part.def);
  const e = state.spawnEnemy(def, part.x, part.y, {
    part: { bossId: boss.id, partId: part.def.id },
  });
  part.enemyId = e?.id;
}

/**
 * Each step: parts appear with their phase, sit at their place, attack on their own rhythm, fall and grow back; the
 * ordered ones are shielded but the next; when every damageable part is down the boss is exposed; parts' zones are
 * collected for the run (spec: boss-encounter / signature mechanics).
 */
export function updateParts(
  state: RunState,
  boss: Enemy,
  target: Player | undefined,
  dt: number,
): void {
  const rt = boss.boss as BossRuntime;
  if (rt.parts.size === 0) return;
  placeParts(state, boss);
  const def = rt.def;
  const pace = pauseOf(rt, 1);

  if (rt.exposed > 0) {
    rt.exposed = Math.max(0, rt.exposed - dt);
    // Exposure over: every head grows back at once.
    if (rt.exposed === 0)
      for (const part of rt.parts.values())
        if (!part.active && damageable(part) && (part.def.fromPhase ?? 0) <= rt.phase) {
          grow(state, boss, part);
          state.emit({ type: 'partGrew', x: part.x, y: part.y });
        }
  }

  let alive = 0;
  let inPhase = 0;
  for (const part of rt.parts.values()) {
    if ((part.def.fromPhase ?? 0) > rt.phase) continue;
    if (damageable(part)) inPhase++;
    // First appearance with its phase.
    if (!part.active && part.regrowIn === 0 && part.enemyId === undefined && rt.exposed === 0) {
      grow(state, boss, part);
      if (rt.phase > 0) state.emit({ type: 'partGrew', x: part.x, y: part.y });
    }
    const enemy =
      part.enemyId !== undefined ? state.enemies.find((e) => e.id === part.enemyId) : undefined;
    if (part.active && damageable(part)) {
      if (!enemy || enemy.dead) {
        // It fell: it grows back after a while (not while the boss is exposed).
        part.active = false;
        part.enemyId = undefined;
        part.regrowIn = part.def.regrow ?? Infinity;
        state.emit({ type: 'partFell', x: part.x, y: part.y });
        state.emit({ type: 'announcement', text: `${part.def.name} falls!`, kind: 'info' });
      } else {
        enemy.x = enemy.px = part.x;
        enemy.y = enemy.py = part.y;
      }
    }
    if (!part.active && damageable(part) && rt.exposed === 0 && Number.isFinite(part.regrowIn)) {
      part.regrowIn -= dt;
      if (part.regrowIn <= 0) {
        part.regrowIn = 0;
        grow(state, boss, part);
        state.emit({ type: 'partGrew', x: part.x, y: part.y });
        state.emit({ type: 'announcement', text: `${part.def.name} grows back!`, kind: 'boss' });
      }
    }
    if (part.active && damageable(part)) alive++;

    // Its own rhythm.
    if (part.active && target && dt > 0) {
      part.timer -= dt;
      if (part.timer <= 0 && part.def.attacks.length > 0) {
        part.timer = part.def.pause * pace;
        if ((target.x - part.x) ** 2 + (target.y - part.y) ** 2 <= PART_REACH * PART_REACH) {
          const attack = part.def.attacks[part.attackIndex++ % part.def.attacks.length];
          state.emit({ type: 'bossAttack', attack: attack.id, kind: attack.type });
          placeAttack(
            state,
            { x: part.x, y: part.y, id: part.enemyId ?? boss.id, radius: boss.radius },
            attack,
            target,
          );
        }
      }
    }
  }

  // Every damageable part down: the boss is exposed.
  if (def.exposed && inPhase > 0 && alive === 0 && rt.exposed === 0) {
    rt.exposed = def.exposed.seconds;
    for (const part of rt.parts.values()) part.regrowIn = Math.max(part.regrowIn, 0.01);
    state.emit({ type: 'announcement', text: `${def.name} is exposed! Strike now!`, kind: 'boss' });
  }

  markOrder(state, rt);
  collectZones(state, rt, dt);
}

/** Ordered parts: only the lowest living order can be hurt; it is marked, the rest shielded. */
function markOrder(state: RunState, rt: BossRuntime): void {
  let next: PartState | undefined;
  for (const part of rt.parts.values())
    if (
      part.active &&
      part.def.order !== undefined &&
      (!next || part.def.order < (next.def.order ?? 0))
    )
      next = part;
  for (const part of rt.parts.values()) {
    if (part.enemyId === undefined) continue;
    const e = state.enemies.find((x) => x.id === part.enemyId);
    if (!e) continue;
    const ordered = part.def.order !== undefined;
    e.guarded = ordered && part !== next;
    e.marked = ordered && part === next ? part.def.order : undefined;
  }
}

/** The zones living parts hold; gods inside are hurt in ticks and slowed. */
function collectZones(state: RunState, rt: BossRuntime, dt: number): void {
  state.zones.length = 0;
  for (const part of rt.parts.values()) {
    const z = part.def.zone;
    if (part.active && z)
      state.zones.push({ x: part.x, y: part.y, radius: z.radius, dps: z.dps, slow: z.slow });
  }
  if (state.zones.length === 0 || dt <= 0) return;
  // Ticks on the run's clock, so every god in a zone is hurt on the same beat.
  const before = Math.floor((state.time - dt) / ZONE_TICK);
  const now = Math.floor(state.time / ZONE_TICK);
  const tick = now > before;
  for (const p of state.players) {
    if (!p.alive) continue;
    for (const z of state.zones) {
      if ((p.x - z.x) ** 2 + (p.y - z.y) ** 2 > (z.radius + p.radius) ** 2) continue;
      // A zone without damage only slows (Hypnos, spec: seasonal-events / the longest night).
      if (tick && z.dps > 0)
        damagePlayer(state, p, z.dps * ZONE_TICK * state.depthScale().bossDamage);
      break;
    }
  }
}

/** A god's movement in a zone (spec: boss-encounter / scylla's tentacles hold the arena). */
export function zoneSlow(state: RunState, p: Player): number {
  for (const z of state.zones)
    if ((p.x - z.x) ** 2 + (p.y - z.y) ** 2 <= (z.radius + p.radius) ** 2) return 1 - z.slow;
  return 1;
}

/** The boss has fallen: its parts fall with it, and its walls and zones are gone. */
export function clearBoss(state: RunState): void {
  for (const e of state.enemies) if (e.part && !e.dead) e.dead = true;
  state.walls.length = 0;
  state.zones.length = 0;
  state.collision.setDynamic(state.walls);
}
