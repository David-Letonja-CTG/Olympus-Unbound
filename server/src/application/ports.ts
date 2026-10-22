import type { Board, ScoreEntry } from '../domain/score.js';

/** Time, injected so rules are tested without waiting. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** A world board entry as kept: the checked entry, its id and when it arrived. */
export interface StoredScore extends ScoreEntry {
  readonly id: string;
  readonly endedAt: string;
}

export interface BoardQuery {
  readonly board: Board;
  /** Daily Trial boards: the date. */
  readonly date?: string;
  readonly godId?: string;
  readonly limit: number;
}

/** Where world board entries live (spec: world-leaderboards); PostgreSQL in production. */
export interface ScoreStore {
  /** Adds the entry unless its run is already in (each run once). */
  add(entry: ScoreEntry): Promise<'added' | 'duplicate'>;
  /** The best visible entries, highest score first, earlier first on a tie. */
  top(query: BoardQuery): Promise<StoredScore[]>;
  /** Hides an entry from every board; false when there is none with that id. */
  hide(id: string): Promise<boolean>;
}
