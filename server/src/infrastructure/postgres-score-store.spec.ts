import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { checkSubmission, type ScoreEntry } from '../domain/score.js';
import { PostgresScoreStore } from './postgres-score-store.js';

/**
 * Against a real PostgreSQL when `DATABASE_URL` is set (CI's service, or `docker compose` locally); skipped otherwise.
 * The database is emptied first: point it at a throwaway one.
 */
const url = process.env['DATABASE_URL'];
const NOW = new Date('2026-10-22T12:00:00Z');

function entry(runId: string, changes: Record<string, unknown> = {}): ScoreEntry {
  const result = checkSubmission(
    {
      runId,
      board: 'solo',
      names: ['Ada'],
      godId: 'zeus',
      realmId: 'mount_olympus',
      players: 1,
      bots: 0,
      realmsCleared: 1,
      timeSeconds: 600,
      kills: 1000,
      level: 20,
      version: 'test',
      ...changes,
    },
    NOW,
  );
  if (!('entry' in result)) throw new Error(result.refusal);
  return result.entry;
}

describe.skipIf(!url)('PostgreSQL world boards (spec: world-leaderboards)', () => {
  let store: PostgresScoreStore;

  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: url });
    await admin.connect();
    await admin.query('drop table if exists scores, schema_migrations');
    await admin.end();
    store = await PostgresScoreStore.connect(url as string);
  });
  afterAll(async () => store?.close());

  it('migrates once, even when connected again', async () => {
    const again = await PostgresScoreStore.connect(url as string);
    await again.ping();
    await again.close();
  });

  it('adds each run once and ranks the best first, earliest first on a tie', async () => {
    expect(await store.add(entry('pg-run-0001'))).toBe('added');
    expect(await store.add(entry('pg-run-0001'))).toBe('duplicate');
    await store.add(entry('pg-run-0002', { kills: 3000, names: ['Bo', 'Cy'], board: 'solo' }));
    await store.add(entry('pg-run-0003'));
    const top = await store.top({ board: 'solo', limit: 10 });
    expect(top.map((e) => e.runId)).toEqual(['pg-run-0002', 'pg-run-0001', 'pg-run-0003']);
    expect(top[0]).toMatchObject({ names: ['Bo', 'Cy'], score: 3000 + 1200 + 200 + 1000 });
  });

  it('filters by god, keeps daily dates exact, and hides entries', async () => {
    await store.add(entry('pg-run-0004', { godId: 'hades' }));
    await store.add(entry('pg-run-0005', { board: 'daily', date: '2026-10-22' }));
    await store.add(entry('pg-run-0006', { board: 'daily', date: '2026-10-21' }));
    expect(
      (await store.top({ board: 'solo', godId: 'hades', limit: 10 })).map((e) => e.runId),
    ).toEqual(['pg-run-0004']);
    const today = await store.top({ board: 'daily', date: '2026-10-22', limit: 10 });
    expect(today.map((e) => [e.runId, e.date])).toEqual([['pg-run-0005', '2026-10-22']]);
    expect(await store.hide(today[0].id)).toBe(true);
    expect(await store.top({ board: 'daily', date: '2026-10-22', limit: 10 })).toEqual([]);
    expect(await store.hide('999999')).toBe(false);
    expect(await store.hide('not-an-id')).toBe(false);
  });
});
