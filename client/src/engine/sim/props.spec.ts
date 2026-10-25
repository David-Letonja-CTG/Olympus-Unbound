import { CONTENT, disarm, quietContent, quietSim, spawnNear } from '../testing/fixtures';
import { MOUNT_OLYMPUS_ID } from '../testing/content';
import { RunSimulation, STEP } from './run-simulation';
import { NO_INPUT } from './types';

/** A quiet Olympus with its breakable props back. */
function propSim(): RunSimulation {
  const quiet = quietContent();
  const olympus = CONTENT.realms.find((r) => r.id === MOUNT_OLYMPUS_ID)!;
  const realm = { ...quiet.realms[0], map: { ...quiet.realms[0].map, props: olympus.map.props } };
  const sim = quietSim({ content: { ...quiet, realms: [realm] } });
  disarm(sim);
  return sim;
}

describe('breakable props (spec: arena-generation / breakable props)', () => {
  it('breaks a prop once when a god walks into it, with its shatter and its drops', () => {
    const sim = propSim();
    const { state } = sim;
    expect(state.arena.props.length).toBeGreaterThan(1);
    const prop = state.arena.props[0];
    const p = state.players[0];
    p.x = p.px = prop.x;
    p.y = p.py = prop.y;
    sim.step(STEP, [NO_INPUT]);
    expect(state.brokenProps & 1).toBe(1);
    expect(sim.events().filter((e) => e.type === 'propBroken')).toEqual([
      expect.objectContaining({ index: 0, x: prop.x, y: prop.y }),
    ]);
    sim.step(STEP, [NO_INPUT]);
    expect(sim.events().some((e) => e.type === 'propBroken')).toBe(false);
    expect(state.brokenProps).toBe(1);
  });

  it('drops gold and XP across a realm of props', () => {
    const sim = propSim();
    const { state } = sim;
    const p = state.players[0];
    const dropped: string[] = [];
    const spawn = state.spawnPickup.bind(state);
    state.spawnPickup = (kind, x, y, value) => {
      dropped.push(kind);
      spawn(kind, x, y, value);
    };
    for (const prop of state.arena.props) {
      p.x = p.px = prop.x;
      p.y = p.py = prop.y;
      // Drops collected on the spot may level the god up: choose and go on.
      while (sim.phase === 'choosing') sim.choose(0, sim.choiceFor(p.id)?.id);
      sim.step(STEP, [NO_INPUT]);
    }
    expect(state.brokenProps).toBe(2 ** state.arena.props.length - 1);
    expect(dropped).toContain('gold');
    expect(dropped).toContain('xp');
  });

  it('is left standing by enemies', () => {
    const sim = propSim();
    const { state } = sim;
    const prop = state.arena.props[1];
    const p = state.players[0];
    const e = spawnNear(sim, 'satyr', prop.x - p.x, prop.y - p.y);
    e.x = prop.x;
    e.y = prop.y;
    sim.step(STEP, [NO_INPUT]);
    expect(state.brokenProps).toBe(0);
  });
});
