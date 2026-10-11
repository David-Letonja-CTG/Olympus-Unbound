import { RealmDefinition } from '../data/types';

/** The gate to the next realm (spec: endless-run / the gate). */
export const GATE_RADIUS = 70;
/** Seconds a living god stands inside the gate to pass it. */
export const GATE_STAND_SECONDS = 2;
/** Seconds after opening at which the gate takes the party anyway. */
export const GATE_OPEN_SECONDS = 60;

/**
 * The realm a run reaches after clearing `depth` realms (spec: endless-run / chain of realms): content order from
 * the starting realm, wrapping around. Hosts and guests compute the same chain (D16).
 */
export function realmAt(
  realms: readonly RealmDefinition[],
  startId: string,
  depth: number,
): RealmDefinition {
  const start = Math.max(
    0,
    realms.findIndex((r) => r.id === startId),
  );
  return realms[(start + depth) % realms.length];
}

/** The arena seed of the realm at `depth`: the run's seed itself first, then a mix of seed and depth (D5). */
export function realmSeed(seed: number, depth: number): number {
  if (depth === 0) return seed;
  return (Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1) + Math.imul(depth, 0x85ebca6b)) >>> 0;
}
