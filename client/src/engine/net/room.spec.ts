import { ContentIndex } from '../data/content-index';
import { RunSimulation, STEP } from '../sim/run-simulation';
import { RunConfig } from '../sim/run-state';
import { NO_INPUT, PlayerInput, SimEvent } from '../sim/types';
import { CONTENT } from '../testing/content';
import { quietContent } from '../testing/fixtures';
import { memoryLinkPair } from '../testing/memory-link';
import { LocalDriver } from './driver';
import { GuestDriver } from './guest';
import { RoomHost } from './host';

const RIGHT: PlayerInput = { moveX: 1, moveY: 0, ability: false };
const noop = () => undefined;

function room(content = quietContent()) {
  const run: RunConfig = {
    runId: 'room-run',
    godId: 'zeus',
    realmId: 'mount_olympus',
    seed: 5,
    modifiers: [],
    party: [
      { godId: 'zeus', name: 'Host', modifiers: [] },
      { godId: 'hades', name: 'Guest', modifiers: [] },
    ],
  };
  const sim = new RunSimulation(run, content);
  sim.setView(720, 420);
  const link = memoryLinkPair();
  const host = new LocalDriver(sim, new RoomHost(sim, new Map([[1, link.a]])));
  const guest = new GuestDriver(new ContentIndex(content), run, 1, link.b);
  const hostEvents: SimEvent[] = [];
  const guestEvents: SimEvent[] = [];
  /** One frame on both ends, `frames` times, delivering messages in between. */
  const play = (frames: number, hostInput = NO_INPUT, guestInput = NO_INPUT) => {
    for (let i = 0; i < frames; i++) {
      guest.advance(STEP, [guestInput], noop);
      link.flush();
      host.advance(STEP, [hostInput], noop);
      link.flush();
      hostEvents.push(...host.events());
      guestEvents.push(...guest.events());
    }
  };
  return { sim, host, guest, link, play, hostEvents, guestEvents };
}

