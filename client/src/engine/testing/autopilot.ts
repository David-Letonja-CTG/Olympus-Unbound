import { RunSimulation, STEP } from '../sim/run-simulation';
import { PlayerInput } from '../sim/types';

/**
 * A simple bot for headless run tests: flees nearby enemies, steps out of telegraphs, collects XP and uses the
 * ability whenever it is ready. Deterministic, so runs replay exactly.
 */
export function autopilot(sim: RunSimulation): PlayerInput {
  const state = sim.state;
  const p = state.players[0];
  let mx = 0;
  let my = 0;
  for (const e of state.enemiesInRadius(p.x, p.y, 260)) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d2 = Math.max(dx * dx + dy * dy, 1);
    const weight = (e.boss ? 6 : 1) * (e.radius / 15);
    mx += (dx / d2) * 400 * weight;
    my += (dy / d2) * 400 * weight;
  }
  for (const h of state.hazards) {
    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    if (h.shape === 'circle' && d < h.radius + 40) {
      mx += (dx / d) * 4;
      my += (dy / d) * 4;
    }
  }
  let nearest: { x: number; y: number } | undefined;
  let best = 420 * 420;
  for (const pick of state.pickups) {
    const d = (pick.x - p.x) ** 2 + (pick.y - p.y) ** 2;
    if (d < best) {
      best = d;
      nearest = pick;
    }
  }
  if (nearest) {
    const d = Math.sqrt(best) || 1;
    mx += ((nearest.x - p.x) / d) * 0.6;
    my += ((nearest.y - p.y) / d) * 0.6;
  }
  // Drift back toward the middle of the map so the bot does not get pinned against the cliffs.
  const cx = (state.arena.bounds.minX + state.arena.bounds.maxX) / 2;
  const cy = (state.arena.bounds.minY + state.arena.bounds.maxY) / 2;
  mx += ((cx - p.x) / state.arena.width) * 1.2;
  my += ((cy - p.y) / state.arena.height) * 1.2;
  const length = Math.hypot(mx, my);
  return length > 0.05
    ? { moveX: mx / length, moveY: my / length, ability: true }
    : { moveX: 0, moveY: 0, ability: true };
}

/** Plays a run with the autopilot until it ends or `maxSeconds` pass; picks the first offer of every choice. */
export function playRun(
  sim: RunSimulation,
  maxSeconds: number,
  choose: (sim: RunSimulation) => number = () => 0,
): void {
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps && sim.phase !== 'ended'; i++) {
    while (sim.phase === 'choosing') sim.choose(choose(sim));
    sim.step(STEP, [autopilot(sim)]);
  }
}
