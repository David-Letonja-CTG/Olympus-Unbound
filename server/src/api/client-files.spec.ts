import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Difficulty } from '../application/difficulty.js';
import { Leaderboards } from '../application/leaderboards.js';
import { RateLimiter } from '../application/rate-limiter.js';
import { RoomRelay } from '../application/room-relay.js';
import { MemoryDifficultyStore } from '../infrastructure/memory-difficulty-store.js';
import { MemoryScoreStore } from '../infrastructure/memory-score-store.js';
import { FakeClock } from '../testing/fakes.js';
import { buildApp } from './app.js';

/** A built game as the image holds it: index, entry pages, a hashed bundle, the worker's file list, an asset. */
const dir = mkdtempSync(join(tmpdir(), 'olympus-client-'));
const html = (title: string) =>
  `<html><head><title>${title}</title></head><body><app-root></app-root></body></html>`;
writeFileSync(join(dir, 'index.html'), html('game'));
writeFileSync(join(dir, 'challenge.html'), html('challenge'));
writeFileSync(join(dir, 'main-AB12cd_3.js'), 'console.log(1)');
writeFileSync(join(dir, 'ngsw.json'), '{}');
mkdirSync(join(dir, 'assets'));
writeFileSync(join(dir, 'assets', 'zeus.png'), 'png');
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function app() {
  const clock = new FakeClock();
  return buildApp({
    leaderboards: new Leaderboards(new MemoryScoreStore(clock), clock),
    difficulty: new Difficulty(new MemoryDifficultyStore()),
    relay: new RoomRelay(clock),
    scoreLimiter: new RateLimiter(30, 3_600_000, clock),
    allowedOrigins: '*',
    client: { dir },
  });
}

describe('the game at the server’s address (D21)', () => {
  it('serves the game at the site’s root, revalidated', async () => {
    const a = await app();
    const res = await a.inject('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<app-root>');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('gives shared addresses their own page, and other deep links the game', async () => {
    const a = await app();
    expect((await a.inject('/challenge?g=zeus&s=42')).body).toContain('<title>challenge</title>');
    const play = await a.inject('/play');
    expect(play.statusCode).toBe(200);
    expect(play.body).toContain('<title>game</title>');
  });

  it('caches hashed bundles for good and revalidates the rest', async () => {
    const a = await app();
    const bundle = await a.inject('/main-AB12cd_3.js');
    expect(bundle.statusCode).toBe(200);
    expect(bundle.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await a.inject('/ngsw.json')).headers['cache-control']).toBe('no-cache');
    expect((await a.inject('/assets/zeus.png')).statusCode).toBe(200);
  });

  it('answers 404 for a missing file and keeps the API first', async () => {
    const a = await app();
    expect((await a.inject('/main-OLDOLD00.js')).statusCode).toBe(404);
    expect((await a.inject('/api/nope')).statusCode).toBe(404);
    expect((await a.inject('/health')).json()).toMatchObject({ ok: true });
    expect((await a.inject('/api/rooms?version=v1')).json()).toEqual({ rooms: [] });
  });
});
