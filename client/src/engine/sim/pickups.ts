import { heal } from '../combat/damage';
import { RunState } from './run-state';
import { Pickup, Player } from './types';

/** Speed of a pickup flying toward the player once attracted. */
const ATTRACT_SPEED = 520;
/** Extra speed per unit of distance of a called pickup (spec: run-progression / instant blessings). */
const CALLED_PULL = 2;
/** Seconds a called pickup takes to reach full speed, from a sixth of it: the stream stays visible. */
const CALLED_RAMP = 1;

/** Pickups within a player's magnet radius fly to them and are collected on contact. */
export function updatePickups(state: RunState, dt: number): void {
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    const player = state.nearestPlayer(pickup.x, pickup.y);
    if (!player) return;
    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= player.radius + 10) {
      collect(state, player, pickup);
      continue;
    }
    // Chests and healing must be walked to; XP and gold are pulled by the magnet.
    const magnetic = pickup.kind === 'xp' || pickup.kind === 'gold' || pickup.kind === 'token';
    if (!pickup.attracted && magnetic && dist <= player.stats.magnet) pickup.attracted = true;
    if (pickup.attracted) {
      // Called gems rise slowly, then rush in from anywhere, fastest from far away: all arrive within about
      // two seconds, as a visible stream.
      let speed = ATTRACT_SPEED + Math.max(0, 300 - dist);
      if (pickup.calledFor !== undefined) {
        pickup.calledFor += dt;
        const ramp = Math.min(1, 1 / 6 + pickup.calledFor / CALLED_RAMP);
        speed = (ATTRACT_SPEED + CALLED_PULL * dist) * ramp;
      }
      const step = Math.min(dist, speed * dt);
      pickup.x += (dx / dist) * step;
      pickup.y += (dy / dist) * step;
    }
  }
}

/** `quiet`: gathered by a gate, without a sound per pickup (spec: endless-run / travelling). */
export function collect(state: RunState, player: Player, pickup: Pickup, quiet = false): void {
  if (pickup.dead) return;
  pickup.dead = true;
  if (!quiet)
    state.emit({
      type: 'pickup',
      kind: pickup.kind,
      x: pickup.x,
      y: pickup.y,
      value: pickup.value,
    });
  switch (pickup.kind) {
    case 'xp':
      state.addXp(pickup.value * player.stats.xpGain);
      return;
    case 'gold':
      state.gold += pickup.value * player.stats.goldGain;
      return;
    case 'token':
      state.tokens += pickup.value;
      return;
    case 'heal':
      heal(state, player, pickup.value);
      return;
    case 'chest':
      state.pendingChests++;
      state.emit({ type: 'announcement', text: 'A divine treasure!', kind: 'info' });
      return;
  }
}
