import { CONTENT, disarm, quietContent, quietSim, spawnNear } from '../testing/fixtures';
import { TerrainType } from '../data/types';
import { generateArena } from '../maps/generate-arena';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT, PlayerInput } from './types';

const RIGHT: PlayerInput = { ...NO_INPUT, moveX: 1 };

/** A quiet arena of one terrain everywhere, with this footing. */
function groundSim(footing?: TerrainType['footing']): RunSimulation {
  const quiet = quietContent();
  const realm = quiet.realms[0];
  const ground: TerrainType = { id: 'test_ground', color: 0x444444, footing };
  const map = {
    ...realm.map,
    terrain: {
      ...realm.map.terrain,
      types: [...realm.map.terrain.types, ground],
      bands: [{ below: 1.01, terrain: ground.id }],
      plaza: ground.id,
    },
  };
  const sim = quietSim({ content: { ...quiet, realms: [{ ...realm, map }] } });
  disarm(sim);
  return sim;
}

/** How far the god walks in `steps` steps of `input`. */
function walk(sim: RunSimulation, steps: number, input = RIGHT): number {
  const p = sim.state.players[0];
  const x = p.x;
  for (let i = 0; i < steps; i++) sim.step(STEP, [input]);
  return p.x - x;
}

describe('footing (spec: arena-generation / footing)', () => {
  it('slows a god wading through the bog to 80%', () => {
    const firm = walk(groundSim(), 60);
    const bog = walk(groundSim({ speed: 0.8 }), 60);
    expect(bog / firm).toBeCloseTo(0.8, 3);
  });

  it('slows a monster in the bog too', () => {
    const moved = (sim: RunSimulation) => {
      const e = spawnNear(sim, 'satyr', 400, 0);
      const x = e.x;
      for (let i = 0; i < 30; i++) sim.step(STEP, [NO_INPUT]);
      return x - e.x;
    };
    const ratio = moved(groundSim({ speed: 0.8 })) / moved(groundSim());
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(0.85);
  });

  it('lets a god on ice slide on after letting go, then stop', () => {
    const sim = groundSim({ grip: 0.06 });
    walk(sim, 60);
    expect(walk(sim, 10, NO_INPUT)).toBeGreaterThan(20);
    walk(sim, 180, NO_INPUT);
    expect(walk(sim, 10, NO_INPUT)).toBe(0);
    // Firm ground: the god stops at once.
    const firm = groundSim();
    walk(firm, 60);
    expect(walk(firm, 10, NO_INPUT)).toBe(0);
  });

  it('has the shallows on the Aegean Shore and the Cocytus in the Underworld', () => {
    for (const [realmId, terrainId] of [
      ['aegean_shore', 'shallows'],
      ['the_underworld', 'cocytus_ice'],
    ]) {
      const realm = CONTENT.realms.find((r) => r.id === realmId)!;
      for (let seed = 0; seed < 4; seed++) {
        const arena = generateArena(realm.map, seed);
        const type = arena.terrainTypes.indexOf(terrainId);
        expect(
          arena.terrain.filter((t) => t === type).length,
          `${realmId} ${seed}`,
        ).toBeGreaterThan(arena.terrain.length * 0.02);
      }
    }
  });
});