describe('rooms (spec: rooms)', () => {
  it('starts when every member has loaded', () => {
    const r = room();
    r.host.markLoaded();
    r.play(3);
    expect(r.host.started).toBe(false);
    expect(r.host.partyProgress).toBe(0.5);
    expect(r.sim.state.time).toBe(0);
    r.guest.markLoaded();
    r.play(10);
    expect(r.host.started).toBe(true);
    expect(r.guest.started).toBe(true);
    expect(r.sim.state.time).toBeGreaterThan(0);
    expect(r.guest.localId).toBe(r.sim.state.players[1].id);
  });

  it("moves the guest's god on the host, and at once on the guest's screen", () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(10);
    const hostSide = r.sim.state.players[1];
    const startX = hostSide.x;
    const guestStart = r.guest.focus().x;

    r.play(2, NO_INPUT, RIGHT); // drawn one step behind, as in a solo run
    expect(r.guest.focus().x).toBeGreaterThan(guestStart); // predicted, no round trip

    r.play(60, NO_INPUT, RIGHT);
    r.play(30); // stop and settle
    const speed = hostSide.stats.moveSpeed;
    expect(hostSide.x - startX).toBeGreaterThan(speed * 0.9);
    // The prediction ends where the host has the god.
    expect(Math.abs(r.guest.focus().x - hostSide.x)).toBeLessThan(1);
  });

  it('dashes and sprints the guest’s god on the host and on every screen (spec: player-control / dash in a room)', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(80); // past the start's invulnerability
    const hostSide = r.sim.state.players[1];
    const startX = hostSide.x;
    const guestStart = r.guest.focus().x;
    r.play(1, NO_INPUT, { ...RIGHT, dash: true });
    r.play(30);
    expect(hostSide.x - startX).toBeGreaterThan(140);
    expect(hostSide.stamina).toBeLessThan(r.sim.state.balance.stamina.max);
    expect(r.hostEvents.some((e) => e.type === 'dash' && e.playerId === hostSide.id)).toBe(true);
    expect(r.guestEvents.some((e) => e.type === 'dash')).toBe(true);
    expect(Math.abs(r.guest.focus().x - hostSide.x)).toBeLessThan(2);
    expect(r.guest.focus().x - guestStart).toBeGreaterThan(140);

    const sprintStart = hostSide.x;
    r.play(60, NO_INPUT, { ...RIGHT, sprint: true });
    r.play(30);
    expect(hostSide.x - sprintStart).toBeGreaterThan(hostSide.stats.moveSpeed * 1.3);
    expect(Math.abs(r.guest.focus().x - hostSide.x)).toBeLessThan(2);
  });

  it('lets a guest shop while the host waits (spec: merchant / shopping in a room)', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(10);
    r.sim.state.realmTime = r.sim.state.balance.merchant.arrivals[0] - 0.01;
    r.play(12); // the guest draws the world a little behind the host
    const merchant = r.sim.state.merchant;
    expect(merchant).toBeDefined();
    expect(r.guest.world.merchant?.x).toBeCloseTo(merchant?.x ?? 0, 0);
    const guestPlayer = r.sim.state.players[1];
    r.sim.state.gold = 500;
    guestPlayer.x = guestPlayer.px = merchant?.x ?? 0;
    guestPlayer.y = guestPlayer.py = merchant?.y ?? 0;
    r.play(6);
    const shop = [...r.guestEvents].reverse().find((e) => e.type === 'choice');
    expect(shop?.type === 'choice' && shop.choice.source).toBe('shop');
    expect(r.host.hud().waitingFor).toEqual(['Guest']);
    const choice = shop?.type === 'choice' ? shop.choice : undefined;
    const hound = choice?.offers.findIndex((o) => o.itemId === 'hound_of_the_underworld') ?? -1;
    r.guest.choose(choice?.id ?? -1, hound);
    r.play(6);
    expect(r.sim.state.companions.map((c) => c.ownerId)).toEqual([guestPlayer.id]);
    expect(r.sim.state.gold).toBe(330);
    const again = [...r.guestEvents].reverse().find((e) => e.type === 'choice');
    const next = again?.type === 'choice' ? again.choice : undefined;
    r.guest.choose(next?.id ?? -1, next?.offers.findIndex((o) => o.kind === 'leave') ?? -1);
    r.play(6);
    expect(r.sim.phase).toBe('playing');
    expect(r.guest.world.companions).toHaveLength(1);
  });

  it('gives each player their own choice and tells who the run waits for', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(10);
    r.sim.debug({ type: 'grantXp', amount: r.sim.state.xpToNext() });
    r.play(6);
    const [hostPlayer, guestPlayer] = r.sim.state.players;
    const hostChoices = r.hostEvents.filter((e) => e.type === 'choice');
    const guestChoices = r.guestEvents.filter((e) => e.type === 'choice');
    expect(hostChoices.map((e) => e.choice.playerId)).toEqual([hostPlayer.id]);
    expect(guestChoices.map((e) => e.choice.playerId)).toEqual([guestPlayer.id]);
    expect(r.guest.phase).toBe('choosing');

    const mine = hostChoices[0].type === 'choice' ? hostChoices[0].choice : undefined;
    r.host.choose(mine?.id ?? -1, 0);
    r.play(6);
    expect(r.host.hud().waitingFor).toEqual(['Guest']);
    expect(r.guest.hud()?.waitingFor).toEqual([]);

    // A guest cannot answer someone else's choice.
    r.guest.choose(mine?.id ?? -1, 1);
    r.play(3);
    expect(r.sim.phase).toBe('choosing');

    const theirs = guestChoices[0].type === 'choice' ? guestChoices[0].choice : undefined;
    r.guest.choose(theirs?.id ?? -1, 0);
    r.play(6);
    expect(r.sim.phase).toBe('playing');
    expect(r.guestEvents.some((e) => e.type === 'choiceResolved')).toBe(true);
    expect(r.hostEvents.filter((e) => e.type === 'choiceResolved')).toHaveLength(1);
  });

  it('forwards the fight to the guest', () => {
    const r = room(CONTENT);
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(60 * 20);
    const types = new Set(r.guestEvents.map((e) => e.type));
    expect(types.has('attack')).toBe(true);
    expect(r.guest.world.enemies.length).toBeGreaterThan(0);
    expect(r.guest.world.players).toHaveLength(2);
    expect(r.guest.hud()?.weapons[0].id).toBe('bident');
  });

  it('lets a guest leave while the run goes on', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(30);
    r.guest.abandon();
    r.play(5);
    const ended = r.guestEvents.find((e) => e.type === 'runEnded');
    expect(ended?.type === 'runEnded' && ended.result.outcome).toBe('abandoned');
    expect(ended?.type === 'runEnded' && ended.result.godId).toBe('hades');
    expect(r.sim.state.players[1].left).toBe(true);
    expect(r.sim.phase).toBe('playing');
    expect(
      r.hostEvents.some((e) => e.type === 'announcement' && e.text === 'Guest left the battle'),
    ).toBe(true);
  });

  it("ends the guest's run as abandoned when the host leaves, keeping their earnings", () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(30);
    r.sim.state.gold = 42;
    r.play(12);
    r.host.destroy();
    r.play(2);
    const ended = r.guestEvents.find((e) => e.type === 'runEnded');
    expect(ended?.type === 'runEnded' && ended.result).toMatchObject({
      outcome: 'abandoned',
      godId: 'hades',
      gold: 42,
      runId: 'room-run',
    });
  });

  it('sends every guest their own result when the run ends', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(30);
    r.host.abandon();
    r.play(2);
    const ended = r.guestEvents.filter((e) => e.type === 'runEnded');
    expect(ended).toHaveLength(1);
    expect(ended[0].type === 'runEnded' && ended[0].result.godId).toBe('hades');
    expect(ended[0].type === 'runEnded' && ended[0].result.loadout.weapons[0].id).toBe('bident');
  });

  it('keeps the pause menu local and the run going', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(10);
    expect(r.host.pause()).toBe(true);
    expect(r.guest.pause()).toBe(true);
    const t = r.sim.state.time;
    const x = r.sim.state.players[0].x;
    r.play(30, RIGHT, RIGHT);
    expect(r.sim.state.players[0].x).toBe(x); // no input while the menu is open
    expect(r.sim.state.time).toBeGreaterThan(t);
    expect(r.host.paused).toBe(true);
    expect(r.sim.phase).toBe('playing');
  });

  it('follows the host through a gate: same realm and arena, and the run waits for the guest (spec: endless-run)', () => {
    const r = room();
    r.host.markLoaded();
    r.guest.markLoaded();
    r.play(30);
    r.sim.debug({ type: 'travel' });
    r.play(3);
    // The host's scene rebuilds; until it has, nothing moves.
    expect(r.host.started).toBe(false);
    r.host.markLoaded();
    r.play(5);
    expect(r.guestEvents.filter((e) => e.type === 'realmEntered')).toHaveLength(1);
    expect(r.guest.arena).toEqual(r.sim.arena);
    expect(r.host.started).toBe(false); // waiting for the guest's new realm
    const t = r.sim.state.time;
    r.play(10);
    expect(r.sim.state.time).toBe(t);
    r.guest.markLoaded();
    r.play(10);
    expect(r.host.started).toBe(true);
    expect(r.guest.started).toBe(true);
    expect(r.sim.state.time).toBeGreaterThan(t);
    expect(r.guest.inspect().depth).toBe(1);
  });
});
