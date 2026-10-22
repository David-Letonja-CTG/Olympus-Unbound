import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { StoredScore } from '../application/ports.js';
import type { Leaderboards } from '../application/leaderboards.js';
import type { RateLimiter } from '../application/rate-limiter.js';
import type { RoomRelay } from '../application/room-relay.js';
import { isVersion } from '../domain/ids.js';
import { serveClient, type ClientFilesOptions } from './client-files.js';

export interface AppOptions {
  readonly leaderboards: Leaderboards;
  readonly relay: RoomRelay;
  /** Runs sent per address per hour (spec: game-server / limits). */
  readonly scoreLimiter: RateLimiter;
  /** Origins allowed to call the API (the game's site); `'*'` for any (development). */
  readonly allowedOrigins: readonly string[] | '*';
  /** Hides entries (spec: world-leaderboards / fair scores); no admin route without it. */
  readonly adminToken?: string;
  /** Behind Caddy: the client's address comes from `X-Forwarded-For`. */
  readonly trustProxy?: boolean;
  /** Checks what the server depends on (the database) for `/health`. */
  readonly health?: () => Promise<void>;
  readonly logger?: boolean;
  /** The built game, served at this address too (D21); absent in development and tests. */
  readonly client?: ClientFilesOptions;
}

/** A board entry as the game shows it (spec: world-leaderboards / world tables). */
function publicEntry(e: StoredScore, rank: number) {
  return {
    id: e.id,
    rank,
    names: e.names,
    godId: e.godId,
    realmId: e.realmId,
    players: e.players,
    bots: e.bots,
    realmsCleared: e.realmsCleared,
    timeSeconds: e.timeSeconds,
    kills: e.kills,
    level: e.level,
    score: e.score,
    date: e.date,
    endedAt: e.endedAt,
  };
}

/**
 * The HTTP API (D21): health, open rooms (spec: matchmaking), world boards (spec: world-leaderboards). The `/rooms`
 * WebSocket is attached to the same server (rooms-socket.ts).
 */
export async function buildApp(o: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: o.logger ?? false,
    trustProxy: o.trustProxy ?? false,
    bodyLimit: 4096,
  });
  await app.register(cors, {
    origin: o.allowedOrigins === '*' ? true : [...o.allowedOrigins],
    methods: ['GET', 'POST'],
    maxAge: 600,
  });

  app.get('/health', async (_req, reply) => {
    try {
      await o.health?.();
      return { ok: true, rooms: o.relay.roomCount };
    } catch {
      return reply.code(503).send({ ok: false });
    }
  });

  app.get<{ Querystring: { version?: string } }>('/api/rooms', async (req, reply) => {
    const version = req.query.version;
    if (!isVersion(version)) return reply.code(400).send({ code: 'bad-query' });
    return { rooms: o.relay.openRooms(version) };
  });

  app.post('/api/scores', async (req, reply) => {
    if (!o.scoreLimiter.take(req.ip)) return reply.code(429).send({ code: 'too-many' });
    const result = await o.leaderboards.submit(req.body);
    if ('refusal' in result) return reply.code(400).send({ code: result.refusal });
    return result;
  });

  app.get<{
    Params: { board: string };
    Querystring: { date?: string; god?: string; limit?: string };
  }>('/api/leaderboards/:board', async (req, reply) => {
    const result = await o.leaderboards.top({ board: req.params.board, ...req.query });
    if ('refusal' in result) return reply.code(400).send({ code: result.refusal });
    reply.header('Cache-Control', 'no-cache');
    return { entries: result.entries.map((e, i) => publicEntry(e, i + 1)) };
  });

  if (o.adminToken) {
    const token = o.adminToken;
    app.post<{ Params: { id: string } }>('/api/admin/scores/:id/hide', async (req, reply) => {
      if (req.headers.authorization !== `Bearer ${token}`) return reply.code(401).send();
      return reply.code((await o.leaderboards.hide(req.params.id)) ? 204 : 404).send();
    });
  }

  if (o.client) await serveClient(app, o.client);

  return app;
}
