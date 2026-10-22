/**
 * The database's migrations, applied in order at startup (as in Slovion) and recorded in `schema_migrations`. Kept as
 * code so the built server carries them. Never edit one that has shipped: add the next.
 */
export const MIGRATIONS: readonly { readonly id: string; readonly sql: string }[] = [
  {
    id: '001-scores',
    sql: `
      create table scores (
        id bigserial primary key,
        run_id text not null unique,
        board text not null,
        board_date date,
        names text[] not null,
        god_id text not null,
        realm_id text not null,
        players smallint not null,
        bots smallint not null,
        realms_cleared integer not null,
        time_seconds integer not null,
        kills integer not null,
        level integer not null,
        score bigint not null,
        version text not null,
        ended_at timestamptz not null default now(),
        hidden boolean not null default false
      );
      create index scores_board on scores (board, board_date, score desc) where not hidden;
    `,
  },
];
