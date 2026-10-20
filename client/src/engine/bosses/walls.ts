import { BossAttack } from '../data/types';
import { RunState } from '../sim/run-state';
import { Hazard } from '../sim/types';
import type { AttackOrigin } from './boss';

/** A pillar's size (the Labyrinth's wall block) and the spacing that closes a wall between pillars. */
const PILLAR = 24;
const SPACING = 40;

/**
 * Warns where walls will rise around `from` (spec: boss-encounter / asterion's shifting walls): pillars along each
 * ring, in arcs with gaps, turned by the run's seed. The standing walls sink as the new ones rise.
 */
export function startWalls(
  state: RunState,
  from: AttackOrigin,
  attack: Extract<BossAttack, { type: 'walls' }>,
  damage: number,
): void {
  for (const w of state.walls) w.left = Math.min(w.left, attack.windup);
  const turn = state.spawnRng.angle();
  attack.rings.forEach((ring, r) => {
    const sector = (Math.PI * 2) / attack.segments;
    const span = sector * (1 - attack.gapShare);
    const count = Math.max(1, Math.floor((span * ring) / SPACING) + 1);
    for (let s = 0; s < attack.segments; s++) {
      // Rings are turned against each other, so their gaps do not line up into a straight way out.
      const start = turn + s * sector + (r % 2) * sector * 0.5;
      for (let i = 0; i < count; i++) {
        const a = start + (count > 1 ? (span * i) / (count - 1) : 0);
        const x = from.x + Math.cos(a) * ring;
        const y = from.y + Math.sin(a) * ring;
        if (state.collision.isBlocked(x, y, 4)) continue;
        state.addHazard({
          kind: attack.id,
          sourceId: from.id,
          shape: 'circle',
          x,
          y,
          radius: PILLAR + 2,
          x2: 0,
          y2: 0,
          width: 0,
          warn: attack.windup,
          damage,
          wall: attack.duration,
        });
      }
    }
  });
}

/** A wall's warning has ended: its pillar stands. */
export function raiseWalls(state: RunState, h: Hazard): void {
  state.walls.push({ id: state.id(), x: h.x, y: h.y, radius: PILLAR, age: 0, left: h.wall ?? 0 });
  state.collision.setDynamic(state.walls);
}

/** Pillars stand their time and sink; the collision follows them. */
export function updateWalls(state: RunState, dt: number): void {
  if (state.walls.length === 0) return;
  let changed = false;
  let w = 0;
  for (const wall of state.walls) {
    wall.age += dt;
    wall.left -= dt;
    if (wall.left > 0) state.walls[w++] = wall;
    else changed = true;
  }
  state.walls.length = w;
  if (changed) state.collision.setDynamic(state.walls);
}
