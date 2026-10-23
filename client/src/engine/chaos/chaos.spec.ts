import { describe, expect, it } from 'vitest';
import { spawnBoss } from '../bosses/boss';
import { killEnemy } from '../combat/damage';
import { validateContent } from '../data/content-index';
import { EncounterDefinition, GameContent } from '../data/types';
import { decodeSnapshot, encodeSnapshot } from '../net/snapshot';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { RunRules } from '../sim/run-state';
import { NO_INPUT, SimEvent } from '../sim/types';
import { playRun } from '../testing/autopilot';
import { MOUNT_OLYMPUS_ID } from '../testing/content';
import { CONTENT, disarm, quietContent, spawnNear } from '../testing/fixtures';
import { Encounter } from './encounter';

/** The quiet test realm with the real encounters and boons back (spec: director-of-chaos). */
function chaosContent(
  encounters: readonly EncounterDefinition[] = CONTENT.encounters,
): GameContent {
  return { ...quietContent(), encounters };
}

function chaosSim(
  options: {
    seed?: number;
    content?: GameContent;
    rules?: RunRules;
    players?: number;
    /** The Director chooses on its own; off by default, so tests start exactly what they force. */
    choosing?: boolean;
  } = {},
): RunSimulation {
  const party =
    options.players && options.players > 1
      ? Array.from({ length: options.players }, (_, i) => ({
          godId: 'zeus',
          name: `P${i + 1}`,
          modifiers: [],
        }))
      : undefined;
  const sim = new RunSimulation(
    {
      runId: 'chaos-test',
      godId: 'zeus',
      realmId: MOUNT_OLYMPUS_ID,
      seed: options.seed ?? 1,
      modifiers: [],
      rules: options.rules,
      party,
    },
    options.content ?? chaosContent(),
  );
  // The quiet realm is small: a small view leaves room to appear outside it.
  sim.setView(220, 160);
  sim.state.godMode = true;
  sim.chaos.enabled = options.choosing ?? false;
  return sim;
}

/** Steps `seconds` of the run, answering every choice with its first offer. */
function run(sim: RunSimulation, seconds: number, each?: () => void): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds / STEP) && sim.phase !== 'ended'; i++) {
    while (sim.phase === 'choosing') sim.choose(0);
    sim.step(
      STEP,
      sim.state.players.map(() => NO_INPUT),
    );
    events.push(...sim.events());
    each?.();
  }
  return events;
}

/** Starts an encounter through the debug command and returns it. */
function force(sim: RunSimulation, id: string): Encounter {
  sim.debug({ type: 'encounter', id });
  const enc = sim.chaos.active.find((e) => e.def.id === id);
  if (!enc) throw new Error(`${id} did not start`);
  return enc;
}

function def(id: string): EncounterDefinition {
  const found = CONTENT.encounters.find((e) => e.id === id);
  if (!found) throw new Error(id);
  return found;
}

const announced = (events: SimEvent[], text: string) =>
  events.some((e) => e.type === 'announcement' && e.text.includes(text));

