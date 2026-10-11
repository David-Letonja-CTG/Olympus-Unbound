import { RunState } from './run-state';

/**
 * Fallen gods' spirits wait where they fell; a living ally standing beside one fills its revival, and stepping away
 * drains it (spec: co-op / reviving allies). Players who left the run are never revived.
 */
export function updateRevives(state: RunState, dt: number): void {
  if (state.players.length < 2) return;
  const rules = state.balance.revive;
  const reach = rules.radius * rules.radius;
  for (const fallen of state.players) {
    if (fallen.alive || fallen.left) continue;
    let helper: (typeof state.players)[number] | undefined;
    for (const p of state.players) {
      if (!p.alive) continue;
      if ((p.x - fallen.x) ** 2 + (p.y - fallen.y) ** 2 <= reach) {
        helper = p;
        break;
      }
    }
    const rate = dt / rules.seconds;
    fallen.revive = helper ? fallen.revive + rate : Math.max(0, fallen.revive - rate);
    if (!helper || fallen.revive < 1) continue;
    fallen.revive = 0;
    fallen.alive = true;
    fallen.health = fallen.stats.maxHealth * rules.health;
    fallen.invulnerable = rules.invulnerable;
    fallen.px = fallen.x;
    fallen.py = fallen.y;
    state.emit({ type: 'playerRevived', playerId: fallen.id, x: fallen.x, y: fallen.y });
    state.emit({
      type: 'announcement',
      text: `${helper.name} revived ${fallen.name}!`,
      kind: 'info',
    });
  }
}
