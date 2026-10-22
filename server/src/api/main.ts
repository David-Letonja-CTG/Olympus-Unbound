import { Leaderboards } from '../application/leaderboards.js';
import { systemClock, type ScoreStore } from '../application/ports.js';
import { RateLimiter } from '../application/rate-limiter.js';
import { RoomRelay } from '../application/room-relay.js';
import { MemoryScoreStore } from '../infrastructure/memory-score-store.js';
import { PostgresScoreStore } from '../infrastructure/postgres-score-store.js';
import { buildApp } from './app.js';
import { attachRoomsSocket } from './rooms-socket.js';

/**
 * Starts the game server (D21). Configuration comes from the environment (docs/hosting.md):
 *   PORT (8080), HOST (0.0.0.0), DATABASE_URL (none: boards in memory, for local play and tests),
 *   ALLOWED_ORIGINS (comma-separated; none: any), ADMIN_TOKEN, TRUST_PROXY (1 behind Caddy), SCORES_PER_HOUR (30),
 *   CLIENT_DIR (the built game, served too; the image sets it).
 */
async function main(): Promise<void> {
  const env = process.env;
  const port = Number(env['PORT'] ?? 8080);
  const host = env['HOST'] ?? '0.0.0.0';
  const origins = (env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const trustProxy = env['TRUST_PROXY'] === '1';

  let store: ScoreStore;
  let health: (() => Promise<void>) | undefined;
  let closeStore = async () => {};
  if (env['DATABASE_URL']) {
    const pg = await PostgresScoreStore.connect(env['DATABASE_URL']);
    store = pg;
    health = () => pg.ping();
    closeStore = () => pg.close();
  } else {
    console.warn(
      'No DATABASE_URL: world boards are kept in memory and lost when the server stops.',
    );
    store = new MemoryScoreStore(systemClock);
  }

  const relay = new RoomRelay(systemClock);
  const app = await buildApp({
    leaderboards: new Leaderboards(store, systemClock),
    relay,
    scoreLimiter: new RateLimiter(Number(env['SCORES_PER_HOUR'] ?? 30), 3_600_000, systemClock),
    allowedOrigins: origins.length ? origins : '*',
    adminToken: env['ADMIN_TOKEN'] || undefined,
    trustProxy,
    health,
    logger: true,
    client: env['CLIENT_DIR'] ? { dir: env['CLIENT_DIR'] } : undefined,
  });
  const closeRooms = attachRoomsSocket(app.server, relay, {
    allowedOrigins: origins.length ? origins : '*',
    trustProxy,
  });

  const stop = async () => {
    closeRooms();
    await app.close();
    await closeStore();
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());

  await app.listen({ port, host });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