describe('Director of Chaos content (spec: director-of-chaos)', () => {
  it('validates the real encounters and boons', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('rejects broken encounters', () => {
    const broken: EncounterDefinition[] = [
      {
        ...def('divine_shrine'),
        id: 'no_ending',
        outcomes: { received: def('divine_shrine').outcomes['received'] },
      },
      {
        ...def('divine_shrine'),
        id: 'bad_boon',
        behavior: {
          type: 'shrine',
          boons: ['no_such_boon'],
          seconds: 10,
          radius: 40,
          distance: 200,
        },
      },
      {
        ...def('champion_contract'),
        id: 'bad_contract',
        behavior: {
          type: 'contract',
          offers: 'monster_invasion',
          seconds: 20,
          radius: 54,
          distance: 280,
          risk: 'none',
          bonus: {},
        },
      },
      { ...def('monster_invasion'), id: 'no_warning', telegraph: 0.5 },
      { ...def('monster_invasion'), id: 'bad_band', pressure: { min: 0.8, max: 0.2 } },
    ];
    const errors = validateContent({ ...CONTENT, encounters: [...CONTENT.encounters, ...broken] });
    expect(errors).toContain('Encounter "no_ending" has no "faded" ending.');
    expect(errors).toContain('Encounter "bad_boon" offers unknown boon "no_such_boon".');
    expect(errors).toContain(
      'Encounter "bad_contract" must offer an encounter that only contracts start.',
    );
    expect(errors).toContain('Encounter "no_warning" is major: it warns at least 1 s.');
    expect(errors).toContain('Encounter "bad_band" has a pressure band outside 0–1 or reversed.');
  });
});

describe('selection and pacing (spec: director-of-chaos)', () => {
  it('tells the same story for the same seed', () => {
    const play = () => {
      const sim = new RunSimulation(
        { runId: 'a', godId: 'zeus', realmId: MOUNT_OLYMPUS_ID, seed: 7, modifiers: [] },
        CONTENT,
      );
      sim.state.godMode = true;
      playRun(sim, 360);
      const report = sim.directorReport();
      return {
        decisions: report.decisions,
        outcomes: report.outcomes,
        realm: report.realm,
        kills: sim.state.kills,
        x: sim.state.players[0].x,
      };
    };
    const a = play();
    expect(a.decisions.length).toBeGreaterThan(0);
    expect(play()).toEqual(a);
  }, 60_000);

  it('only looks: reporting every step changes nothing', () => {
    const play = (look: boolean) => {
      const sim = new RunSimulation(
        { runId: 'a', godId: 'athena', realmId: MOUNT_OLYMPUS_ID, seed: 3, modifiers: [] },
        CONTENT,
      );
      for (let i = 0; i < 150 / STEP; i++) {
        while (sim.phase === 'choosing') sim.choose(0);
        sim.step(STEP, [{ moveX: Math.sin(i / 90), moveY: Math.cos(i / 70), ability: true }]);
        if (look) sim.directorReport();
      }
      const p = sim.state.players[0];
      return [sim.state.kills, sim.state.time, p.x, p.y, p.health, sim.state.enemies.length];
    };
    expect(play(true)).toEqual(play(false));
  }, 60_000);

  it('keeps encounters to their realms', () => {
    const only = { ...def('divine_shrine'), realms: ['the_underworld'] };
    const sim = chaosSim({ content: chaosContent([only]) });
    sim.debug({ type: 'skipTo', seconds: 100 });
    run(sim, 1);
    expect(sim.chaos.reason(only)).toBe('realm');
  });

  it('starts nothing in the first quiet stretch, nor through contracts alone', () => {
    const sim = chaosSim({ choosing: true });
    run(sim, 30);
    expect(sim.chaos.reason(def('divine_shrine'))).toBe('too early');
    expect(sim.chaos.reason(def('champion_hunt'))).toBe('only by contract');
    expect(sim.chaos.active).toHaveLength(0);
  });

  it('allows one major encounter at a time, then waits out its cooldown', () => {
    const sim = chaosSim();
    sim.debug({ type: 'skipTo', seconds: 120 });
    const invasion = force(sim, 'monster_invasion');
    run(sim, 1);
    expect(sim.chaos.reason(def('roaming_elite'))).toBe('a major encounter is under way');
    expect(sim.chaos.reason(def('monster_invasion'))).toBe('under way');
    sim.chaos.cancel(invasion);
    run(sim, 55);
    expect(sim.chaos.reason(def('monster_invasion'))).toBe('cooldown');
    expect(
      sim.directorReport().encounters.find((e) => e.id === 'monster_invasion')?.cooldown,
    ).toBeGreaterThan(0);
  });

  it('holds majors back under pressure, and opens a recovery window when it lasts', () => {
    const sim = chaosSim();
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 120 });
    const p = sim.state.players[0];
    p.health = p.stats.maxHealth * 0.05;
    for (let i = 0; i < 90; i++)
      spawnNear(sim, 'satyr', Math.cos(i) * (80 + (i % 5) * 40), Math.sin(i) * (80 + (i % 5) * 40));
    run(sim, 1);
    const report = sim.directorReport();
    expect(report.pressure).toBeGreaterThan(0.72);
    expect(sim.chaos.reason(def('monster_invasion'))).toMatch(/^pressure/);
    // Relief is never held back by pressure.
    expect(sim.chaos.reason(def('divine_shrine'))).toBeUndefined();
    run(sim, 11);
    const later = sim.directorReport();
    expect(later.mood).toBe('recovery');
    expect(later.struggling).toBe(true);
    for (const e of sim.state.enemies) e.dead = true;
    run(sim, 2);
    expect(sim.chaos.reason(def('monster_invasion'))).toBe('recovery');
  });

  it('starts nothing when the run switches it off', () => {
    const sim = new RunSimulation(
      {
        runId: 'off',
        godId: 'zeus',
        realmId: MOUNT_OLYMPUS_ID,
        seed: 2,
        modifiers: [],
        rules: { director: false },
      },
      CONTENT,
    );
    sim.state.godMode = true;
    let sites = 0;
    for (let i = 0; i < 300 / STEP; i++) {
      while (sim.phase === 'choosing') sim.choose(0);
      sim.step(STEP, [NO_INPUT]);
      sites += sim.state.sites.length;
    }
    expect(sim.directorReport().decisions).toHaveLength(0);
    expect(sites).toBe(0);
    expect(sim.directorReport().encounters[0].reason).toBe('director off');
  }, 60_000);
});

