import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Leaderboards } from '../application/leaderboards.js';
import { RateLimiter } from '../application/rate-limiter.js';
import { CLOSE, RoomRelay } from '../application/room-relay.js';
import { MemoryScoreStore } from '../infrastructure/memory-score-store.js';
import { FakeClock } from '../testing/fakes.js';
import { buildApp, type AppOptions } from './app.js';
import { attachRoomsSocket } from './rooms-socket.js';

const VERSION = '0.11.1-r7';
const closers: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

async function server(changes: Partial<AppOptions> = {}) {
  const clock = new FakeClock();
  const relay = new RoomRelay(clock);
  const app = await buildApp({
    leaderboards: new Leaderboards(new MemoryScoreStore(clock), clock),
    relay,
    scoreLimiter: new RateLimiter(30, 3_600_000, clock),
    allowedOrigins: '*',
    ...changes,
  });
  const closeRooms = attachRoomsSocket(app.server, relay, {
    allowedOrigins: changes.allowedOrigins ?? '*',
    trustProxy: false,
  });
  closers.push(() => app.close(), closeRooms);
  return { app, relay };
}

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

describe('HTTP API (D21)', () => {
  it('answers its health check', async () => {
    const { app } = await server();
    const res = await app.inject('/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
    const sick = await server({ health: async () => Promise.reject(new Error('db down')) });
    expect((await sick.app.inject('/health')).statusCode).toBe(503);
  });

  it('takes a run, refuses an impossible one, and lists the board', async () => {
    const { app } = await server();
    const ok = await app.inject({
      method: 'POST',
      url: '/api/scores',
      payload: run('api-run-0001'),
    });
    expect(ok.json()).toEqual({ status: 'added', score: 1100 });
    const bad = await app.inject({
      method: 'POST',
      url: '/api/scores',
      payload: run('api-run-0002', { realmsCleared: 10 }),
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ code: 'impossible' });
    const board = await app.inject('/api/leaderboards/solo?limit=5');
    expect(board.json().entries).toEqual([
      expect.objectContaining({ rank: 1, names: ['Ada'], score: 1100, godId: 'zeus' }),
    ]);
    expect((await app.inject('/api/leaderboards/nope')).statusCode).toBe(400);
  });

  it('limits runs per address per hour', async () => {
    const { app } = await server({ scoreLimiter: new RateLimiter(2, 3_600_000, new FakeClock()) });
    const post = (id: string) =>
      app.inject({ method: 'POST', url: '/api/scores', payload: run(id) });
    expect((await post('api-run-0001')).statusCode).toBe(200);
    expect((await post('api-run-0002')).statusCode).toBe(200);
    expect((await post('api-run-0003')).statusCode).toBe(429);
  });

  it('hides an entry for an admin only', async () => {
    const { app } = await server({ adminToken: 'secret-token' });
    await app.inject({ method: 'POST', url: '/api/scores', payload: run('api-run-0001') });
    const id = (await app.inject('/api/leaderboards/solo')).json().entries[0].id as string;
    const url = `/api/admin/scores/${id}/hide`;
    expect((await app.inject({ method: 'POST', url })).statusCode).toBe(401);
    const hidden = await app.inject({
      method: 'POST',
      url,
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(hidden.statusCode).toBe(204);
    expect((await app.inject('/api/leaderboards/solo')).json().entries).toEqual([]);
  });

  it('has no admin route without a token', async () => {
    const { app } = await server();
    expect((await app.inject({ method: 'POST', url: '/api/admin/scores/1/hide' })).statusCode).toBe(
      404,
    );
  });

  it('allows the game site only, when origins are set', async () => {
    const { app } = await server({ allowedOrigins: ['https://example.github.io'] });
    const ok = await app.inject({
      url: '/health',
      headers: { origin: 'https://example.github.io' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('https://example.github.io');
    const other = await app.inject({ url: '/health', headers: { origin: 'https://evil.example' } });
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rooms WebSocket (spec: rooms, matchmaking)', () => {
  async function listening(changes: Partial<AppOptions> = {}) {
    const ctx = await server(changes);
    await ctx.app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = ctx.app.server.address() as AddressInfo;
    return { ...ctx, base: `127.0.0.1:${port}` };
  }

  /** A connected socket that records texts and binaries as they arrive. */
  async function client(base: string, origin?: string) {
    const ws = new WebSocket(`ws://${base}/rooms`, { headers: origin ? { origin } : {} });
    const texts: Record<string, unknown>[] = [];
    const binaries: Uint8Array[] = [];
    let closed: number | undefined;
    ws.on('message', (data, isBinary) => {
      const bytes = new Uint8Array(data as Buffer);
      if (isBinary) binaries.push(bytes);
      else texts.push(JSON.parse(Buffer.from(bytes).toString()) as Record<string, unknown>);
    });
    ws.on('close', (code) => (closed = code));
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    closers.push(() => ws.close());
    const until = async (check: () => boolean) => {
      for (let i = 0; i < 200 && !check(); i++) await new Promise((r) => setTimeout(r, 10));
      expect(check()).toBe(true);
    };
    return { ws, texts, binaries, closed: () => closed, until };
  }

  it('pairs a guest with a host by code and carries binary frames both ways', async () => {
    const { base } = await listening();
    const host = await client(base);
    host.ws.send(JSON.stringify({ t: 'host', code: 'K7M2Q', version: VERSION }));
    await host.until(() => host.texts.some((t) => t['t'] === 'hosting'));
    const guest = await client(base);
    guest.ws.send(JSON.stringify({ t: 'join', code: 'K7M2Q' }));
    await guest.until(() => guest.texts.some((t) => t['t'] === 'joined'));
    await host.until(() => host.texts.some((t) => t['t'] === 'guest'));

    guest.ws.send(new Uint8Array([1, 2, 3]));
    await host.until(() => host.binaries.length === 1);
    expect([...host.binaries[0]]).toEqual([1, 0, 0, 0, 1, 2, 3]);
    host.ws.send(new Uint8Array([1, 0, 0, 0, 7, 7]));
    await guest.until(() => guest.binaries.length === 1);
    expect([...guest.binaries[0]]).toEqual([7, 7]);

    host.ws.close();
    await guest.until(() => guest.closed() === CLOSE.hostLeft);
  });

  it('lists a public room over HTTP while it waits', async () => {
    const { app, base } = await listening();
    const host = await client(base);
    host.ws.send(JSON.stringify({ t: 'host', code: 'AAAAA', version: VERSION }));
    host.ws.send(
      JSON.stringify({
        t: 'list',
        room: { name: 'Ada', godId: 'zeus', realmId: 'mount_olympus', players: 1, seats: 4 },
      }),
    );
    await host.until(() => host.texts.some((t) => t['t'] === 'hosting'));
    await new Promise((r) => setTimeout(r, 50));
    const rooms = (await app.inject(`/api/rooms?version=${VERSION}`)).json().rooms;
    expect(rooms).toEqual([expect.objectContaining({ code: 'AAAAA', name: 'Ada', players: 1 })]);
    expect((await app.inject('/api/rooms?version=other')).json().rooms).toEqual([]);
    expect((await app.inject('/api/rooms')).statusCode).toBe(400);
  });

  it('refuses sockets from other sites when origins are set', async () => {
    const { base } = await listening({ allowedOrigins: ['https://example.github.io'] });
    const ok = await client(base, 'https://example.github.io');
    expect(ok.ws.readyState).toBe(WebSocket.OPEN);
    await expect(client(base, 'https://evil.example')).rejects.toThrow();
    // No browser, no origin (a tool or the smoke test): let in.
    const tool = await client(base);
    expect(tool.ws.readyState).toBe(WebSocket.OPEN);
  });
});
