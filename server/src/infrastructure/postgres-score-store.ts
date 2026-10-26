import pg from 'pg';
import type { Board, ScoreEntry } from '../domain/score.js';
import type { DifficultyDial } from '../domain/difficulty.js';
import type { BoardQuery, DifficultyStore, ScoreStore, StoredScore } from '../application/ports.js';
import { MIGRATIONS } from './migrations.js';

interface ScoreRow {
  id: string;
  run_id: string;
  board: Board;
  board_date: string | null;
  names: string[];
  god_id: string;
  realm_id: string;
  players: number;
  bots: number;
  realms_cleared: number;
  time_seconds: number;
  kills: number;
  level: number;
  score: string;
  version: string;
  ended_at: Date;
}

/** World board entries in PostgreSQL (D21), and the difficulty dial in the same database (D23). */
export class PostgresScoreStore implements ScoreStore, DifficultyStore {
  private constructor(private readonly pool: pg.Pool) {}

  /** Connects and applies the migrations not applied yet. */
  static async connect(connectionString: string): Promise<PostgresScoreStore> {
    // Dates stay `YYYY-MM-DD` strings: no time zone may shift a Daily Trial's date.
    pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
    const pool = new pg.Pool({ connectionString, max: 10 });
    await migrate(pool);
    return new PostgresScoreStore(pool);
  }

  async add(e: ScoreEntry): Promise<'added' | 'duplicate'> {
    const result = await this.pool.query(
      `insert into scores (run_id, board, board_date, names, god_id, realm_id, players, bots,
         realms_cleared, time_seconds, kills, level, score, version)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       on conflict (run_id) do nothing`,
      [
        e.runId,
        e.board,
        e.date ?? null,
        e.names,
        e.godId,
        e.realmId,
        e.players,
        e.bots,
        e.realmsCleared,
        e.timeSeconds,
        e.kills,
        e.level,
        e.score,
        e.version,
      ],
    );
    return result.rowCount === 1 ? 'added' : 'duplicate';
  }

  async top(q: BoardQuery): Promise<StoredScore[]> {
    const result = await this.pool.query<ScoreRow>(
      `select * from scores
       where not hidden and board = $1
         and ($2::date is null or board_date = $2::date)
         and ($3::text is null or god_id = $3)
       order by score desc, ended_at asc, id asc
       limit $4`,
      [q.board, q.date ?? null, q.godId ?? null, q.limit],
    );
    return result.rows.map(toStored);
  }

  async hide(id: string): Promise<boolean> {
    if (!/^\d{1,18}$/.test(id)) return false;
    const result = await this.pool.query('update scores set hidden = true where id = $1', [id]);
    return result.rowCount === 1;
  }

  async getDifficulty(): Promise<DifficultyDial | undefined> {
    const result = await this.pool.query<{ value: DifficultyDial }>(
      "select value from settings where key = 'difficulty'",
    );
    return result.rows[0]?.value;
  }

  async setDifficulty(dial: DifficultyDial): Promise<void> {
    await this.pool.query(
      `insert into settings (key, value) values ('difficulty', $1)
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify(dial)],
    );
  }

  async ping(): Promise<void> {
    await this.pool.query('select 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function toStored(r: ScoreRow): StoredScore {
  return {
    id: String(r.id),
    runId: r.run_id,
    board: r.board,
    date: r.board_date ?? undefined,
    names: r.names,
    godId: r.god_id,
    realmId: r.realm_id,
    players: r.players,
    bots: r.bots,
    realmsCleared: r.realms_cleared,
    timeSeconds: r.time_seconds,
    kills: r.kills,
    level: r.level,
    score: Number(r.score),
    version: r.version,
    endedAt: r.ended_at.toISOString(),
  };
}

/** Applies each migration once, in order, each in its own transaction; one server at a time (advisory lock). */
async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock(80485)');
    await client.query(
      'create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())',
    );
    const done = new Set(
      (await client.query<{ id: string }>('select id from schema_migrations')).rows.map(
        (r) => r.id,
      ),
    );
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await client.query('begin');
      try {
        await client.query(m.sql);
        await client.query('insert into schema_migrations (id) values ($1)', [m.id]);
        await client.query('commit');
      } catch (e) {
        await client.query('rollback');
        throw e;
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(80485)').catch(() => undefined);
    client.release();
  }
}