describe('the encounter lifecycle (spec: director-of-chaos / encounter lifecycle)', () => {
  it('refuses transitions the lifecycle does not have', () => {
    const sim = chaosSim();
    const shrine = force(sim, 'divine_shrine');
    expect(shrine.phase).toBe('telegraph');
    expect(sim.chaos.transition(shrine, 'completed')).toBe(false);
    expect(sim.chaos.transition(shrine, 'resolving')).toBe(false);
    expect(shrine.phase).toBe('telegraph');
    run(sim, 2);
    expect(shrine.phase).toBe('active');
    expect(sim.chaos.transition(shrine, 'telegraph')).toBe(false);
  });

  it('repels an invasion in stages and rewards it once', () => {
    const sim = chaosSim();
    sim.chaos.realm.corruption = 50;
    const invasion = force(sim, 'monster_invasion');
    expect(sim.state.sites.map((s) => s.kind)).toEqual(['rift']);
    run(sim, 6.1);
    expect(invasion.phase).toBe('active');
    const first = invasion.enemies.length;
    expect(first).toBeGreaterThan(0);
    for (const e of sim.state.enemies) {
      const p = sim.state.players[0];
      expect(Math.hypot(e.x - p.x, e.y - p.y)).toBeGreaterThan(160);
    }
    const events = run(sim, 40, () => {
      for (const e of invasion.enemies) if (!e.dead) killEnemy(sim.state, e);
    });
    expect(invasion.enemies.length).toBeGreaterThan(first);
    expect(invasion.enemies.some((e) => e.elite)).toBe(true);
    expect(announced(events, 'The invasion is repelled!')).toBe(true);
    expect(invasion.phase).toBe('completed');
    expect(sim.chaos.realm.corruption).toBe(40);
    // Elites drop chests of their own: the encounter's chest is the one left where it ended.
    const chests = sim.state.pickups.filter((p) => p.kind === 'chest' && !p.dead);
    expect(chests.length).toBeGreaterThanOrEqual(1);
    const before = sim.state.pickups.length;
    expect(sim.chaos.settle(invasion)).toBe(false);
    expect(sim.state.pickups.length).toBe(before);
    expect(sim.state.sites).toHaveLength(0);
  });

  it('is overrun when time runs out, and the invaders stay', () => {
    const sim = chaosSim();
    disarm(sim);
    // Realm state is clamped: 95 + 20 is 100 (spec: director-of-chaos / realm state).
    sim.chaos.realm.corruption = 95;
    const invasion = force(sim, 'monster_invasion');
    const events = run(sim, 6 + 75 + 3);
    expect(invasion.phase).toBe('failed');
    expect(invasion.outcome).toBe('overrun');
    expect(announced(events, 'Corruption spreads')).toBe(true);
    expect(sim.chaos.realm.corruption).toBe(100);
    expect(invasion.enemies.some((e) => !e.dead && sim.state.enemies.includes(e))).toBe(true);
  });
});

