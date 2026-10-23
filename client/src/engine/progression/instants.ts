import { InstantDefinition, InstantEffect } from '../data/types';
import { RunState } from '../sim/run-state';
import { Player } from '../sim/types';

interface InstantRule<E extends InstantEffect> {
  /** Whether the blessing is worth offering now. */
  valid(state: RunState, def: InstantDefinition, effect: E): boolean;
  apply(state: RunState, player: Player, effect: E): void;
}

/** Living pickups of these kinds that no god's magnet reaches yet. */
function lyingBeyondMagnets(state: RunState, kinds: readonly string[]): number {
  let count = 0;
  for (const pickup of state.pickups) {
    if (pickup.dead || pickup.attracted || !kinds.includes(pickup.kind)) continue;
    const reached = state.players.some(
      (p) => p.alive && (p.x - pickup.x) ** 2 + (p.y - pickup.y) ** 2 <= p.stats.magnet ** 2,
    );
    if (!reached) count++;
  }
  return count;
}

/** One rule per effect type (D4): a new kind of instant blessing is one rule here plus data. */
const INSTANT_RULES: {
  [T in InstantEffect['type']]: InstantRule<Extract<InstantEffect, { type: T }>>;
} = {
  // spec: run-progression / instant blessings (call_of_hermes)
  gather: {
    valid: (state, def, effect) => lyingBeyondMagnets(state, effect.kinds) >= (def.minLying ?? 1),
    apply(state, player, effect) {
      let count = 0;
      for (const pickup of state.pickups) {
        if (pickup.dead || !(effect.kinds as readonly string[]).includes(pickup.kind)) continue;
        pickup.attracted = true;
        pickup.calledFor ??= 0;
        count++;
      }
      state.emit({ type: 'gathered', x: player.x, y: player.y, count });
    },
  },
};

function rule(effect: InstantEffect): InstantRule<InstantEffect> {
  return INSTANT_RULES[effect.type] as InstantRule<InstantEffect>;
}

export function instantValid(state: RunState, def: InstantDefinition): boolean {
  return rule(def.effect).valid(state, def, def.effect);
}

export function applyInstant(state: RunState, player: Player, def: InstantDefinition): void {
  rule(def.effect).apply(state, player, def.effect);
}
