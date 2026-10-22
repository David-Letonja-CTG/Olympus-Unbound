import { describe, expect, it } from 'vitest';
import { MemoryScoreStore } from '../infrastructure/memory-score-store.js';
import { FakeClock, FakeSocket, framed } from '../testing/fakes.js';
import { Leaderboards } from './leaderboards.js';
import { RateLimiter } from './rate-limiter.js';
import { CLOSE, DEFAULT_LIMITS, RoomRelay, type Session } from './room-relay.js';

const VERSION = '0.11.1-r7';

function setUp(limits = DEFAULT_LIMITS) {
  const clock = new FakeClock();
  const relay = new RoomRelay(clock, limits);
  const connect = (address?: string) => {
    const socket = new FakeSocket(address);
    const session = relay.connect(socket) as Session;
    return { socket, session };
  };
  return { clock, relay, connect };
}

function hostAndGuest() {
  const ctx = setUp();
  const host = ctx.connect();
  host.session.onText(JSON.stringify({ t: 'host', code: 'K7M2Q', version: VERSION }));
  const guest = ctx.connect('198.51.100.4');
  guest.session.onText(JSON.stringify({ t: 'join', code: 'K7M2Q' }));
  return { ...ctx, host, guest };
}

describe('rooms through the server (spec: rooms / creating a room)', () => {
  it('opens a room by code and pairs a guest with it', () => {
    const { host, guest } = hostAndGuest();
    expect(host.socket.texts[0]).toEqual({ t: 'hosting' });
    expect(guest.socket.last()).toEqual({ t: 'joined' });
    expect(host.socket.last()).toEqual({ t: 'guest', guest: 1 });
  });

  it('passes messages on unread, numbered by guest on the host side', () => {
    const { host, guest } = hostAndGuest();
    guest.session.onBinary(new Uint8Array([1, 2, 3]));
    expect(host.socket.binaries.at(-1)).toEqual(framed(1, [1, 2, 3]));
    host.session.onBinary(framed(1, [9, 8]));
    expect(guest.socket.binaries.at(-1)).toEqual(new Uint8Array([9, 8]));
    // To a guest who is not there: nothing happens.
    host.session.onBinary(framed(7, [5]));
    expect(guest.socket.binaries).toHaveLength(1);
  });

  it('refuses a code in use and an unknown code', () => {
    const { connect } = hostAndGuest();
    const second = connect('192.0.2.9');
    second.session.onText(JSON.stringify({ t: 'host', code: 'K7M2Q', version: VERSION }));
    expect(second.socket.last()).toEqual({ t: 'error', reason: 'taken' });
    expect(second.socket.closed?.code).toBe(CLOSE.error);
    const lost = connect('192.0.2.10');
    lost.session.onText(JSON.stringify({ t: 'join', code: 'ZZZZZ' }));
    expect(lost.socket.last()).toEqual({ t: 'error', reason: 'not-found' });
  });

  it('refuses malformed control messages', () => {
    const { connect } = setUp();
    const a = connect();
    a.session.onText('not json');
    expect(a.socket.last()).toEqual({ t: 'error', reason: 'bad-request' });
    const b = connect();
    b.session.onText(JSON.stringify({ t: 'host', code: 'bad', version: VERSION }));
    expect(b.socket.last()).toEqual({ t: 'error', reason: 'bad-request' });
  });

  it('ends the room with its host: guests are told the host closed it (spec: game-server)', () => {
    const { relay, host, guest } = hostAndGuest();
    host.session.onClose();
    expect(guest.socket.closed).toEqual({ code: CLOSE.hostLeft, reason: 'host-left' });
    expect(relay.roomCount).toBe(0);
  });

  it('tells the host when a guest leaves, and lets the host drop a guest', () => {
    const { connect, host, guest } = hostAndGuest();
    guest.session.onClose();
    expect(host.socket.last()).toEqual({ t: 'gone', guest: 1 });
    const other = connect('192.0.2.20');
    other.session.onText(JSON.stringify({ t: 'join', code: 'K7M2Q' }));
    expect(host.socket.last()).toEqual({ t: 'guest', guest: 2 });
    host.session.onText(JSON.stringify({ t: 'drop', guest: 2 }));
    expect(other.socket.closed?.code).toBe(CLOSE.dropped);
  });
});