describe('the eclipse (spec: director-of-chaos / eclipse of olympus)', () => {
  it('darkens, hastens, brings a champion and breaks when it falls', () => {
    const sim = chaosSim();
    sim.chaos.realm.corruption = 30;
    const eclipse = force(sim, 'eclipse_of_olympus');
    run(sim, 3);
    expect(sim.state.omen.darkness).toBeGreaterThan(0.1);
    expect(sim.state.omen.enemySpeed).toBe(1);
    run(sim, 3.1);
    expect(sim.state.omen).toEqual({ enemySpeed: 1.18, spawnRate: 1.5, darkness: 0.85 });
    run(sim, 9);
    expect(sim.state.sites.map((s) => s.kind)).toEqual(['arrival']);
    run(sim, 3.5);
    const champion = eclipse.enemies[0];
    expect(champion?.champion).toBe(true);
    killEnemy(sim.state, champion);
    const events = run(sim, 2.5);
    expect(announced(events, 'eclipse breaks')).toBe(true);
    expect(eclipse.phase).toBe('completed');
    expect(sim.state.omen).toEqual({ enemySpeed: 1, spawnRate: 1, darkness: 0 });
    expect(sim.chaos.realm.corruption).toBe(0);
    expect(sim.state.players[0].boons.map((b) => b.def.id)).toEqual(['fury_of_ares']);
  });

  it('restores everything when endured, and its champion withdraws', () => {
    const sim = chaosSim();
    const eclipse = force(sim, 'eclipse_of_olympus');
    const kills = () => sim.state.kills;
    run(sim, 6 + 50 + 2.5);
    expect(eclipse.outcome).toBe('endured');
    expect(eclipse.phase).toBe('completed');
    expect(sim.state.omen).toEqual({ enemySpeed: 1, spawnRate: 1, darkness: 0 });
    expect(eclipse.enemies[0]?.dead).toBe(true);
    expect(kills()).toBe(0);
  });

  it('is cancelled by a gate, leaving nothing behind and giving nothing', () => {
    const sim = chaosSim();
    const eclipse = force(sim, 'eclipse_of_olympus');
    run(sim, 7);
    expect(sim.state.omen.enemySpeed).toBe(1.18);
    sim.debug({ type: 'travel' });
    expect(eclipse.phase).toBe('cancelled');
    expect(sim.state.omen).toEqual({ enemySpeed: 1, spawnRate: 1, darkness: 0 });
    expect(sim.state.sites).toHaveLength(0);
    expect(sim.state.pendingChests).toBe(0);
    expect(sim.directorReport().outcomes.at(-1)).toMatchObject({
      id: 'eclipse_of_olympus',
      phase: 'cancelled',
    });
    // A deeper realm is more corrupt.
    expect(sim.chaos.realm.corruption).toBe(CONTENT.balance.director.corruptionPerRealm);
  });
});

