import { BoonDefinition } from '../data/types';
import { refreshPlayer } from '../progression/loadout';
import { RunState } from '../sim/run-state';
import { Player } from '../sim/types';

/**
 * Blesses a god (spec: director-of-chaos / divine blessings): the boon's modifiers count through the loadout's stat rules
 * until it runs out. Receiving one already held refreshes its time instead of stacking it.
 */
export function grantBoon(state: RunState, player: Player, def: BoonDefinition): void {
  const held = player.boons.find((b) => b.def.id === def.id);
  if (held) held.left = def.seconds;
  else {
    player.boons.push({ def, left: def.seconds });
    refreshPlayer(state, player);
  }
  state.emit({ type: 'blessed', playerId: player.id, boonId: def.id, x: player.x, y: player.y });
}

/** Counts blessings down in simulation seconds and takes expired ones away, restoring the god's stats. */
export function updateBoons(state: RunState, dt: number): void {
  for (const player of state.players) {
    if (player.boons.length === 0) continue;
    let expired = false;
    for (const boon of player.boons) {
      boon.left -= dt;
      if (boon.left <= 0) expired = true;
    }
    if (!expired) continue;
    player.boons = player.boons.filter((b) => b.left > 0);
    refreshPlayer(state, player);
  }
}