describe('limits (spec: game-server / limits)', () => {
  it('closes a client that floods, and the room plays on', () => {
    const { host, guest, connect } = hostAndGuest();
    for (let i = 0; i < DEFAULT_LIMITS.framesPerWindow + 1; i++)
      guest.session.onBinary(new Uint8Array([i % 256]));
    expect(guest.socket.closed?.code).toBe(CLOSE.tooFast);
    expect(host.socket.closed).toBeUndefined();
    // Another guest still gets through.
    const other = connect('192.0.2.30');
    other.session.onText(JSON.stringify({ t: 'join', code: 'K7M2Q' }));
    other.session.onBinary(new Uint8Array([1]));
    expect(host.socket.binaries.at(-1)).toEqual(framed(2, [1]));
  });

  it('lets the rate refill with time', () => {
    const { clock, host, guest } = hostAndGuest();
    for (let i = 0; i < DEFAULT_LIMITS.framesPerWindow - 2; i++)
      guest.session.onBinary(new Uint8Array([1]));
    clock.advance(DEFAULT_LIMITS.windowMs);
    for (let i = 0; i < DEFAULT_LIMITS.framesPerWindow - 2; i++)
      guest.session.onBinary(new Uint8Array([1]));
    expect(guest.socket.closed).toBeUndefined();
    expect(host.socket.closed).toBeUndefined();
  });

  it('refuses oversized frames and too many connections from one address', () => {
    const { guest, connect } = hostAndGuest();
    guest.session.onBinary(new Uint8Array(DEFAULT_LIMITS.maxFrameBytes + 1));
    expect(guest.socket.closed?.code).toBe(CLOSE.tooBig);
    const sockets = Array.from({ length: DEFAULT_LIMITS.socketsPerAddress + 1 }, () =>
      connect('192.0.2.77'),
    );
    expect(sockets.at(-1)?.session).toBeUndefined();
    expect(sockets.at(-1)?.socket.closed?.code).toBe(CLOSE.tooMany);
    // Closing one frees a place.
    sockets[0].session.onClose();
    expect(connect('192.0.2.77').session).toBeDefined();
  });
});

describe('open rooms (spec: matchmaking)', () => {
  const listing = (players: number) => ({
    name: 'Ada',
    godId: 'zeus',
    realmId: 'mount_olympus',
    players,
    seats: 4,
  });

  it('lists public rooms of the same version with a free seat, fullest first', () => {
    const { relay, connect } = setUp();
    const open = (code: string, version: string, players: number | null, address: string) => {
      const host = connect(address);
      host.session.onText(JSON.stringify({ t: 'host', code, version }));
      if (players !== null)
        host.session.onText(JSON.stringify({ t: 'list', room: listing(players) }));
      return host;
    };
    open('AAAAA', VERSION, 1, '192.0.2.1');
    open('BBBBB', VERSION, 3, '192.0.2.2');
    open('CCCCC', VERSION, null, '192.0.2.3'); // private
    open('DDDDD', 'other', 2, '192.0.2.4'); // another version
    open('EEEEE', VERSION, 4, '192.0.2.5'); // full
    expect(relay.openRooms(VERSION).map((r) => r.code)).toEqual(['BBBBB', 'AAAAA']);
    expect(relay.openRooms(VERSION)[0]).toMatchObject({ name: 'Ada', players: 3, seats: 4 });
  });

  it('drops a room from the list when it is withdrawn or closes', () => {
    const { relay, connect } = setUp();
    const host = connect();
    host.session.onText(JSON.stringify({ t: 'host', code: 'AAAAA', version: VERSION }));
    host.session.onText(JSON.stringify({ t: 'list', room: listing(1) }));
    expect(relay.openRooms(VERSION)).toHaveLength(1);
    host.session.onText(JSON.stringify({ t: 'list', room: null }));
    expect(relay.openRooms(VERSION)).toHaveLength(0);
    host.session.onText(JSON.stringify({ t: 'list', room: listing(1) }));
    host.session.onClose();
    expect(relay.openRooms(VERSION)).toHaveLength(0);
  });

  it('refuses a listing from a guest or a malformed one', () => {
    const { host, guest } = hostAndGuest();
    guest.session.onText(JSON.stringify({ t: 'list', room: listing(1) }));
    expect(guest.socket.last()).toEqual({ t: 'error', reason: 'bad-request' });
    host.session.onText(JSON.stringify({ t: 'list', room: { name: 'x' } }));
    expect(host.socket.last()).toEqual({ t: 'error', reason: 'bad-request' });
  });
});