describe('hunters and the chain (spec: director-of-chaos / roaming elite and the vengeful hunter)', () => {
  it('escapes once, remembered as a grudge; the vengeful hunter clears it', () => {
    const sim = chaosSim();
    disarm(sim);
    sim.debug({ type: 'skipTo', seconds: 100 });
    run(sim, 1);
    expect(sim.chaos.reason(def('vengeful_hunter'))).toBe('needs a grudge');
    const hunt = force(sim, 'roaming_elite');
    let most = 0;
    const events = run(sim, 4 + 60 + 2.5, () => {
      most = Math.max(most, sim.state.enemies.filter((e) => e.champion && !e.dead).length);
    });
    expect(most).toBe(1);
    expect(hunt.outcome).toBe('escaped');
    expect(hunt.phase).toBe('failed');
    expect(events.some((e) => e.type === 'escaped')).toBe(true);
    expect(sim.state.kills).toBe(0);
    expect(sim.chaos.realm).toEqual({ corruption: 15, grudge: 1 });
    expect(sim.chaos.reason(def('vengeful_hunter'))).not.toBe('needs a grudge');

    const vengeance = force(sim, 'vengeful_hunter');
    run(sim, 5.1);
    const hunter = vengeance.enemies[0];
    expect(hunter.champion).toBe(true);
    killEnemy(sim.state, hunter);
    run(sim, 2.5);
    expect(vengeance.phase).toBe('completed');
    expect(sim.chaos.realm).toEqual({ corruption: 0, grudge: 0 });
    expect(sim.state.pickups.filter((p) => p.kind === 'chest').length).toBeGreaterThanOrEqual(2);
  });

  it('spreads corruption on a second escape, which brings the eclipse', () => {
    const sim = chaosSim();
    disarm(sim);
    sim.chaos.realm.corruption = 15;
    sim.chaos.realm.grudge = 1;
    const vengeance = force(sim, 'vengeful_hunter');
    run(sim, 5 + 75 + 2.5);
    expect(vengeance.outcome).toBe('escaped');
    expect(sim.chaos.realm.corruption).toBe(35);
    expect(sim.chaos.reason(def('eclipse_of_olympus'))).not.toMatch(/needs corruption/);
  });

  it('attacks with warnings and stands still while they fill', () => {
    const sim = chaosSim();
    const hunt = force(sim, 'roaming_elite');
    run(sim, 4.1);
    const hunter = hunt.enemies[0];
    const p = sim.state.players[0];
    hunter.x = p.x + 150;
    hunter.y = p.y;
    let warned = false;
    run(sim, 6, () => {
      if (sim.state.hazards.length > 0) {
        warned = true;
        expect(hunter.speed).toBe(0);
      }
    });
    expect(warned).toBe(true);
  });

  it('is called off by the boss while still a warning', () => {
    const sim = chaosSim();
    sim.debug({ type: 'skipTo', seconds: 100 });
    const hunt = force(sim, 'roaming_elite');
    run(sim, 1);
    spawnBoss(sim.state);
    run(sim, 0.1);
    expect(hunt.phase).toBe('cancelled');
    expect(sim.state.sites).toHaveLength(0);
    expect(sim.chaos.reason(def('vengeful_hunter'))).toBe('boss awake');
  });

  it('never changes a hunter for how the party plays', () => {
    const hunter = (dominant: boolean) => {
      const sim = chaosSim();
      sim.debug({ type: 'skipTo', seconds: 100 });
      if (dominant) run(sim, 30, () => (sim.state.kills += 1));
      else run(sim, 30);
      const hunt = force(sim, 'roaming_elite');
      run(sim, 4.1);
      const h = hunt.enemies[0];
      return { report: sim.directorReport(), stats: [h.maxHealth, h.damage, h.speed, h.def.id] };
    };
    const strong = hunter(true);
    const weak = hunter(false);
    expect(strong.report.dominant).toBe(true);
    expect(weak.report.dominant).toBe(false);
    expect(strong.stats).toEqual(weak.stats);
  });
});

