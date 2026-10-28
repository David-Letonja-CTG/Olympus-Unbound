import { spawnBoss } from '../bosses/boss';
import { damagePlayer } from '../combat/damage';
import { ContentIndex } from '../data/content-index';
import { decodeSnapshot, encodeSnapshot } from '../net/snapshot';
import { CONTENT } from '../testing/content';
import { disarm, quietSim, spawnNear } from '../testing/fixtures';
import { useAbility } from '../weapons/weapon-system';
import { STEP } from './run-simulation';
import { NO_INPUT } from './types';

// What the view needs for the god's body language and a boss's last phase (spec: player-control / the god's body
// language, boss-encounter / the final phase shows): recorded by the rules, never read by them.
describe('body language state', () => {
  it('records the direction a blow pushes the god, from where it came', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    p.invulnerable = 0;
    damagePlayer(sim.state, p, 1, p.x + 30, p.y);
    expect(p.hurtX).toBeCloseTo(-1);
    expect(p.hurtY).toBeCloseTo(0);
  });

  it('pushes the god back against its facing when the blow has no place', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    p.invulnerable = 0;
    p.facingX = -1;
    damagePlayer(sim.state, p, 1);
    expect([p.hurtX, p.hurtY]).toEqual([1, 0]);
  });

  it('counts the ability casts, wrapping at 256', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    spawnNear(sim, CONTENT.enemies[0].id, 60, 0);
    p.casts = 255;
    expect(useAbility(sim.state, p)).toBe(true);
    expect(p.casts).toBe(0);
    expect(useAbility(sim.state, p)).toBe(false);
    expect(p.casts).toBe(0);
  });

  it('marks a boss in its last phase, and a guest sees it', () => {
    const sim = quietSim();
    disarm(sim);
    sim.state.godMode = true;
    const boss = spawnBoss(sim.state);
    if (!boss?.boss) throw new Error('No boss.');
    sim.step(STEP, [NO_INPUT]);
    expect(boss.boss.final).toBe(false);
    boss.health = boss.maxHealth * 0.05;
    sim.step(STEP, [NO_INPUT]);
    expect(boss.boss.final).toBe(true);
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), new ContentIndex(CONTENT));
    expect(snap.enemies.find((e) => e.id === boss.id)?.boss?.final).toBe(true);
  });

  it('reach a guest: the push, the casts and the dash', () => {
    const sim = quietSim();
    const p = sim.state.players[0];
    p.hurtX = 0.6;
    p.hurtY = -0.8;
    p.casts = 17;
    p.dashTime = 0.1;
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), new ContentIndex(CONTENT));
    const got = snap.players[0];
    expect(got.hurtX).toBeCloseTo(0.6, 1);
    expect(got.hurtY).toBeCloseTo(-0.8, 1);
    expect(got.casts).toBe(17);
    expect(got.dashTime).toBeGreaterThan(0);
  });
});