describe('world boards (spec: world-leaderboards)', () => {
  const run = (runId: string, changes: Record<string, unknown> = {}) => ({
    runId,
    board: 'solo',
    names: ['Ada'],
    godId: 'zeus',
    realmId: 'mount_olympus',
    players: 1,
    bots: 0,
    realmsCleared: 0,
    timeSeconds: 300,
    kills: 400,
    level: 10,
    version: VERSION,
    ...changes,
  });

  function boards() {
    const clock = new FakeClock();
    return { clock, boards: new Leaderboards(new MemoryScoreStore(clock), clock) };
  }

  it('takes each run once and ranks the best first', async () => {
    const { boards: b } = boards();
    expect(await b.submit(run('run-00000001'))).toEqual({ status: 'added', score: 1100 });
    expect(await b.submit(run('run-00000001'))).toEqual({ status: 'duplicate', score: 1100 });
    await b.submit(run('run-00000002', { kills: 900, names: ['Bo'] }));
    const top = await b.top({ board: 'solo' });
    expect('entries' in top && top.entries.map((e) => e.names[0])).toEqual(['Bo', 'Ada']);
  });

  it('filters by god and keeps daily boards apart by date', async () => {
    const { boards: b } = boards();
    await b.submit(run('run-00000001'));
    await b.submit(run('run-00000002', { godId: 'hades' }));
    await b.submit(run('run-00000003', { board: 'daily', date: '2026-10-22' }));
    await b.submit(run('run-00000004', { board: 'daily', date: '2026-10-21' }));
    const hades = await b.top({ board: 'solo', god: 'hades' });
    expect('entries' in hades && hades.entries.map((e) => e.godId)).toEqual(['hades']);
    const today = await b.top({ board: 'daily', date: '2026-10-22' });
    expect('entries' in today && today.entries.map((e) => e.runId)).toEqual(['run-00000003']);
    expect(await b.top({ board: 'daily' })).toEqual({ refusal: 'bad-query' });
    expect(await b.top({ board: 'best' })).toEqual({ refusal: 'bad-query' });
  });

  it('refuses impossible runs, and hides entries', async () => {
    const { boards: b } = boards();
    expect(await b.submit(run('run-00000001', { realmsCleared: 10 }))).toEqual({
      refusal: 'impossible',
    });
    await b.submit(run('run-00000002'));
    const before = await b.top({ board: 'solo' });
    const id = 'entries' in before ? before.entries[0].id : '';
    expect(await b.hide(id)).toBe(true);
    expect(await b.top({ board: 'solo' })).toEqual({ entries: [] });
    expect(await b.hide('nope')).toBe(false);
  });

  it('bounds the limit', async () => {
    const { boards: b } = boards();
    for (let i = 0; i < 60; i++) await b.submit(run(`run-${String(i).padStart(8, '0')}`));
    const many = await b.top({ board: 'solo', limit: '500' });
    expect('entries' in many && many.entries).toHaveLength(50);
    const few = await b.top({ board: 'solo', limit: '3' });
    expect('entries' in few && few.entries).toHaveLength(3);
  });
});

describe('rate limiter (spec: game-server / limits)', () => {
  it('allows a share per window and refills after it', () => {
    const clock = new FakeClock();
    const limiter = new RateLimiter(2, 1000, clock);
    expect([limiter.take('a'), limiter.take('a'), limiter.take('a')]).toEqual([true, true, false]);
    expect(limiter.take('b')).toBe(true);
    clock.advance(1000);
    expect(limiter.take('a')).toBe(true);
  });
});
