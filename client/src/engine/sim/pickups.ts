import { heal } from '../combat/damage';
import { RunState } from './run-state';
import { Pickup, Player } from './types';

/** Speed of a pickup flying toward the player once attracted. */
const ATTRACT_SPEED = 520;

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
    const magnetic = pickup.kind === 'xp' || pickup.kind === 'gold';
    if (!pickup.attracted && magnetic && dist <= player.stats.magnet) pickup.attracted = true;
    if (pickup.attracted) {
      const step = Math.min(dist, (ATTRACT_SPEED + Math.max(0, 300 - dist)) * dt);
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
    case 'heal':
      heal(state, player, pickup.value);
      return;
    case 'chest':
      state.pendingChests++;
      state.emit({ type: 'announcement', text: 'A divine treasure!', kind: 'info' });
      return;
  }
}