describe('adaptive rules (spec: director-of-chaos / adaptive rules)', () => {
  it('nudges a choice at most once per interval, and says why', () => {
    const every = CONTENT.balance.director.adapt.every;
    let checked = false;
    for (let seed = 1; seed <= 12 && !checked; seed++) {
      const sim = chaosSim({ seed, choosing: true });
      sim.debug({ type: 'skipTo', seconds: 60 });
      // A party killing twenty monsters a second in calm air.
      run(sim, 400, () => {
        sim.state.kills += 1 / 3;
        // Encounters end at once, so the Director keeps choosing.
        for (const enc of [...sim.chaos.active])
          if (enc.phase !== 'resolving') sim.chaos.cancel(enc);
      });
      const decisions = sim.directorReport().decisions;
      const nudged = decisions.findIndex((d) => d.because.some((b) => b.startsWith('durable')));
      if (nudged < 0) continue;
      for (const later of decisions.slice(nudged + 1)) {
        if (later.time - decisions[nudged].time >= every) break;
        expect(later.because.filter((b) => !b.startsWith('again'))).toEqual([]);
      }
      checked = true;
    }
    expect(checked).toBe(true);
  }, 60_000);
});

describe('blessings and contracts (spec: director-of-chaos)', () => {
  it('blesses every living god at a shrine, for a while, paused or not', () => {
    const sim = chaosSim({ players: 2 });
    const shrine = force(sim, 'divine_shrine');
    run(sim, 1.6);
    const site = sim.state.sites[0];
    const [a, b] = sim.state.players;
    const before = [a.stats.might, a.stats.moveSpeed, a.stats.armor, a.stats.magnet];
    a.x = site.x;
    a.y = site.y;
    const events = run(sim, 0.1);
    expect(shrine.outcome).toBe('received');
    expect(events.filter((e) => e.type === 'blessed')).toHaveLength(2);
    const boon = a.boons[0];
    expect(b.boons.map((x) => x.def.id)).toEqual([boon.def.id]);
    expect([a.stats.might, a.stats.moveSpeed, a.stats.armor, a.stats.magnet]).not.toEqual(before);
    expect(sim.hud(b.id).boons[0]).toMatchObject({ id: boon.def.id, seconds: boon.def.seconds });
    // Paused, nothing counts down.
    const left = boon.left;
    sim.pause();
    run(sim, 30);
    expect(boon.left).toBe(left);
    sim.resume();
    run(sim, boon.def.seconds);
    expect(a.boons).toHaveLength(0);
    expect([a.stats.might, a.stats.moveSpeed, a.stats.armor, a.stats.magnet]).toEqual(before);
  });

  it('fades without penalty when nobody comes', () => {
    const sim = chaosSim();
    const contract = force(sim, 'champion_contract');
    const enemies = sim.state.enemies.length;
    const events = run(sim, 1.5 + 20 + 2.5);
    expect(contract.outcome).toBe('declined');
    expect(contract.phase).toBe('completed');
    expect(announced(events, 'The offer is withdrawn.')).toBe(true);
    expect(sim.chaos.realm).toEqual({ corruption: 0, grudge: 0 });
    expect(sim.state.enemies.length).toBe(enemies);
  });

  it('starts the offered encounter for the party when a god steps in, with the bonus', () => {
    const sim = chaosSim({ players: 2 });
    sim.chaos.realm.corruption = 60;
    const contract = force(sim, 'purge_contract');
    run(sim, 1.6);
    const hud = sim.hud().encounters[0];
    expect(hud.risk).toContain('invasion');
    expect(hud.reward).toContain('gold');
    const guest = sim.state.players[1];
    guest.x = contract.x;
    guest.y = contract.y;
    const accepted = run(sim, 0.1);
    expect(contract.outcome).toBe('accepted');
    // The acceptance is announced before what it starts.
    const texts = accepted.flatMap((e) => (e.type === 'announcement' ? [e.text] : []));
    expect(texts[0]).toBe('The purge begins!');
    expect(texts[1]).toMatch(/^The corrupted rift opens to the /);
    const purge = sim.chaos.active.find((e) => e.def.id === 'purge_invasion');
    expect(purge?.bonus).toEqual({ gold: 50, heal: 0.5 });
    run(sim, 5.1);
    run(sim, 60, () => {
      for (const e of purge?.enemies ?? []) if (!e.dead) killEnemy(sim.state, e);
    });
    expect(purge?.phase).toBe('completed');
    expect(sim.chaos.realm.corruption).toBe(20);
  });
});

