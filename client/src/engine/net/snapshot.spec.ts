import { ContentIndex } from '../data/content-index';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { autopilot } from '../testing/autopilot';
import { CONTENT } from '../testing/content';
import { NO_INPUT } from '../sim/types';
import { addCompanion } from '../sim/companions';
import { decodeSnapshot, encodeSnapshot } from './snapshot';

const index = new ContentIndex(CONTENT);

/** A busy two-player run: enemies, projectiles and pickups everywhere. */
function busyRun(seconds: number): RunSimulation {
  const sim = new RunSimulation(
    {
      runId: 'net',
      godId: 'zeus',
      realmId: 'mount_olympus',
      seed: 11,
      modifiers: [],
      party: [
        { godId: 'zeus', name: 'Host', modifiers: [] },
        { godId: 'poseidon', name: 'Guest', modifiers: [] },
      ],
    },
    index,
  );
  sim.setView(720, 420);
  sim.debug({ type: 'godMode', enabled: true });
  for (let i = 0; i < seconds * 60; i++) {
    if (sim.phase === 'choosing') sim.choose(0, sim.choiceFor(sim.state.players[0].id)?.id);
    if (sim.phase === 'choosing') sim.choose(0, sim.choiceFor(sim.state.players[1].id)?.id);
    const input = autopilot(sim);
    sim.step(STEP, [input, input]);
  }
  sim.debug({ type: 'spawnStress', count: 150 });
  sim.step(STEP, [NO_INPUT, NO_INPUT]);
  return sim;
}

describe('snapshots (spec: rooms / one authoritative game)', () => {
  it('carry everything the views draw, to a quarter pixel', () => {
    const sim = busyRun(90);
    const state = sim.state;
    expect(state.enemies.length).toBeGreaterThan(100);
    expect(state.projectiles.length).toBeGreaterThan(0);
    const snap = decodeSnapshot(encodeSnapshot(state, sim.phase), index);

    expect(snap.time).toBe(state.time);
    expect(snap.phase).toBe(sim.phase);
    expect(snap.players.map((p) => [p.id, p.god.id, p.alive])).toEqual(
      state.players.map((p) => [p.id, p.god.id, p.alive]),
    );
    expect(snap.players[1].moveSpeed).toBeCloseTo(state.players[1].stats.moveSpeed, 3);
    expect(snap.enemies.map((e) => [e.id, e.def.id, e.elite, e.dead])).toEqual(
      state.enemies.map((e) => [e.id, e.def.id, e.elite, e.dead]),
    );
    for (const [i, e] of state.enemies.entries()) {
      const d = snap.enemies[i];
      expect(Math.abs(d.x - e.x)).toBeLessThanOrEqual(0.125);
      expect(Math.abs(d.y - e.y)).toBeLessThanOrEqual(0.125);
      expect(d.health).toBeCloseTo(e.health / e.maxHealth, 2);
      expect(d.facing).toBe(e.facing < 0 ? -1 : 1);
    }
    expect(snap.projectiles.map((p) => [p.id, p.sprite, p.source.element])).toEqual(
      state.projectiles.map((p) => [p.id, p.sprite, p.source.element]),
    );
    for (const [i, p] of state.projectiles.entries()) {
      if (Math.hypot(p.vx, p.vy) === 0) continue;
      const want = Math.atan2(p.vy, p.vx);
      const got = Math.atan2(snap.projectiles[i].vy, snap.projectiles[i].vx);
      const diff = Math.abs(Math.atan2(Math.sin(want - got), Math.cos(want - got)));
      expect(diff).toBeLessThan(0.02);
    }
    expect(snap.pickups.map((p) => [p.id, p.kind, p.value])).toEqual(
      state.pickups.map((p) => [p.id, p.kind, Math.round(p.value)]),
    );
  });

  it('carry the broken props and the features, all 32 bits (spec: arena-generation / breakable props, map helpers)', () => {
    const sim = busyRun(1);
    for (const mask of [0, 5, 0x80000001, 0xffffffff]) {
      sim.state.brokenProps = mask;
      expect(decodeSnapshot(encodeSnapshot(sim.state, sim.phase), index).brokenProps).toBe(mask);
      sim.state.features = mask;
      expect(decodeSnapshot(encodeSnapshot(sim.state, sim.phase), index).features).toBe(mask);
    }
  });

  it('carry the boss and its telegraphs', () => {
    const sim = busyRun(1);
    sim.debug({ type: 'skipTo', seconds: 419 });
    const input = { moveX: 0, moveY: 0, ability: false };
    for (let i = 0; i < 60 * 12 && sim.state.hazards.length === 0; i++)
      sim.step(STEP, [input, input]);
    const boss = sim.state.boss;
    expect(boss).toBeDefined();
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), index);
    expect(snap.bossId).toBe(boss?.id);
    const decoded = snap.enemies.find((e) => e.id === boss?.id);
    expect(decoded?.boss).toEqual({ enraged: false, exposed: 0 });
    expect(decoded?.def.visual.sprite).toBe(boss?.def.visual.sprite);
    expect(snap.hazards.length).toBe(sim.state.hazards.length);
    if (snap.hazards.length) {
      const h = sim.state.hazards[0];
      const progress = 1 - Math.max(0, h.timer) / h.warn;
      expect(1 - snap.hazards[0].timer / snap.hazards[0].warn).toBeCloseTo(progress, 1);
      expect(snap.hazards[0].radius).toBeCloseTo(h.radius, 3);
    }
  });

  it('carry the merchant and companions (spec: merchant)', () => {
    const sim = busyRun(1);
    const [host, guest] = sim.state.players;
    addCompanion(sim.state, guest, sim.state.index.companions.get('temple_serpent'));
    sim.state.merchant = { x: 1200.5, y: 900.25, radius: 60, leavesIn: 41.5, inside: new Set() };
    void host;
    const snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), index);
    expect(snap.merchant).toEqual({ x: 1200.5, y: 900.25, radius: 60, leavesIn: 41.5 });
    const c = sim.state.companions[0];
    expect(snap.companions).toHaveLength(1);
    expect(snap.companions[0]).toMatchObject({ id: c.id, ownerId: guest.id });
    expect(snap.companions[0].def.id).toBe('temple_serpent');
    expect(snap.companions[0].x).toBeCloseTo(c.x, 0);
  });

  it('stay small: under 20 bytes per enemy (design: bandwidth)', () => {
    const sim = busyRun(90);
    const s = sim.state;
    const bytes = encodeSnapshot(s, sim.phase).byteLength;
    const entities =
      s.enemies.length + s.projectiles.length + s.hostileProjectiles.length + s.pickups.length;
    expect(bytes / Math.max(1, entities)).toBeLessThan(20);
  });
});
