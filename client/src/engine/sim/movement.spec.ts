import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { damagePlayer } from '../combat/damage';
import { STEP } from './run-simulation';
import { NO_INPUT, PlayerInput } from './types';

const RIGHT: PlayerInput = { moveX: 1, moveY: 0, ability: false };

function setup() {
  const sim = quietSim();
  disarm(sim);
  // Past the start's invulnerability.
  for (let i = 0; i < 70; i++) sim.step(STEP, [NO_INPUT]);
  return { sim, p: sim.state.players[0], rules: sim.state.balance.stamina };
}

describe('stamina, sprint and dash (spec: player-control / stamina, sprint and dash)', () => {
  it('sprints 55% faster while stamina lasts, and stamina drains', () => {
    const { sim, p } = setup();
    p.stats = { ...p.stats, moveSpeed: 200 };
    const x = p.x;
    for (let i = 0; i < 60; i++) sim.step(STEP, [{ ...RIGHT, sprint: true }]);
    expect(p.x - x).toBeCloseTo(310, 0);
    expect(p.stamina).toBeCloseTo(70, 0);
  });

  it('walks at walking speed with no stamina left', () => {
    const { sim, p } = setup();
    p.stats = { ...p.stats, moveSpeed: 200 };
    p.stamina = 0;
    const x = p.x;
    for (let i = 0; i < 30; i++) sim.step(STEP, [{ ...RIGHT, sprint: true }]);
    expect(p.x - x).toBeCloseTo(100, 0);
  });

  it('dashes about 150 units, costs 35 stamina and takes no damage on the way', () => {
    const { sim, p, rules } = setup();
    const x = p.x;
    const health = p.health;
    sim.step(STEP, [{ ...RIGHT, dash: true }]);
    expect(p.stamina).toBeCloseTo(rules.max - rules.dashCost, 5);
    expect(sim.events().some((e) => e.type === 'dash' && e.playerId === p.id)).toBe(true);
    damagePlayer(sim.state, p, 50);
    expect(p.health).toBe(health);
    for (let i = 0; i < 20; i++) sim.step(STEP, [NO_INPUT]);
    expect(p.x - x).toBeGreaterThan(140);
    expect(p.x - x).toBeLessThan(160);
  });

  it('dashes the way the god faces when standing still', () => {
    const { sim, p } = setup();
    p.facingX = 0;
    p.facingY = -1;
    const y = p.y;
    sim.step(STEP, [{ ...NO_INPUT, dash: true }]);
    for (let i = 0; i < 20; i++) sim.step(STEP, [NO_INPUT]);
    expect(y - p.y).toBeGreaterThan(140);
  });

  it('does not dash without enough stamina, nor again during the recovery', () => {
    const { sim, p, rules } = setup();
    p.stamina = rules.dashCost - 1;
    const x = p.x;
    sim.step(STEP, [{ ...NO_INPUT, dash: true }]);
    expect(p.x).toBe(x);
    p.stamina = rules.max;
    sim.step(STEP, [{ ...NO_INPUT, dash: true }]);
    const afterFirst = p.stamina;
    sim.step(STEP, [{ ...NO_INPUT, dash: true }]);
    expect(p.stamina).toBe(afterFirst);
  });

  it('refills stamina after a pause', () => {
    const { sim, p, rules } = setup();
    p.stamina = 10;
    for (let i = 0; i < 60 * 4; i++) sim.step(STEP, [NO_INPUT]);
    expect(p.stamina).toBe(rules.max);
  });

  it('a dash still collides with the world', () => {
    const { sim, p } = setup();
    const right = sim.state.arena.bounds.maxX;
    p.x = p.px = right - 20;
    sim.step(STEP, [{ ...RIGHT, dash: true }]);
    for (let i = 0; i < 20; i++) sim.step(STEP, [NO_INPUT]);
    expect(p.x).toBeLessThanOrEqual(right);
  });

  it('the ability is not on Shift: sprinting fires nothing', () => {
    const { sim, p } = setup();
    spawnNear(sim, 'satyr', 60, 0);
    sim.step(STEP, [{ ...NO_INPUT, sprint: true }]);
    expect(p.abilityTimer).toBe(0);
  });
});
