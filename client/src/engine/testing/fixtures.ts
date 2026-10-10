import { CONTENT, MOUNT_OLYMPUS_ID } from './content';
import { Modifier } from '../core/stats';
import { GameContent, RealmDefinition } from '../data/types';
import { RunSimulation } from '../sim/run-simulation';
import { Enemy } from '../sim/types';

/**
 * Real content with a quiet, small Mount Olympus: no spawns, no events, no obstacles and a far-away boss, so tests
 * place exactly the enemies they need.
 */
export function quietContent(changes: Partial<RealmDefinition> = {}): GameContent {
  const realm = CONTENT.realms.find((r) => r.id === MOUNT_OLYMPUS_ID) as RealmDefinition;
  const quiet: RealmDefinition = {
    ...realm,
    map: {
      ...realm.map,
      widthTiles: 40,
      heightTiles: 40,
      maxObstacles: 0,
      pointsOfInterest: [],
      scatter: [],
      decorations: [],
      bossArena: { radius: 200, minDistanceFromSpawn: 900 },
    },
    timeline: [{ from: 0, rate: 0, maxAlive: 0, enemies: [{ id: 'satyr', weight: 1 }] }],
    events: [],
    boss: { ...realm.boss, at: 1e9 },
    ...changes,
  };
  return { ...CONTENT, realms: [quiet] };
}

export function quietSim(
  options: { seed?: number; modifiers?: Modifier[]; content?: GameContent } = {},
): RunSimulation {
  return new RunSimulation(
    {
      runId: 'test-run',
      godId: 'zeus',
      realmId: MOUNT_OLYMPUS_ID,
      seed: options.seed ?? 1,
      modifiers: options.modifiers ?? [],
    },
    options.content ?? quietContent(),
  );
}

/** Places an enemy relative to the player. */
export function spawnNear(
  sim: RunSimulation,
  enemyId: string,
  dx: number,
  dy: number,
  options: { elite?: boolean } = {},
): Enemy {
  const p = sim.state.players[0];
  const enemy = sim.state.spawnEnemy(sim.state.index.enemy(enemyId), p.x + dx, p.y + dy, options);
  if (!enemy) throw new Error('Enemy cap reached in test.');
  return enemy;
}

/** Removes the starting weapon, so only what a test adds can deal damage. */
export function disarm(sim: RunSimulation): void {
  sim.state.players[0].loadout.weapons.length = 0;
}

export { CONTENT };