describe('rooms and isolation (spec: director-of-chaos / rooms)', () => {
  it('shows a guest the eclipse, its marks and its champion', () => {
    const sim = chaosSim({ players: 2 });
    const eclipse = force(sim, 'eclipse_of_olympus');
    run(sim, 6.1 + 8.5);
    const guest = sim.state.players[1];
    expect(sim.hud(guest.id).encounters[0]).toMatchObject({
      id: 'eclipse_of_olympus',
      phase: 'active',
    });
    let snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), sim.state.index);
    expect(snap.darkness).toBeCloseTo(0.85, 2);
    expect(snap.sites).toHaveLength(1);
    expect(snap.sites[0]).toMatchObject({ kind: 'arrival', radius: sim.state.sites[0].radius });
    run(sim, 4);
    snap = decodeSnapshot(encodeSnapshot(sim.state, sim.phase), sim.state.index);
    const champion = eclipse.enemies[0];
    expect(snap.enemies.find((e) => e.id === champion.id)?.champion).toBe(true);
  });

  it('starts every run afresh', () => {
    const first = chaosSim();
    first.chaos.realm.corruption = 80;
    force(first, 'eclipse_of_olympus');
    run(first, 7);
    const second = chaosSim();
    expect(second.chaos.realm).toEqual({ corruption: 0, grudge: 0 });
    expect(second.chaos.active).toHaveLength(0);
    expect(second.state.omen).toEqual({ enemySpeed: 1, spawnRate: 1, darkness: 0 });
    expect(second.state.players[0].boons).toHaveLength(0);
  });

  it('describes an encounter on the HUD', () => {
    const sim = chaosSim();
    const invasion = force(sim, 'monster_invasion');
    expect(sim.hud().encounters[0]).toMatchObject({
      id: 'monster_invasion',
      phase: 'telegraph',
      major: true,
    });
    expect(sim.hud().encounters[0].objective).toMatch(/^Invaders come to the /);
    run(sim, 6.1);
    const view = sim.hud().encounters[0];
    expect(view.objective).toBe('Repel the invaders');
    expect(view.left).toBeGreaterThanOrEqual(invasion.enemies.length);
    expect(view.seconds).toBeGreaterThan(70);
  });
});

describe('markers (spec: director-of-chaos)', () => {
  it('count down their own time, whatever their encounter’s clock says', () => {
    const sim = chaosSim();
    force(sim, 'eclipse_of_olympus');
    run(sim, 6.1 + 8.5);
    const arrival = sim.state.sites[0];
    expect(arrival.kind).toBe('arrival');
    expect(arrival.left).toBeLessThanOrEqual(arrival.total);
    expect(arrival.left).toBeGreaterThan(0);
  });
});

describe('no room (spec: director-of-chaos / eclipse of olympus)', () => {
  it('goes on without a champion when none can come, marking its arrival once', () => {
    const sim = chaosSim();
    disarm(sim);
    // The monster cap is reached: no champion can be spawned.
    while (sim.state.enemies.length < CONTENT.balance.caps.enemies)
      spawnNear(sim, 'satyr', 400, 400 + sim.state.enemies.length);
    const eclipse = force(sim, 'eclipse_of_olympus');
    const marks = new Set<number>();
    run(sim, 6 + 50 + 2.5, () => {
      for (const site of sim.state.sites) marks.add(site.id);
    });
    expect(marks.size).toBe(1);
    expect(eclipse.enemies).toHaveLength(0);
    expect(eclipse.outcome).toBe('endured');
  });
});
